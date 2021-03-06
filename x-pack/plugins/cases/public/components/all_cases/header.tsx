/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled, { css } from 'styled-components';
import { CaseHeaderPage } from '../case_header_page';
import * as i18n from './translations';
import { Count } from './count';
import { CasesNavigation } from '../links';
import { ErrorMessage } from '../use_push_to_service/callout/types';
import { NavButtons } from './nav_buttons';

interface OwnProps {
  actionsErrors: ErrorMessage[];
  configureCasesNavigation: CasesNavigation;
  createCaseNavigation: CasesNavigation;
  refresh: number;
  showTitle?: boolean;
  userCanCrud: boolean;
}

type Props = OwnProps;

const FlexItemDivider = styled(EuiFlexItem)`
  ${({ theme }) => css`
    .euiFlexGroup--gutterMedium > &.euiFlexItem {
      border-right: ${theme.eui.euiBorderThin};
      padding-right: ${theme.eui.euiSize};
      margin-right: ${theme.eui.euiSize};
    }
  `}
`;

export const CasesTableHeader: FunctionComponent<Props> = ({
  actionsErrors,
  configureCasesNavigation,
  createCaseNavigation,
  refresh,
  showTitle = true,
  userCanCrud,
}) => (
  <CaseHeaderPage title={showTitle ? i18n.PAGE_TITLE : ''}>
    <EuiFlexGroup
      alignItems="center"
      gutterSize="m"
      responsive={false}
      wrap={true}
      data-test-subj="all-cases-header"
    >
      {userCanCrud ? (
        <>
          <FlexItemDivider grow={false}>
            <Count refresh={refresh} />
          </FlexItemDivider>

          <EuiFlexItem grow={false}>
            <NavButtons
              actionsErrors={actionsErrors}
              configureCasesNavigation={configureCasesNavigation}
              createCaseNavigation={createCaseNavigation}
            />
          </EuiFlexItem>
        </>
      ) : (
        // doesn't include the horizontal bar that divides the buttons and other padding since we don't have any buttons
        // to the right
        <EuiFlexItem>
          <Count refresh={refresh} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </CaseHeaderPage>
);
