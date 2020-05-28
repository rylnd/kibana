/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect } from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
} from '@elastic/eui';

import { useToasts } from '../../../common/lib/kibana';
import { exportList, deleteList } from '../../containers/lists/api';
import { ListResponse } from '../../containers/lists/types';
import { useLists } from '../../containers/lists/use_lists';
import * as i18n from './translations';
import { ValueListsTable } from './table';
import { ValueListsForm } from './form';

interface ValueListsModalProps {
  onClose: () => void;
  showModal: boolean;
}

export const ValueListsModalComponent: React.FC<ValueListsModalProps> = ({
  onClose,
  showModal,
}) => {
  const [lists, fetchLists] = useLists();
  const toasts = useToasts();

  const handleDelete = useCallback(
    async ({ id }: { id: string }) => {
      const deleteTask = new AbortController();
      await deleteList({ id, signal: deleteTask.signal });
      fetchLists();
    },
    [deleteList, fetchLists]
  );
  const handleExport = useCallback(
    async ({ id }: { id: string }) => {
      const exportTask = new AbortController();
      await exportList({ id, signal: exportTask.signal });
    },
    [exportList]
  );
  const handleUploadError = useCallback(
    (error: Error) => {
      if (error.name !== 'AbortError') {
        toasts.addError(error, { title: i18n.UPLOAD_ERROR });
      }
    },
    [toasts]
  );
  const handleUploadSuccess = useCallback(
    (response: ListResponse) => {
      toasts.addSuccess({
        text: i18n.uploadSuccessMessage(response.name),
        title: i18n.UPLOAD_SUCCESS,
      });
      fetchLists();
    },
    [fetchLists, toasts]
  );

  useEffect(() => {
    fetchLists();
  }, []);

  if (!showModal) {
    return null;
  }

  return (
    <EuiOverlayMask>
      <EuiModal onClose={onClose} maxWidth={750}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.MODAL_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <ValueListsForm onSuccess={handleUploadSuccess} onError={handleUploadError} />
          <EuiSpacer />
          <ValueListsTable
            lists={lists.value ?? []}
            loading={lists.loading}
            onDelete={handleDelete}
            onExport={handleExport}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButton onClick={onClose}>{i18n.CLOSE_BUTTON}</EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};

ValueListsModalComponent.displayName = 'ValueListsModalComponent';

export const ValueListsModal = React.memo(ValueListsModalComponent);

ValueListsModal.displayName = 'ValueListsModal';
