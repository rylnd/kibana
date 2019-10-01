/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiLink, EuiText, EuiTextColor } from '@elastic/eui';

import { RepositoryUtils } from '../../../common/repository_utils';
import { CodeBlock } from './codeblock';
import { Frame, Snippet } from '../integrations/data';

export interface Props {
  snippet: Snippet;
  frame: Frame;
}

export const EmbeddedCodeBlock = ({ frame, snippet }: Props) => {
  const { compositeContent, language } = snippet;
  const { content, lineMapping, ranges } = compositeContent;
  const fileUrl = `#/${snippet.uri}/blob/HEAD/${snippet.filePath}`;
  const repoOrg = RepositoryUtils.orgNameFromUri(snippet.uri);
  const repoName = RepositoryUtils.repoNameFromUri(snippet.uri);

  const topBar = (
    <EuiFlexGroup
      className="integrations__snippet-info"
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="none"
    >
      <EuiText size="s">
        <EuiLink href={fileUrl}>{frame.fileName}</EuiLink>
        <span> at </span>
        <EuiLink href={fileUrl}>line {frame.lineNumber}</EuiLink>
      </EuiText>
      <EuiText size="xs">
        <EuiTextColor color="subdued">Last updated: 14 mins ago</EuiTextColor>
        <EuiButtonIcon
          className="integrations__link--external integrations__button-icon"
          iconType="codeApp"
          href={fileUrl}
        />
      </EuiText>
    </EuiFlexGroup>
  );

  return (
    <>
      <EuiText size="s" className="integrations__snippet-title">
        <span>{repoOrg}/</span>
        <span className="integrations__text--bold">{repoName}</span>
      </EuiText>
      <CodeBlock
        fileComponent={topBar}
        language={language}
        startLine={0}
        code={content}
        highlightRanges={ranges}
        folding={false}
        lineNumbersFunc={l => lineMapping[l - 1]}
        onClick={() => {}}
      />
    </>
  );
};
