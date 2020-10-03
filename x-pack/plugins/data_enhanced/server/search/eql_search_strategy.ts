/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ElasticsearchClient, Logger } from 'kibana/server';

import {
  getAsyncOptions,
  ISearchStrategy,
  toSnakeCase,
  shimAbortSignal,
} from '../../../../../src/plugins/data/server';
import { EqlSearchStrategyRequest, EqlSearchStrategyResponse } from '../../common/search/types';
import { formatSearchResponse, getAsyncParams, getAsyncSearch } from './async_search';

export const eqlSearchStrategyProvider = (
  logger: Logger
): ISearchStrategy<EqlSearchStrategyRequest, EqlSearchStrategyResponse> => {
  return {
    cancel: async (context, id) => {
      logger.debug(`_eql/delete ${id}`);
      await context.core.elasticsearch.client.asCurrentUser.eql.delete({
        id,
      });
    },
    search: async (context, request, options) => {
      logger.debug(`_eql/search ${JSON.stringify(request.params) || request.id}`);
      const eqlClient = context.core.elasticsearch.client.asCurrentUser.eql;

      // @ts-expect-error workaround until EQL client uses same interface as asyncSearch client
      const shimmedClient = eqlClient as ElasticsearchClient['asyncSearch'];
      // @ts-expect-error types of index param are incompatible
      shimmedClient.submit = eqlClient.search;

      const uiSettingsClient = await context.core.uiSettings.client;
      const asyncOptions = getAsyncOptions();
      const asyncParams = await getAsyncParams({ uiSettingsClient, params: request.params! });

      const promise = getAsyncSearch({
        id: request.id,
        params: toSnakeCase(asyncParams),
        options: toSnakeCase(asyncOptions),
        client: shimmedClient,
      });

      const response = await shimAbortSignal(promise, options?.abortSignal);
      return formatSearchResponse(response);
    },
  };
};
