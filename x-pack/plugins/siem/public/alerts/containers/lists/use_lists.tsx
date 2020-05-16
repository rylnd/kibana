/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState } from 'react';

import { ListSchema } from '../../../../../lists/common/schemas/response';
import { getLists } from './api';

export const useLists = (): [ListSchema[], boolean] => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lists, setLists] = useState<ListSchema[]>([]);

  useEffect(() => {
    const fetchLists = async () => {
      const abortCtrl = new AbortController();
      try {
        setIsLoading(true);
        const listsResponse = await getLists({ signal: abortCtrl.signal });
        setLists(listsResponse);
        setIsLoading(false);
      } catch (e) {
        setIsLoading(false);
      }
    };

    fetchLists();
  }, []);

  return [lists, isLoading];
};
