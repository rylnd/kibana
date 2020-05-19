/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';

import { ListSchema } from '../../../../../lists/common/schemas/response';
import * as i18n from './translations';
import { exportList, deleteList } from '../../containers/lists/api';

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

export const ValueListsTable = ({
  items,
  loading,
  onChange,
}: {
  items: ListSchema[];
  loading: boolean;
  onChange: () => void;
}) => {
  const handleDelete = useCallback(
    async ({ id }: { id: string }) => {
      const deleteTask = new AbortController();
      await deleteList({ id, signal: deleteTask.signal });
      onChange();
    },
    [onChange]
  );
  const handleExport = useCallback(async ({ id }: { id: string }) => {
    const exportTask = new AbortController();
    await exportList({ id, signal: exportTask.signal });
  }, []);

  const columns: Column[] = [
    ...staticColumns,
    {
      name: i18n.COLUMN_ACTIONS,
      actions: [
        {
          name: i18n.ACTION_EXPORT_NAME,
          description: i18n.ACTION_EXPORT_DESCRIPTION,
          icon: 'exportAction',
          type: 'icon',
          onClick: handleExport,
          'data-test-subj': 'action-export-value-list',
        },
        {
          name: i18n.ACTION_DELETE_NAME,
          description: i18n.ACTION_DELETE_DESCRIPTION,
          icon: 'trash',
          type: 'icon',
          onClick: handleDelete,
          'data-test-subj': 'action-delete-value-list',
        },
      ],
    },
  ];

  return <EuiBasicTable columns={columns} items={items} loading={loading} />;
};
