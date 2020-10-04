/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { has } from 'lodash';
import { SearchResponse } from 'elasticsearch';
import { ApiResponse } from '@elastic/elasticsearch';
import { AsyncSearchGet, AsyncSearchSubmit } from '@elastic/elasticsearch/api/requestParams';
import {
  TransportRequestOptions,
  TransportRequestPromise,
} from '@elastic/elasticsearch/lib/Transport';

import { ElasticsearchClient, IUiSettingsClient } from '../../../../../../src/core/server';
import { IEsSearchResponse, ISearchRequestParams } from '../../../../../../src/plugins/data/common';
import {
  getDefaultSearchParams,
  shimHitsTotal,
  getTotalLoaded,
} from '../../../../../../src/plugins/data/server';

interface GetAsyncParams<T> {
  uiSettingsClient: IUiSettingsClient;
  params: T;
}

type Resolved<T> = T extends PromiseLike<infer U> ? U : T;
type AsyncParams<T> = T & { batchedReduceSize: number } & Resolved<
    ReturnType<typeof getDefaultSearchParams>
  >;

const isErrorResponse = (response: unknown): boolean => has(response, 'body.error');

export const getAsyncParams = async <T extends ISearchRequestParams>({
  uiSettingsClient,
  params,
}: GetAsyncParams<T>): Promise<AsyncParams<T>> => {
  return {
    batchedReduceSize: 64, // Only report partial results every 64 shards; this should be reduced when we actually display partial results
    ...(await getDefaultSearchParams(uiSettingsClient)),
    ...params,
  };
};

interface AsyncSearch {
  client: ElasticsearchClient['asyncSearch'];
  id?: string;
  options: TransportRequestOptions;
  params: AsyncSearchGet | AsyncSearchSubmit;
}

export const getAsyncSearch = ({
  client,
  id,
  options,
  params,
}: AsyncSearch): TransportRequestPromise<ApiResponse> => {
  if (id) {
    return client.get({ ...params, id }, options);
  } else {
    return client.submit(params, options);
  }
};

export const formatSearchResponse = (rawResponse: ApiResponse): IEsSearchResponse => {
  if (isErrorResponse(rawResponse)) {
    return {
      id: undefined,
      isPartial: false,
      isRunning: false,
      rawResponse: rawResponse.body as SearchResponse<unknown>,
    };
  } else {
    const {
      id,
      response,
      is_partial: isPartial,
      is_running: isRunning,
      ...rest
    } = rawResponse.body;
    // EQL response does not have a `response` property
    const searchResponse = response ?? rest;

    return {
      id,
      isPartial,
      isRunning,
      rawResponse: shimHitsTotal(searchResponse),
      ...(searchResponse._shards && getTotalLoaded(searchResponse._shards)),
    };
  }
};
