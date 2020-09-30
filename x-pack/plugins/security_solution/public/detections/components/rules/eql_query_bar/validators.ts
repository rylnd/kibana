/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';

import { FieldHook, ValidationError, ValidationFunc } from '../../../../shared_imports';
import { isEqlRule } from '../../../../../common/detection_engine/utils';
import { KibanaServices } from '../../../../common/lib/kibana';
import { DefineStepRule } from '../../../pages/detection_engine/rules/types';
import { validateEql } from '../../../../common/hooks/eql/api';
import { FieldValueQueryBar } from '../query_bar';
import * as i18n from './translations';

export enum ERROR_CODES {
  FAILED_REQUEST = 'ERR_FAILED_REQUEST',
  INVALID_EQL = 'ERR_INVALID_EQL',
}

export const eqlValidator = async (
  ...args: Parameters<ValidationFunc>
): Promise<ValidationError<ERROR_CODES> | void | undefined> => {
  const [{ value, formData }] = args;
  const { query: queryValue } = value as FieldValueQueryBar;
  const query = queryValue.query as string;
  const { index, ruleType } = formData as DefineStepRule;

  const needsValidation = isEqlRule(ruleType) && !isEmpty(query);
  if (!needsValidation) {
    return;
  }
  console.log('invoking', value);

  try {
    const { http } = KibanaServices.get();
    const signal = new AbortController().signal;
    const response = await validateEql({ query, http, signal, index });
    if (!response.valid) {
      return {
        code: ERROR_CODES.INVALID_EQL,
        message: '',
        messages: response.errors,
      };
    }
    return;
  } catch (error) {
    return {
      code: ERROR_CODES.FAILED_REQUEST,
      message: i18n.EQL_VALIDATION_REQUEST_ERROR,
      error,
    };
  }
};

export const getValidationResults = <T = unknown>(
  field: FieldHook<T>
): { isValid: boolean; message: string; messages?: string[]; error?: Error } => {
  const hasErrors = field.errors.length > 0;
  const isValid = !field.isChangingValue && !hasErrors;

  if (hasErrors) {
    const [error] = field.errors;
    const message = error.message;

    if (error.code === ERROR_CODES.INVALID_EQL) {
      return { isValid, message, messages: error.messages };
    } else {
      return { isValid, message, error: error.error };
    }
  } else {
    return { isValid, message: '' };
  }
};
