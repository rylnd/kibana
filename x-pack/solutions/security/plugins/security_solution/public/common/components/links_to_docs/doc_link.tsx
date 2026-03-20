/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { ExternalLink } from './external_link';
import { COMMON_ARIA_LABEL_ENDING } from './links_translations';

interface DocLinkProps {
  href: string;
  linkText: string;
}

const DocLink: FC<DocLinkProps> = ({ href, linkText }) => {
  const ariaLabel = `${linkText} - ${COMMON_ARIA_LABEL_ENDING}`;

  return (
    <ExternalLink url={href} ariaLabel={ariaLabel}>
      {linkText}
    </ExternalLink>
  );
};

/**
 * A simple text link to documentation.
 */
const DocLinkWrapper = memo(DocLink);

export { DocLinkWrapper as DocLink };
