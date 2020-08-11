/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const security = getService('security');
  const securitySolution = getService('securitySolution');
  const spacesService = getService('spaces');
  const PageObjects = getPageObjects(['common', 'dashboard', 'security', 'error']);
  const appsMenu = getService('appsMenu');
  const testSubjects = getService('testSubjects');

  describe('ML Permissions', () => {
    describe('as an Ml Admin', () => {
      before(async () => {
        await security.testUser.setRoles(['kibana_user', 'machine_learning_admin']);
      });

      after(async () => {
        await security.testUser.restoreDefaults();
      });

      it('allows use of the ML Popover', () => {
        // navigate to detections
        // click on ml popover
        // click on a job switch
        // verify that the switch is enabled
      });

      it('allows creation of an ML Rule', () => {
        // DATA: installed ML Jobs
        // log in as ml admin
        // navigate to detections
        // click on Create New Rule
        // Choose ML type
        // select a job
        // fill other fields
        // view rule in rules table
      });
    });

    describe('as an Ml User', () => {
      it('allows viewing of Detections and ML Rules', () => {
        // DATA: existing ML Rule
        // log in as ml user
        // navigate to detections
        // assert no error toast
      });
    });
  });
};
