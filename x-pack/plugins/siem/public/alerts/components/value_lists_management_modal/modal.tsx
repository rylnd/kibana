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
  EuiText,
} from '@elastic/eui';

import { exportList, deleteList } from '../../containers/lists/api';
import { useLists } from '../../containers/lists/use_lists';
import * as i18n from './translations';
import { ValueListsTable } from './table';
import { ValueListsForm } from './form';
import { ListResponse } from '../../containers/lists/types';

interface ValueListsModalProps {
  onClose: () => void;
  showModal: boolean;
}

export const ValueListsModalComponent: React.FC<ValueListsModalProps> = ({
  onClose,
  showModal,
}) => {
  const [lists, fetchLists] = useLists();

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
  const handleUploadSuccess = useCallback(
    (response: ListResponse) => {
      fetchLists();
    },
    [fetchLists]
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
          <EuiText size="s">
            <h4>{i18n.MODAL_DESCRIPTION}</h4>
          </EuiText>
          <ValueListsForm onSuccess={handleUploadSuccess} />
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
