/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';

export const SecuritySolutionNavigationProvider = ({
  getService,
  getPageObjects,
}: FtrProviderContext) => {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);

  return {
    async navigateToOverview() {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('security_solution');
        await testSubjects.existOrFail('navigation-overview', { timeout: 2000 });
      });
    },

    async navigateToDetections() {
      await retry.tryForTime(60 * 1000, async () => {
        await PageObjects.common.navigateToApp('security_solution');
        await testSubjects.existOrFail('thing', { timeout: 2000 });
      });
    },
  };
};
