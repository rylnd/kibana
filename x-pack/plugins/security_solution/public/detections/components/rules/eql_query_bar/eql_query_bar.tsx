/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, ChangeEvent, useEffect, useState } from 'react';
import styled from 'styled-components';
import { EuiFormRow, EuiTextArea } from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../../../shared_imports';
import { useEqlValidation } from '../../../../common/hooks/eql/use_eql_validation';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { DefineStepRule } from '../../../pages/detection_engine/rules/types';
import * as i18n from './translations';
import { useKibana } from '../../../../common/lib/kibana';
import { EqlQueryBarFooter } from './footer';
import { getValidationResults } from './validators';

const TextArea = styled(EuiTextArea)`
  display: block;
  border: ${({ theme }) => theme.eui.euiBorderThin};
  border-bottom: 0;
  box-shadow: none;
`;

export interface EqlQueryBarProps {
  dataTestSubj: string;
  field: FieldHook<DefineStepRule['queryBar']>;
  idAria?: string;
  index: string[];
}

export const EqlQueryBar: FC<EqlQueryBarProps> = ({ dataTestSubj, field, idAria, index }) => {
  // const { http } = useKibana().services;
  const { addError } = useAppToasts();
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  // const { error, start, result } = useEqlValidation();
  const { setValue } = field;
  // const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { isValid, message, messages, error } = getValidationResults(field);
  const fieldValue = field.value.query.query as string;
  // console.log('field', JSON.stringify(field, null, 2));

  useEffect(() => {
    if (messages && messages.length > 0) {
      setErrorMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    if (error) {
      addError(error, { title: i18n.EQL_VALIDATION_REQUEST_ERROR });
    }
  }, [error, addError]);

  // useEffect(() => {
  //   if (result != null && result.valid === false && result.errors.length > 0) {
  //     setErrors([{ message: '' }]);
  //     setErrorMessages(result.errors);
  //   }
  // }, [result, setErrors]);
  // useEffect(() => {

  // }, [errorMessage])

  // const handleValidation = useCallback(() => {
  //   if (fieldValue) {
  //     start({ http, index, query: fieldValue });
  //   }
  // }, [fieldValue, http, index, start]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newQuery = e.target.value;

      setErrorMessages([]);
      setValue({
        filters: [],
        query: {
          query: newQuery,
          language: 'eql',
        },
      });
    },
    [setValue]
  );

  return (
    <EuiFormRow
      label={field.label}
      labelAppend={field.labelAppend}
      helpText={field.helpText}
      error={message}
      isInvalid={!isValid}
      fullWidth
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
    >
      <>
        <TextArea
          data-test-subj="eqlQueryBarTextInput"
          fullWidth
          isInvalid={!isValid}
          value={fieldValue}
          // onBlur={handleValidation}
          onChange={handleChange}
        />
        <EqlQueryBarFooter errors={errorMessages} />
      </>
    </EuiFormRow>
  );
};
