/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type as ListType } from '../../../../../lists/common/schemas';
import { LIST_URL, LIST_ITEM_URL } from '../../../../../lists/common/constants';
import { KibanaServices } from '../../../common/lib/kibana';
import { ImportListResponse } from './types';

export const getLists = async ({ signal }: { signal: AbortSignal }) => {
  return KibanaServices.get().http.fetch(LIST_URL, {
    method: 'GET',
    query: {},
    signal,
  });
};

export const importList = async ({
  file,
  listId,
  type,
  signal,
}: {
  file: File;
  listId: number | undefined;
  signal: AbortSignal;
  type: ListType | undefined;
}) => {
  const formData = new FormData();
  formData.append('file', file);

  return KibanaServices.get().http.fetch<ImportListResponse>(`${LIST_ITEM_URL}/_import`, {
    method: 'POST',
    headers: { 'Content-Type': undefined },
    body: formData,
    query: { list_id: listId, type },
    signal,
  });
};
