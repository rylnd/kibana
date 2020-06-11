/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ListSchema } from '../../../../../../lists/common/schemas/response';

export type ListResponse = ListSchema;

export interface GetListsResponse {
  cursor: string;
  data: ListSchema[];
  page: number;
  per_page: number;
  total: number;
}
