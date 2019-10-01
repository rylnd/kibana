/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiLink, EuiText } from '@elastic/eui';

import { RepositoryUtils } from '../../../common/repository_utils';
import { CodeBlock } from './codeblock';
import { Frame, Snippet } from '../apm_demo/data';

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
    <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
      <EuiText size="s">
        <EuiLink href="">{frame.fileName}</EuiLink>
        <span> at line {frame.lineNumber}</span>
      </EuiText>
      <EuiButtonEmpty iconType="codeApp" href={fileUrl} />
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
