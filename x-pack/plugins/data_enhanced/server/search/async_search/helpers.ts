/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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

export const getAsyncParams = async <T extends ISearchRequestParams>({
  uiSettingsClient,
  params,
}: GetAsyncParams<T>): Promise<T> => {
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
  const { id, response, is_partial: isPartial, is_running: isRunning } = rawResponse.body;
  return {
    id,
    isPartial,
    isRunning,
    rawResponse: shimHitsTotal(response),
    ...getTotalLoaded(response._shards),
  };
};
