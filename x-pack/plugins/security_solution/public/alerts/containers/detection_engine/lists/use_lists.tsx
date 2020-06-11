/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { useAsyncFn } from 'react-use';
import { AsyncFn } from 'react-use/lib/useAsyncFn';

import { getLists } from './api';
import { GetListsResponse } from './types';

export interface UseListsParams {
  pageSize: number | undefined;
  pageIndex: number | undefined;
}

export const useLists = ({ pageSize, pageIndex }: UseListsParams): AsyncFn<GetListsResponse> => {
  const fetchLists = useCallback(async () => {
    const abortCtrl = new AbortController();
    const response = await getLists({ pageSize, pageIndex, signal: abortCtrl.signal });
    return response;
  }, [pageSize, pageIndex]);

  return useAsyncFn(fetchLists, [fetchLists]);
};
