/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from 'expect';

import { BulkActionTypeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { FtrProviderContextWithSpaces } from '../../../../../ftr_provider_context_with_spaces';
import { createRule, deleteAllRules } from '../../../../../config/services/detections_response';
import { getCustomQueryRuleParams } from '../../../utils';
import { rulesAll, rulesRead } from '../../../../../config/privileges/roles';

export default ({ getService }: FtrProviderContextWithSpaces) => {
  const supertest = getService('supertest');
  const detectionsApi = getService('detectionsApi');
  const log = getService('log');
  const utils = getService('securitySolutionUtils');
  const isEss = !getService('config').get('serverless');

  describe.only('@ess @serverless @skipInServerlessMKI Rules RBAC - Bulk Actions APIs', () => {
    let ruleId: string;
    let rulesReadApis: ReturnType<typeof detectionsApi.createScopedApiInstance>;
    let rulesAllApis: ReturnType<typeof detectionsApi.createScopedApiInstance>;

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      const resp = await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({
          rule_id: uuidv4(),
        })
      );
      ruleId = resp.id;

      const rulesReadUser = {
        username: 'rules_read',
        password: 'password',
        roles: [rulesRead.name],
      };
      const rulesAllUser = { username: 'rules_all', password: 'password', roles: [rulesAll.name] };

      // create rules roles
      if (isEss) {
        await Promise.all([
          utils.createRole(rulesRead.name, rulesRead),
          utils.createRole(rulesAll.name, rulesAll),
        ]);
        await Promise.all([utils.createUser(rulesReadUser), utils.createUser(rulesAllUser)]);
      }

      const rulesReadSupertest = await utils.createSuperTestWithUser(rulesReadUser);
      const rulesAllSupertest = await utils.createSuperTestWithUser(rulesAllUser);
      rulesReadApis = detectionsApi.createScopedApiInstance(rulesReadSupertest);
      rulesAllApis = detectionsApi.createScopedApiInstance(rulesAllSupertest);
    });

    afterEach(async () => {
      await deleteAllRules(supertest, log);
    });

    describe('duplicating rules', () => {
      it('allows a user with the "rules:all" feature to bulk duplicate rules', async () => {
        const bulkDuplicateResponse = await rulesAllApis.performRulesBulkAction({
          query: {},
          body: {
            ids: [ruleId],
            action: BulkActionTypeEnum.duplicate,
          },
        });

        expect(bulkDuplicateResponse).toEqual(expect.objectContaining({ status: 200 }));
      });

      it('rejects a user with the "rules:read" feature to bulk duplicate rules', async () => {
        const bulkDuplicateResponse = await rulesReadApis.performRulesBulkAction({
          query: {},
          body: {
            ids: [ruleId],
            action: BulkActionTypeEnum.duplicate,
          },
        });

        expect(bulkDuplicateResponse).toEqual(expect.objectContaining({ status: 403 }));
      });
    });

    describe('editing rules', () => {});
    describe('deleting rules', () => {});
    describe('exporting rules', () => {});
    describe('enabling/disabling rules', () => {});
    describe('filling rule gaps', () => {});
  });
};
