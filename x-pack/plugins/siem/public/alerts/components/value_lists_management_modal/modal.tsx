/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, useRef } from 'react';
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

import { Type as ListType } from '../../../../../lists/common/schemas';
import {
  displaySuccessToast,
  useStateToaster,
  errorToToaster,
} from '../../../common/components/toasters';
import { exportList, deleteList, importList } from '../../containers/lists/api';
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
  const [isImporting, setIsImporting] = useState(false);
  const importTask = useRef(new AbortController());
  const [lists, listsLoading, refreshLists] = useLists();
  const [, dispatchToaster] = useStateToaster();

  const handleCancel = useCallback(() => {
    setIsImporting(false);
    importTask.current.abort();
  }, [setIsImporting]);
  const handleClose = useCallback(() => {
    handleCancel();
    onClose();
  }, [handleCancel, onClose]);
  const handleImport = useCallback(
    async ({ files, type }: { files: FileList | null; type: ListType }) => {
      if (files != null && files.length > 0) {
        try {
          setIsImporting(true);
          importTask.current = new AbortController();
          const response = await importList({
            file: files[0],
            listId: undefined,
            type,
            signal: importTask.current.signal,
          });

          displaySuccessToast(i18n.uploadSuccessMessage(response.name), dispatchToaster);
          setIsImporting(false);
          refreshLists();
        } catch (error) {
          setIsImporting(false);
          if (error.name !== 'AbortError') {
            errorToToaster({ title: i18n.UPLOAD_ERROR, error, dispatchToaster });
          }
        }
      }
    },
    [importList, refreshLists, setIsImporting]
  );
  const handleDelete = useCallback(
    async ({ id }: { id: string }) => {
      const deleteTask = new AbortController();
      await deleteList({ id, signal: deleteTask.signal });
      refreshLists();
    },
    [deleteList, refreshLists]
  );
  const handleExport = useCallback(
    async ({ id }: { id: string }) => {
      const exportTask = new AbortController();
      await exportList({ id, signal: exportTask.signal });
    },
    [exportList]
  );

  if (!showModal) {
    return null;
  }

  return (
    <EuiOverlayMask>
      <EuiModal onClose={handleClose} maxWidth={750}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.MODAL_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText size="s">
            <h4>{i18n.MODAL_DESCRIPTION}</h4>
          </EuiText>
          <ValueListsForm onChange={handleImport} loading={isImporting} />
          {isImporting && <EuiButton onClick={handleCancel}>{i18n.CANCEL_BUTTON}</EuiButton>}
          <ValueListsTable
            lists={lists}
            loading={listsLoading}
            onDelete={handleDelete}
            onExport={handleExport}
          />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButton onClick={handleClose}>{i18n.CLOSE_BUTTON}</EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
};

ValueListsModalComponent.displayName = 'ValueListsModalComponent';

export const ValueListsModal = React.memo(ValueListsModalComponent);

ValueListsModal.displayName = 'ValueListsModal';
