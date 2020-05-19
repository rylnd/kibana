/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState, ReactNode, useEffect } from 'react';
import { EuiForm, EuiFormRow, EuiFilePicker, EuiRadioGroup } from '@elastic/eui';

import { Type as ListType } from '../../../../../lists/common/schemas';
import * as i18n from './translations';

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

export interface ValueListsFormProps {
  onChange: ({ files, type }: { files: FileList | null; type: ListType }) => void;
  loading: boolean;
}

export const ValueListsFormComponent: React.FC<ValueListsFormProps> = ({ onChange, loading }) => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [type, setType] = useState<ListType>('keyword');
  // EuiRadioGroup's onChange only infers 'string' from our options
  const handleRadioChange = useCallback((t: string) => setType(t as ListType), [setType]);

  useEffect(() => {
    onChange({ files, type });
  }, [files, type]);

  return (
    <EuiForm>
      <EuiFormRow fullWidth>
        <EuiFilePicker
          id="value-list-file-picker"
          initialPromptText={i18n.FILE_PICKER_PROMPT}
          onChange={setFiles}
          fullWidth={true}
          isLoading={loading}
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.LIST_TYPES_RADIO_LABEL}>
        <EuiRadioGroup
          options={options}
          idSelected={type}
          onChange={handleRadioChange}
          name="valueListType"
        />
      </EuiFormRow>
    </EuiForm>
  );
};

ValueListsFormComponent.displayName = 'ValueListsFormComponent';

export const ValueListsForm = React.memo(ValueListsFormComponent);

ValueListsForm.displayName = 'ValueListsForm';
