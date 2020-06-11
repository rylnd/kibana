/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState, ReactNode, useEffect, useRef } from 'react';
import styled from 'styled-components';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiRadioGroup,
} from '@elastic/eui';

import { Type as ListType } from '../../../../../lists/common/schemas';
import { importList } from '../../containers/detection_engine/lists/api';
import { ListResponse } from '../../containers/detection_engine/lists/types';
import * as i18n from './translations';

const InlineRadioGroup = styled(EuiRadioGroup)`
  display: flex;

  .euiRadioGroup__item + .euiRadioGroup__item {
    margin: 0 0 0 12px;
  }
`;

interface ListTypeOptions {
  id: ListType;
  label: ReactNode;
}

const options: ListTypeOptions[] = [
  {
    id: 'keyword',
    label: i18n.KEYWORDS_RADIO,
  },
  {
    id: 'ip',
    label: i18n.IP_RADIO,
  },
];

const defaultListType: ListType = 'keyword';

export interface ValueListsFormProps {
  onError: (error: Error) => void;
  onSuccess: (response: ListResponse) => void;
}

export const ValueListsFormComponent: React.FC<ValueListsFormProps> = ({ onError, onSuccess }) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [type, setType] = useState<ListType>(defaultListType);
  const [importPending, setImportPending] = useState(false);
  const importTask = useRef(new AbortController());
  const filePickerRef = useRef<EuiFilePicker | null>(null);

  // EuiRadioGroup's onChange only infers 'string' from our options
  const handleRadioChange = useCallback((t: string) => setType(t as ListType), [setType]);

  const resetForm = useCallback(() => {
    if (filePickerRef.current?.fileInput) {
      filePickerRef.current.fileInput.value = '';
      filePickerRef.current.handleChange();
    }
    setFiles(null);
    setType(defaultListType);
  }, [setType]);

  const handleCancel = useCallback(() => {
    setImportPending(false);
    importTask.current.abort();
  }, [setImportPending]);

  const handleSuccess = useCallback(
    (response: ListResponse) => {
      setImportPending(false);
      resetForm();
      onSuccess(response);
    },
    [resetForm, setImportPending, onSuccess]
  );
  const handleError = useCallback(
    (error: Error) => {
      setImportPending(false);
      onError(error);
    },
    [setImportPending]
  );

  const handleImport = useCallback(async () => {
    if (!importPending && files?.length) {
      try {
        setImportPending(true);
        importTask.current = new AbortController();
        const response = await importList({
          file: files[0],
          listId: undefined,
          type,
          signal: importTask.current.signal,
        });

        handleSuccess(response);
      } catch (error) {
        handleError(error);
      }
    }
  }, [files, type, importPending, handleSuccess, handleError, importList]);

  useEffect(() => {
    return handleCancel;
  }, []);

  return (
    <EuiForm>
      <EuiFormRow label={i18n.FILE_PICKER_LABEL} fullWidth>
        <EuiFilePicker
          id="value-list-file-picker"
          initialPromptText={i18n.FILE_PICKER_PROMPT}
          ref={filePickerRef}
          onChange={setFiles}
          fullWidth={true}
          isLoading={importPending}
        />
      </EuiFormRow>
      <EuiFormRow fullWidth>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label={i18n.LIST_TYPES_RADIO_LABEL}>
              <InlineRadioGroup
                options={options}
                idSelected={type}
                onChange={handleRadioChange}
                name="valueListType"
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiFlexGroup alignItems="flexEnd">
                <EuiFlexItem>
                  {importPending && (
                    <EuiButtonEmpty onClick={handleCancel}>{i18n.CANCEL_BUTTON}</EuiButtonEmpty>
                  )}
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiButton onClick={handleImport} disabled={!files?.length || importPending}>
                    {i18n.UPLOAD_BUTTON}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
    </EuiForm>
  );
};

ValueListsFormComponent.displayName = 'ValueListsFormComponent';

export const ValueListsForm = React.memo(ValueListsFormComponent);

ValueListsForm.displayName = 'ValueListsForm';
