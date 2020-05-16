/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';

import { ListSchema } from '../../../../../lists/common/schemas/response';
import * as i18n from './translations';

type Column = EuiBasicTableColumn<ListSchema>;

const staticColumns: Column[] = [
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

const buildColumns = (items: ListSchema[]): Column[] => [
  ...staticColumns,
  {
    name: i18n.COLUMN_ACTIONS,
    actions: [
      {
        name: i18n.ACTION_EXPORT_NAME,
        description: i18n.ACTION_EXPORT_DESCRIPTION,
        icon: 'exportAction',
        type: 'icon',
        onClick: () => {},
        'data-test-subj': 'action-export-value-list',
      },
      {
        name: i18n.ACTION_DELETE_NAME,
        description: i18n.ACTION_DELETE_DESCRIPTION,
        icon: 'trash',
        type: 'icon',
        onClick: () => {},
        'data-test-subj': 'action-delete-value-list',
      },
    ],
  },
];

export const ValueListsTable = ({ items, loading }: { items: any[]; loading: boolean }) => {
  const columns = buildColumns(items);
  return <EuiBasicTable columns={columns} items={items} loading={loading} />;
};
