/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiLink, EuiText } from '@elastic/eui';

import { CodeBlock } from './codeblock';
import { Frame, Snippet } from '../apm_demo/data';

export interface Props {
  snippet: Snippet;
  frame: Frame;
}

export const EmbeddedCodeBlock = ({ frame, snippet }: Props) => {
  const { compositeContent, language } = snippet;
  const { content, lineMapping, ranges } = compositeContent;

  const fileComponent = (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
        <EuiText size="s">
          <EuiLink href="">{frame.fileName}</EuiLink>
          <span> at line {frame.lineNumber}</span>
        </EuiText>
        <EuiButtonEmpty
          iconType="codeApp"
          href={`#/${snippet.uri}/blob/HEAD/${snippet.filePath}`}
        />
      </EuiFlexGroup>
    </>
  );
  return (
    <>
      <div>{snippet.uri}</div>
      <CodeBlock
        fileComponent={fileComponent}
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
