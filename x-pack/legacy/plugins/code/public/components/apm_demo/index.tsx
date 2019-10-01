/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlexGroup, EuiText } from '@elastic/eui';

import { EmbeddedCodeBlock } from '../codeblock/embedded_codeblock';
import { CodeIntegrator } from './code_integrator';
import { frames, Frame, results, repos } from './data';

const Container = styled.div`
  padding: 1rem;
`;

const associateToService = (frame: Frame) => (repo: string) =>
  alert(`repo ${repo} associated with service ${JSON.stringify(frame)}`);

const handleImport = (repo: string) => alert(`import done: ${repo}`);

export const ApmDemo = () => (
  <Container className="codeContainer__root">
    {frames.map(frame => {
      const { fileName, lineNumber, functionName } = frame;
      const key = `${fileName}-${lineNumber}-${functionName}`;
      const snippet = results[`${fileName}#L${lineNumber}`];

      const children = snippet ? (
        <EmbeddedCodeBlock snippet={snippet} frame={frame} />
      ) : (
        <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" alignItems="center">
          <EuiText size="s" className="integrations__code">
            <span>{frame.fileName}</span>
            <span className="integrations__preposition">at</span>
            <span>line {frame.lineNumber}</span>
          </EuiText>
          <CodeIntegrator
            onRepoSelect={associateToService(frame)}
            onImportSuccess={handleImport}
            repos={repos}
          />
        </EuiFlexGroup>
      );

      return (
        <div key={key} className="integrations__frame">
          {children}
        </div>
      );
    })}
  </Container>
);
