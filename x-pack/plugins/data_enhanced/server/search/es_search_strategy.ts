/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { first } from 'rxjs/operators';
import { SearchResponse } from 'elasticsearch';
import { Observable } from 'rxjs';

import { SharedGlobalConfig, RequestHandlerContext, Logger } from '../../../../../src/core/server';
import {
  getTotalLoaded,
  ISearchStrategy,
  SearchUsage,
  getDefaultSearchParams,
  getShardTimeout,
  toSnakeCase,
  getAsyncOptions,
  shimAbortSignal,
} from '../../../../../src/plugins/data/server';
import { IEnhancedEsSearchRequest } from '../../common';
import {
  ISearchOptions,
  IEsSearchResponse,
  isCompleteResponse,
} from '../../../../../src/plugins/data/common/search';
import { formatSearchResponse, getAsyncParams, getAsyncSearch } from './async_search';

function isEnhancedEsSearchResponse(response: any): response is IEsSearchResponse {
  return response.hasOwnProperty('isPartial') && response.hasOwnProperty('isRunning');
}

export const enhancedEsSearchStrategyProvider = (
  config$: Observable<SharedGlobalConfig>,
  logger: Logger,
  usage?: SearchUsage
): ISearchStrategy => {
  const search = async (
    context: RequestHandlerContext,
    request: IEnhancedEsSearchRequest,
    options?: ISearchOptions
  ) => {
    logger.debug(`search ${JSON.stringify(request.params) || request.id}`);

    const isAsync = request.indexType !== 'rollup';

    try {
      const response = isAsync
        ? await asyncSearch(context, request, options)
        : await rollupSearch(context, request, options);

      if (
        usage &&
        isAsync &&
        isEnhancedEsSearchResponse(response) &&
        isCompleteResponse(response)
      ) {
        usage.trackSuccess(response.rawResponse.took);
      }

      return response;
    } catch (e) {
      if (usage) usage.trackError();
      throw e;
    }
  };

  const cancel = async (context: RequestHandlerContext, id: string) => {
    logger.debug(`cancel ${id}`);
    await context.core.elasticsearch.client.asCurrentUser.asyncSearch.delete({
      id,
    });
  };

  async function asyncSearch(
    context: RequestHandlerContext,
    request: IEnhancedEsSearchRequest,
    options?: ISearchOptions
  ): Promise<IEsSearchResponse> {
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    const uiSettingsClient = context.core.uiSettings.client;
    const asyncOptions = getAsyncOptions();
    const asyncParams = await getAsyncParams({ uiSettingsClient, params: request.params! });

    const promise = getAsyncSearch({
      id: request.id,
      params: toSnakeCase(asyncParams),
      options: toSnakeCase(asyncOptions),
      client: esClient.asyncSearch,
    });

    const response = await shimAbortSignal(promise, options?.abortSignal);
    return formatSearchResponse(response);
  }

  const rollupSearch = async function (
    context: RequestHandlerContext,
    request: IEnhancedEsSearchRequest,
    options?: ISearchOptions
  ): Promise<IEsSearchResponse> {
    const esClient = context.core.elasticsearch.client.asCurrentUser;
    const uiSettingsClient = await context.core.uiSettings.client;
    const config = await config$.pipe(first()).toPromise();
    const { body, index, ...params } = request.params!;
    const method = 'POST';
    const path = encodeURI(`/${index}/_rollup_search`);
    const querystring = toSnakeCase({
      ...getShardTimeout(config),
      ...(await getDefaultSearchParams(uiSettingsClient)),
      ...params,
    });

    const promise = esClient.transport.request({
      method,
      path,
      body,
      querystring,
    });

    const esResponse = await shimAbortSignal(promise, options?.abortSignal);

    const response = esResponse.body as SearchResponse<any>;
    return {
      rawResponse: response,
      ...getTotalLoaded(response._shards),
    };
  };

  return { search, cancel };
};
