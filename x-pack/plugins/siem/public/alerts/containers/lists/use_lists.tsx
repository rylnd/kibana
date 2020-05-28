/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback } from 'react';
import { useAsyncFn } from 'react-use';
import { AsyncFn } from 'react-use/lib/useAsyncFn';

import { ListSchema } from '../../../../../lists/common/schemas/response';
import { getLists } from './api';

export const useLists = (): AsyncFn<ListSchema[]> => {
  const fetchLists = useCallback(async () => {
    const abortCtrl = new AbortController();
    const response = await getLists({ signal: abortCtrl.signal });
    return response.data;
  }, [getLists]);

  return useAsyncFn(fetchLists);
};
