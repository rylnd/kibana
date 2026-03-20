/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../../../../../../common/lib/kibana';
import { DocLink } from '../../../../../../../../common/components/links_to_docs/doc_link';

export function DataSourceInfoText(): JSX.Element {
  const { docLinks } = useKibana().services;
  const { introduction, dataViewsApi } = docLinks.links.indexPatterns;

  return (
    <EuiText size="xs">
      <FormattedMessage
        id="xpack.securitySolution.dataViewSelectorText1"
        defaultMessage="Use Kibana "
      />
      <DocLink href={introduction} linkText="Data Views" />
      <FormattedMessage
        id="xpack.securitySolution.dataViewSelectorText2"
        defaultMessage=" or specify individual "
      />
      <DocLink href={dataViewsApi} linkText="index patterns" />
      <FormattedMessage
        id="xpack.securitySolution.dataViewSelectorText3"
        defaultMessage=" as your rule's data source to be searched."
      />
    </EuiText>
  );
}
