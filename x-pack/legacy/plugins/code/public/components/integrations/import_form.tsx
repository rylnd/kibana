/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent } from 'react';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';

interface Props {
  isInvalid: boolean;
  isLoading?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  value: string;
}

export const ImportForm = ({ isInvalid, isLoading, onChange, onSubmit, value }: Props) => {
  return (
    <EuiForm>
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.code.adminPage.repoTab.repositoryUrlFormLabel"
            defaultMessage="Repository URL"
          />
        </h4>
      </EuiTitle>

      <EuiFlexGroup justifyContent="flexStart" gutterSize="none">
        <EuiFlexItem>
          <EuiFormRow
            isInvalid={isInvalid}
            error={i18n.translate('xpack.code.adminPage.repoTab.repositoryUrlEmptyText', {
              defaultMessage: "The URL shouldn't be empty.",
            })}
          >
            <EuiFieldText
              value={value}
              onChange={onChange}
              onBlur={onChange}
              placeholder="https://github.com/Microsoft/TypeScript-Node-Starter"
              aria-label="input project url"
              data-test-subj="importRepositoryUrlInputBox"
              isLoading={isLoading}
              fullWidth={true}
              isInvalid={isInvalid}
              autoFocus={true}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFormRow>
          <EuiFlexItem>
            <EuiButton onClick={onSubmit} disabled={isLoading || isInvalid}>
              <FormattedMessage
                id="xpack.code.adminPage.repoTab.importButtonLabel"
                defaultMessage="Import"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFormRow>
      </EuiFlexGroup>
    </EuiForm>
  );
};
