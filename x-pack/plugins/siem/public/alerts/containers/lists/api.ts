/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Type as ListType } from '../../../../../lists/common/schemas';
import { getListResponseMock } from '../../../../../lists/common/schemas/response/list_schema.mock';
import { LIST_URL, LIST_ITEM_URL } from '../../../../../lists/common/constants';
import { KibanaServices } from '../../../common/lib/kibana';
import { ListResponse } from './types';

export const getLists = async ({ signal }: { signal: AbortSignal }) => {
  return [getListResponseMock(), getListResponseMock()];
  // return KibanaServices.get().http.fetch(LIST_URL, {
  //   method: 'GET',
  //   query: {},
  //   signal,
  // });
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
}): Promise<ListResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  return KibanaServices.get().http.fetch<ListResponse>(`${LIST_ITEM_URL}/_import`, {
    method: 'POST',
    headers: { 'Content-Type': undefined },
    body: formData,
    query: { list_id: listId, type },
    signal,
  });
};

export const deleteList = async ({
  id,
  signal,
}: {
  id: number;
  signal: AbortSignal;
}): Promise<ListResponse> => {
  return KibanaServices.get().http.fetch<ListResponse>(LIST_URL, {
    method: 'DELETE',
    query: { id },
    signal,
  });
};

export const exportList = async ({
  id,
  signal,
}: {
  id: number;
  signal: AbortSignal;
}): Promise<Blob> => {
  return KibanaServices.get().http.fetch<Blob>(`${LIST_ITEM_URL}/_export`, {
    method: 'POST',
    query: { listId: id },
    signal,
  });
};
