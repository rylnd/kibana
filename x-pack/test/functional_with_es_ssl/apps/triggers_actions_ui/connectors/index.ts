/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ loadTestFile }: FtrProviderContext) => {
  describe('Connectors', function () {
    loadTestFile(require.resolve('./general'));
    loadTestFile(require.resolve('./opsgenie'));
    loadTestFile(require.resolve('./tines'));
    loadTestFile(require.resolve('./slack'));
    loadTestFile(require.resolve('./webhook'));
  });
};
