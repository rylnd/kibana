/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState, useRef } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  // @ts-ignore no-exported-member
  EuiFilePicker,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import * as i18n from './translations';
import {
  useStateToaster,
  displaySuccessToast,
  errorToToaster,
} from '../../../common/components/toasters';
import { importList } from '../../containers/lists/api';

interface ValueListsModalProps {
  onClose: () => void;
  showModal: boolean;
}

export const ValueListsModalComponent = ({ onClose, showModal }: ValueListsModalProps) => {
  const [, dispatchToaster] = useStateToaster();
  const [isImporting, setIsImporting] = useState(false);
  const importTask = useRef(new AbortController());

  const cancelImport = useCallback(() => {
    setIsImporting(false);
    importTask.current.abort();
  }, [setIsImporting]);
  const handleClose = useCallback(() => {
    cancelImport();
    onClose();
  }, [cancelImport, onClose]);

  const uploadList = useCallback(
    async (files: FileList | null) => {
      if (files != null && files.length > 0) {
        try {
          setIsImporting(true);
          importTask.current = new AbortController();
          const response = await importList({
            file: files[0],
            listId: undefined,
            type: 'keyword', // TODO: dynamic type
            signal: importTask.current.signal,
          });

          displaySuccessToast(i18n.uploadSuccessMessage(response.name), dispatchToaster);
          setIsImporting(false);
          // TODO: refresh table
        } catch (error) {
          setIsImporting(false);
          if (error.name !== 'AbortError') {
            errorToToaster({ title: i18n.UPLOAD_ERROR, error, dispatchToaster });
          }
        }
      }
    },
    [importList, displaySuccessToast, errorToToaster, cancelImport]
  );

  return (
    <>
      {showModal && (
        <EuiOverlayMask>
          <EuiModal onClose={handleClose} maxWidth={'750px'}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>{i18n.MODAL_TITLE}</EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <EuiText size="s">
                <h4>{i18n.MODAL_DESCRIPTION}</h4>
              </EuiText>

              <EuiSpacer size="s" />
              <EuiFilePicker
                id="value-list-file-picker"
                initialPromptText={i18n.FILE_PICKER_PROMPT}
                onChange={uploadList}
                fullWidth={true}
                isLoading={isImporting}
              />
              {isImporting && <EuiButton onClick={cancelImport}>{i18n.CANCEL_BUTTON}</EuiButton>}
              <EuiSpacer size="s" />
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButton onClick={handleClose}>{i18n.CLOSE_BUTTON}</EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </>
  );
};

ValueListsModalComponent.displayName = 'ValueListsModalComponent';

export const ValueListsModal = React.memo(ValueListsModalComponent);

ValueListsModal.displayName = 'ValueListsModal';
