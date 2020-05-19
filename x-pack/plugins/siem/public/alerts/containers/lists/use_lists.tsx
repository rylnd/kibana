/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useCallback } from 'react';

import { ListSchema } from '../../../../../lists/common/schemas/response';
import { getLists } from './api';

export const useLists = (): [ListSchema[], boolean, () => void] => {
  const [needsFetch, setNeedsFetch] = useState<boolean>(true);
  const refreshLists = useCallback(() => setNeedsFetch(true), [setNeedsFetch]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lists, setLists] = useState<ListSchema[]>([]);

  useEffect(() => {
    const fetchLists = async () => {
      if (needsFetch) {
        try {
          const abortCtrl = new AbortController();
          setIsLoading(true);
          const listsResponse = await getLists({ signal: abortCtrl.signal });
          setLists(listsResponse);
          setIsLoading(false);
          setNeedsFetch(false);
        } catch (e) {
          setIsLoading(false);
          setNeedsFetch(false);
        }
      }
    };

    fetchLists();
  }, [needsFetch]);

  return [lists, isLoading, refreshLists];
};
