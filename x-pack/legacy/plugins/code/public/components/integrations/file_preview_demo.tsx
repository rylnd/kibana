/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EuiButton } from '@elastic/eui';
import { CodeFlyout } from './code_flyout';

export const FlyoutDemo = () => {
  const [isFlyoutVisible, setVisible] = React.useState(false);

  const closeFlyout = () => {
    setVisible(false);
  };

  const showFlyout = () => {
    setVisible(true);
  };

  const repo = 'github.com/Microsoft/TypeScript-Node-Starter';
  const file = 'src/app.ts';
  const revision = 'master';
  return (
    <div>
      <EuiButton onClick={showFlyout}>Show flyout</EuiButton>
      <CodeFlyout
        open={isFlyoutVisible}
        onClose={closeFlyout}
        file={file}
        repo={repo}
        revision={revision}
      />
    </div>
  );
};
