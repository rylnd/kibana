/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
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
    let rulesReadApis: ReturnType<typeof detectionsApi.withUser>;
    let rulesAllApis: ReturnType<typeof detectionsApi.withUser>;

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

      rulesReadApis = detectionsApi.withUser(rulesReadUser);
      rulesAllApis = detectionsApi.withUser(rulesAllUser);
    });

    afterEach(async () => {
      await deleteAllRules(supertest, log);
    });

    describe('duplicating rules', () => {
      it('allows a user with the "rules:all" feature to bulk duplicate rules', async () => {
        const { body: responseBody, status: responseStatus } =
          await rulesAllApis.performRulesBulkAction({
            query: {},
            body: {
              ids: [ruleId],
              action: BulkActionTypeEnum.duplicate,
            },
          });

        expect(responseStatus).toEqual(200);
        expect(responseBody).toEqual(expect.objectContaining({ rules_count: 1, success: true }));
      });

      it('rejects a user with the "rules:read" feature trying to bulk duplicate rules', async () => {
        const { body: responseBody, status: responseStatus } =
          await rulesReadApis.performRulesBulkAction({
            query: {},
            body: {
              ids: [ruleId],
              action: BulkActionTypeEnum.duplicate,
            },
          });

        expect(responseStatus).toEqual(403);
        expect(responseBody.attributes.errors).toHaveLength(1);
        expect(responseBody.attributes.errors[0]).toEqual(
          expect.objectContaining({
            message: expect.stringMatching(/unauthorized/i),
            rules: [expect.objectContaining({ id: ruleId })],
          })
        );
      });
    });

    describe('editing rules', () => {
      it('allows a user with the "rules:all" feature to bulk edit rules', async () => {
        const { body: responseBody, status: responseStatus } =
          await rulesAllApis.performRulesBulkAction({
            query: {},
            body: {
              ids: [ruleId],
              action: BulkActionTypeEnum.edit,
              edit: [
                {
                  type: 'add_tags',
                  value: ['newTag'],
                },
              ],
            },
          });

        expect(responseStatus).toEqual(200);
        expect(responseBody).toEqual(expect.objectContaining({ rules_count: 1, success: true }));
      });

      it('rejects a user with the "rules:read" feature trying to bulk edit rules', async () => {
        const { body: responseBody, status: responseStatus } =
          await rulesReadApis.performRulesBulkAction({
            query: {},
            body: {
              ids: [ruleId],
              action: BulkActionTypeEnum.edit,
              edit: [
                {
                  type: 'add_tags',
                  value: ['newTag'],
                },
              ],
            },
          });

        expect(responseStatus).toEqual(403);
        expect(responseBody).toEqual(
          expect.objectContaining({
            message: expect.stringMatching(/unauthorized/i),
          })
        );
      });
    });

    describe('deleting rules', () => {
      it('allows a user with the "rules:all" feature to bulk delete rules', async () => {
        const { body: responseBody, status: responseStatus } =
          await rulesAllApis.performRulesBulkAction({
            query: {},
            body: {
              ids: [ruleId],
              action: BulkActionTypeEnum.delete,
            },
          });

        expect(responseStatus).toEqual(200);
        expect(responseBody).toEqual(expect.objectContaining({ rules_count: 1, success: true }));
      });

      it('rejects a user with the "rules:read" feature trying to bulk delete rules', async () => {
        const { body: responseBody, status: responseStatus } =
          await rulesReadApis.performRulesBulkAction({
            query: {},
            body: {
              ids: [ruleId],
              action: BulkActionTypeEnum.delete,
            },
          });

        expect(responseStatus).toEqual(403);
        expect(responseStatus).toEqual(403);
        expect(responseBody.attributes.errors).toHaveLength(1);
        expect(responseBody.attributes.errors[0]).toEqual(
          expect.objectContaining({
            message: expect.stringMatching(/unauthorized/i),
            rules: [expect.objectContaining({ id: ruleId })],
          })
        );
      });
    });

    describe('exporting rules', () => {
      it('allows a user with the "rules:all" feature to bulk export rules', async () => {
        const { headers: responseHeaders, status: responseStatus } =
          await rulesAllApis.performRulesBulkAction({
            query: {},
            body: {
              ids: [ruleId],
              action: BulkActionTypeEnum.export,
            },
          });

        expect(responseStatus).toEqual(200);
        expect(responseHeaders['content-disposition']).toContain('attachment');
      });

      it('allows a user with the "rules:read" feature to bulk export rules', async () => {
        const { headers: responseHeaders, status: responseStatus } =
          await rulesReadApis.performRulesBulkAction({
            query: {},
            body: {
              ids: [ruleId],
              action: BulkActionTypeEnum.export,
            },
          });

        expect(responseStatus).toEqual(200);
        expect(responseHeaders['content-disposition']).toContain('attachment');
      });
    });

    describe('enabling/disabling rules', () => {
      it('allows a user with the "rules:all" feature to bulk enable rules', async () => {
        const { body: responseBody, status: responseStatus } =
          await rulesAllApis.performRulesBulkAction({
            query: {},
            body: {
              ids: [ruleId],
              action: BulkActionTypeEnum.enable,
            },
          });

        expect(responseStatus).toEqual(200);
        expect(responseBody).toEqual(expect.objectContaining({ rules_count: 1, success: true }));
      });

      it('rejects a user with the "rules:read" feature trying to bulk enable rules', async () => {
        const { body: responseBody, status: responseStatus } =
          await rulesReadApis.performRulesBulkAction({
            query: {},
            body: {
              ids: [ruleId],
              action: BulkActionTypeEnum.enable,
            },
          });

        expect(responseStatus).toEqual(403);
        expect(responseBody).toEqual(
          expect.objectContaining({
            message: expect.stringMatching(/unauthorized/i),
          })
        );
      });
    });

    describe('filling rule gaps', () => {
      beforeEach(async () => {
        // you can only fill on an enabled rule, which our default rule is not
        const resp = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: uuidv4(),
            enabled: true,
          })
        );
        ruleId = resp.id;
      });

      it('allows a user with the "rules:all" feature to bulk fill gaps for rules', async () => {
        const { body: responseBody, status: responseStatus } =
          await rulesAllApis.performRulesBulkAction({
            query: {},
            body: {
              ids: [ruleId],
              action: BulkActionTypeEnum.fill_gaps,
              [BulkActionTypeEnum.fill_gaps]: {
                start_date: moment().subtract(2, 'hours').toISOString(),
                end_date: moment().toISOString(),
              },
            },
          });

        expect(responseStatus).toEqual(200);
        expect(responseBody).toEqual(expect.objectContaining({ rules_count: 1, success: true }));
      });

      it('rejects a user with the "rules:read" feature trying to bulk fill gaps for rules', async () => {
        const { body: responseBody, status: responseStatus } =
          await rulesReadApis.performRulesBulkAction({
            query: {},
            body: {
              ids: [ruleId],
              action: BulkActionTypeEnum.fill_gaps,
              [BulkActionTypeEnum.fill_gaps]: {
                start_date: moment().subtract(2, 'hours').toISOString(),
                end_date: moment().toISOString(),
              },
            },
          });

        expect(responseStatus).toEqual(403);
        expect(responseBody.attributes.errors).toHaveLength(1);
        expect(responseBody.attributes.errors[0]).toEqual(
          expect.objectContaining({
            message: expect.stringMatching(/unauthorized/i),
            rules: [expect.objectContaining({ id: ruleId })],
          })
        );
      });
    });
  });
};
