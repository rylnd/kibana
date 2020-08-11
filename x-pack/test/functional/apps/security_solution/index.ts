/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FtrProviderContext } from '../../ftr_provider_context.d';

export default ({ getService, loadTestFile }: FtrProviderContext) => {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');

  describe('Security Solution app', () => {
    // this.tags(['ciGroup4']);
    before(async () => {
      // await browser.setWindowSize(1280, 800);
      // await esArchiver.loadIfNeeded('logstash_functional');
      // await esArchiver.loadIfNeeded('lens/basic');
    });

    after(async () => {
      // await esArchiver.unload('logstash_functional');
      // await esArchiver.unload('lens/basic');
    });

    loadTestFile(require.resolve('./ml_integration'));
  });
};
