/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';
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
import { exportList, deleteList } from '../../containers/detection_engine/lists/api';
import { ListResponse } from '../../containers/detection_engine/lists/types';
import { useLists } from '../../containers/detection_engine/lists/use_lists';
import * as i18n from './translations';
import { ValueListsTable } from './table';
import { ValueListsForm } from './form';
import { GenericDownloader } from '../../../common/components/generic_downloader';

interface ValueListsModalProps {
  onClose: () => void;
  showModal: boolean;
}

export const ValueListsModalComponent: React.FC<ValueListsModalProps> = ({
  onClose,
  showModal,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [lists, fetchLists] = useLists({ pageIndex: pageIndex + 1, pageSize });
  const [exportListId, setExportListId] = useState<string>();
  const toasts = useToasts();

  const handleDelete = useCallback(
    async ({ id }: { id: string }) => {
      const deleteTask = new AbortController();
      await deleteList({ id, signal: deleteTask.signal });
      fetchLists();
    },
    [fetchLists]
  );

  const handleExport = useCallback(
    async ({ ids, signal }: { ids: string[]; signal: AbortSignal }) => {
      return exportList({ id: ids[0], signal });
    },
    []
  );

  const handleExportListId = useCallback(async ({ id }: { id: string }) => {
    setExportListId(id);
  }, []);

  const handleTableChange = useCallback(
    ({ page: { index, size } }: { page: { index: number; size: number } }) => {
      setPageIndex(index);
      setPageSize(size);
    },
    [setPageIndex, setPageSize]
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
    if (showModal) {
      fetchLists();
    }
  }, [showModal, fetchLists]);

  if (!showModal) {
    return null;
  }

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount: lists.value?.total ?? 0,
    pageSizeOptions: [10, 20, 50],
    hidePerPageOptions: false,
  };

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
            lists={lists.value?.data ?? []}
            loading={lists.loading}
            onDelete={handleDelete}
            onExport={handleExportListId}
            onChange={handleTableChange}
            pagination={pagination}
          />
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButton onClick={onClose}>{i18n.CLOSE_BUTTON}</EuiButton>
        </EuiModalFooter>
      </EuiModal>
      <GenericDownloader
        filename={exportListId ?? 'download.txt'}
        ids={exportListId != null ? [exportListId] : undefined}
        onExportSuccess={() => {
          setExportListId(undefined);
        }}
        onExportFailure={() => {
          setExportListId(undefined);
        }}
        exportSelectedData={handleExport}
      />
    </EuiOverlayMask>
  );
};

ValueListsModalComponent.displayName = 'ValueListsModalComponent';

export const ValueListsModal = React.memo(ValueListsModalComponent);

ValueListsModal.displayName = 'ValueListsModal';
