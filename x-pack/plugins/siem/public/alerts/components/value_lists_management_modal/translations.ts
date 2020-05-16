/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const MODAL_TITLE = i18n.translate('xpack.siem.lists.uploadValueListTitle', {
  defaultMessage: 'Upload value lists',
});

export const MODAL_DESCRIPTION = i18n.translate('xpack.siem.lists.uploadValueListDescription', {
  defaultMessage: 'Upload single value lists to use while writing rules or rule exceptions.',
});

export const FILE_PICKER_PROMPT = i18n.translate('xpack.siem.lists.uploadValueListPrompt', {
  defaultMessage: 'Select or drag and drop a file',
});

export const CLOSE_BUTTON = i18n.translate('xpack.siem.lists.closeValueListsModalTitle', {
  defaultMessage: 'Close',
});

export const CANCEL_BUTTON = i18n.translate('xpack.siem.lists.cancelValueListsUploadTitle', {
  defaultMessage: 'Cancel',
});

export const UPLOAD_ERROR = i18n.translate('xpack.siem.lists.valueListsUploadError', {
  defaultMessage: 'There was an error uploading the value list.',
});

export const uploadSuccessMessage = (fileName: string) =>
  i18n.translate('xpack.siem.lists.valueListsUploadSuccess', {
    defaultMessage: 'Value list {fileName} was uploaded successfully',
    values: { fileName },
  });

export const COLUMN_FILE_NAME = i18n.translate('xpack.siem.lists.valueListsTable.fileNameColumn', {
  defaultMessage: 'Filename',
});

export const COLUMN_UPLOAD_DATE = i18n.translate(
  'xpack.siem.lists.valueListsTable.uploadDateColumn',
  {
    defaultMessage: 'Upload Date',
  }
);

export const COLUMN_CREATED_BY = i18n.translate(
  'xpack.siem.lists.valueListsTable.createdByColumn',
  {
    defaultMessage: 'Created by',
  }
);

export const COLUMN_ACTIONS = i18n.translate('xpack.siem.lists.valueListsTable.actionsColumn', {
  defaultMessage: 'Actions',
});

export const ACTION_EXPORT_NAME = i18n.translate(
  'xpack.siem.lists.valueListsTable.exportActionName',
  {
    defaultMessage: 'Export',
  }
);

export const ACTION_EXPORT_DESCRIPTION = i18n.translate(
  'xpack.siem.lists.valueListsTable.exportActionDescription',
  {
    defaultMessage: 'Export value list',
  }
);

export const ACTION_DELETE_NAME = i18n.translate(
  'xpack.siem.lists.valueListsTable.deleteActionName',
  {
    defaultMessage: 'Remove',
  }
);

export const ACTION_DELETE_DESCRIPTION = i18n.translate(
  'xpack.siem.lists.valueListsTable.deleteActionDescription',
  {
    defaultMessage: 'Remove value list',
  }
);
