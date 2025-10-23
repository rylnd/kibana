/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { BulkActionTypeEnum } from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import { getCustomQueryRuleParams, fetchRule } from '../../../utils';
import { createRule, deleteAllRules } from '../../../../../config/services/detections_response';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

/**
 * Authorization tests for bulk enable via Detection Engine endpoint using the
 * test-only feature defined in the fixture plugin (siemEnableFixture). This mirrors
 * the style used by cases and alerting API integration tests where roles are granted
 * granular alerting rule privileges via feature sub-features.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const security = getService('security');
  const log = getService('log');

  const FEATURE_ID = 'siemEnableFixture';
  const ENABLE_PRIV_ID = 'enable_disable';

  describe('@ess @serverless Bulk enable authorization', () => {
    const supertestGetPrivilegesFor = async (username: string, password: string) => {
      const { body } = await supertestWithoutAuth
        .get('/api/security/privileges?includeActions=true')
        .auth(username, password)
        .expect(200);
      return body;
    };

    const enableUser = {
      username: 'siem_enable_user',
      role: 'siem_enable_role',
      password: 'changeme',
    };
    const readOnlyUser = {
      username: 'siem_read_user',
      role: 'siem_read_role',
      password: 'changeme',
    };

    beforeEach(async () => {
      await deleteAllRules(supertest, log);
      // Create roles/users with and without the enable privilege on the test feature.
      await security.role.create(enableUser.role, {
        kibana: [
          {
            feature: {
              [FEATURE_ID]: ['read', ENABLE_PRIV_ID],
            },
            spaces: ['*'],
          },
        ],
      });
      await security.user.create(enableUser.username, {
        full_name: enableUser.username,
        password: enableUser.password,
        roles: [enableUser.role],
        email: `${enableUser.username}@example.com`,
      });

      await security.role.create(readOnlyUser.role, {
        kibana: [
          {
            feature: {
              [FEATURE_ID]: ['read'],
            },
            spaces: ['*'],
          },
        ],
      });
      await security.user.create(readOnlyUser.username, {
        full_name: readOnlyUser.username,
        password: readOnlyUser.password,
        roles: [readOnlyUser.role],
        email: `${readOnlyUser.username}@example.com`,
      });
    });

    afterEach(async () => {
      // cleanup users/roles
      await security.user.delete(enableUser.username);
      await security.role.delete(enableUser.role);
      await security.user.delete(readOnlyUser.username);
      await security.role.delete(readOnlyUser.role);
    });

    it('should forbid bulk enable for a user without enable privilege', async () => {
      // Fetch and sanity-check the user's Kibana feature privileges for the fixture
      const roPrivs = await supertestGetPrivilegesFor(readOnlyUser.username, readOnlyUser.password);
      console.log('roPrivs', Object.keys(roPrivs.features));
      expect(roPrivs.features?.[FEATURE_ID]?.read).toBeDefined();
      expect(roPrivs.features?.[FEATURE_ID]?.all).toBeUndefined();

      const ruleId = 'ruleId-forbid';
      await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({ rule_id: ruleId, enabled: false })
      );

      const { body, status } = await supertestWithoutAuth
        .post('/api/detection_engine/rules/_bulk_action')
        .set('kbn-xsrf', 'true')
        .auth(readOnlyUser.username, readOnlyUser.password)
        .send({ action: BulkActionTypeEnum.enable })
        .expect(403);

      expect(status).toBe(403);
      // Don't assert exact message as it may evolve; status code is sufficient for authorization failure
      expect(body).toBeDefined();
    });

    it('should allow bulk enable for a user with enable privilege', async () => {
      // Fetch and sanity-check the user's Kibana feature privileges for the fixture
      const enPrivs = await supertestGetPrivilegesFor(enableUser.username, enableUser.password);
      expect(enPrivs.features?.[FEATURE_ID]?.all).toBeDefined();

      const ruleId = 'ruleId-allow';
      await createRule(
        supertest,
        log,
        getCustomQueryRuleParams({ rule_id: ruleId, enabled: false })
      );

      const { body } = await supertestWithoutAuth
        .post('/api/detection_engine/rules/_bulk_action')
        .set('kbn-xsrf', 'true')
        .auth(enableUser.username, enableUser.password)
        .send({ action: BulkActionTypeEnum.enable })
        .expect(200);

      expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });
      expect(body.attributes.results.updated[0].enabled).toEqual(true);

      const ruleBody = await fetchRule(supertest, { ruleId });
      expect(ruleBody.enabled).toEqual(true);
    });
  });
};
