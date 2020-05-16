/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';

import { ListSchema } from '../../../../../lists/common/schemas/response';
import * as i18n from './translations';

const columns: Array<EuiBasicTableColumn<ListSchema>> = [
  {
    field: 'name',
    name: i18n.COLUMN_FILE_NAME,
    truncateText: false,
  },
  {
    field: 'created_at',
    name: i18n.COLUMN_UPLOAD_DATE,
    truncateText: false,
  },
  {
    field: 'created_by',
    name: i18n.COLUMN_CREATED_BY,
    truncateText: false,
  },
];

export const ValueListsTable = ({ items, loading }: { items: any[]; loading: boolean }) => {
  return <EuiBasicTable columns={columns} items={items} loading={loading} />;
};
