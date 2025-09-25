/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import _expect from 'expect';

import {
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  SECURITY_FEATURE_ID,
} from '@kbn/security-solution-plugin/common/constants';
import type { DetectionAlert } from '@kbn/security-solution-plugin/common/api/detection_engine';
import {
  createAlertsIndex,
  deleteAllAlerts,
} from '../../../../../config/services/detections_response';
import {
  secRulesAllV1,
  secRulesNone,
  secRulesReadV1,
} from '../../../../../config/privileges/roles';
import type { FtrProviderContextWithSpaces } from '../../../../../ftr_provider_context_with_spaces';
import {
  secRulesAllV1User,
  secRulesNoneUser,
  secRulesReadV1User,
} from '../../../../../config/privileges/users';

const getConsumer = (hit: { _source: DetectionAlert }): string =>
  hit?._source['kibana.alert.rule.consumer'];

const users = { secRulesAllV1User, secRulesReadV1User, secRulesNoneUser };
const roles = [secRulesAllV1, secRulesReadV1, secRulesNone];

const roleToAccessSecuritySolution = {
  name: 'sec_all_spaces',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['.alerts-security.alerts-default'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [SECURITY_FEATURE_ID]: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
const roleToAccessSecuritySolutionWithDls = {
  name: 'sec_all_spaces_with_dls',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['.alerts-security.alerts-default'],
          privileges: ['read'],
          query:
            '{"wildcard" : { "kibana.alert.ancestors.index" : { "value": ".ds-kibana_does_not_exist" } } }',
        },
      ],
    },
    kibana: [
      {
        feature: {
          [SECURITY_FEATURE_ID]: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
const userAllSec = {
  username: 'user_all_sec',
  password: 'user_all_sec',
  full_name: 'userAllSec',
  email: 'userAllSec@elastic.co',
  roles: [roleToAccessSecuritySolution.name],
};
const userAllSecWithDls = {
  username: 'user_all_sec_with_dls',
  password: 'user_all_sec_with_dls',
  full_name: 'userAllSecWithDls',
  email: 'userAllSecWithDls@elastic.co',
  roles: [roleToAccessSecuritySolutionWithDls.name],
};

export default ({ getService }: FtrProviderContextWithSpaces) => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const esArchiver = getService('esArchiver');
  const security = getService('security');
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');
  const utils = getService('securitySolutionUtils');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const isEss = !isServerless;

  // Notes: Similar tests should be added for serverless once infrastructure
  // is in place to test roles in MKI enviornment.
  describe('@ess @skipInServerless find alert with/without doc level security', () => {
    describe('with basic roles', () => {
      before(async () => {
        await security.role.create(
          roleToAccessSecuritySolution.name,
          roleToAccessSecuritySolution.privileges
        );
        await security.role.create(
          roleToAccessSecuritySolutionWithDls.name,
          roleToAccessSecuritySolutionWithDls.privileges
        );
        await security.user.create(userAllSec.username, {
          password: userAllSec.password,
          roles: userAllSec.roles,
          full_name: userAllSec.full_name,
          email: userAllSec.email,
        });
        await security.user.create(userAllSecWithDls.username, {
          password: userAllSecWithDls.password,
          roles: userAllSecWithDls.roles,
          full_name: userAllSecWithDls.full_name,
          email: userAllSecWithDls.email,
        });

        await deleteAllAlerts(supertest, log, es);
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alerts/8.8.0_multiple_docs',
          {
            useCreate: true,
            docsOnly: true,
          }
        );
      });

      after(async () => {
        await security.user.delete(userAllSec.username);
        await security.user.delete(userAllSecWithDls.username);
        await security.role.delete(roleToAccessSecuritySolution.name);
        await security.role.delete(roleToAccessSecuritySolutionWithDls.name);
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alerts/8.8.0_multiple_docs'
        );
      });

      it('should return alerts with user who has access to security solution privileges', async () => {
        const query = {
          query: {
            bool: {
              should: [{ match_all: {} }],
            },
          },
        };
        const { body } = await supertestWithoutAuth
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .auth(userAllSec.username, userAllSec.password)
          .set('kbn-xsrf', 'true')
          .send(query)
          .expect(200);
        expect(body.hits.total.value).to.eql(3);
      });

      it('should filter out alerts with user who has access to security solution privileges and document level security', async () => {
        const query = {
          query: {
            bool: {
              should: [{ match_all: {} }],
            },
          },
        };
        const { body } = await supertestWithoutAuth
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .auth(userAllSecWithDls.username, userAllSecWithDls.password)
          .set('kbn-xsrf', 'true')
          .send(query)
          .expect(200);
        expect(body.hits.total.value).to.eql(0);
      });
    });

    describe.only('query_signals_route with hybrid RBAC', () => {
      const query = {
        query: {
          bool: {
            should: [{ match_all: {} }],
          },
        },
      };
      const getAlertCount = async () => {
        const { count } = await es.count({
          index: '.alerts-security.alerts-default',
          query: {
            bool: {
              should: [{ match_all: {} }],
            },
          },
        });

        return count;
      };

      before(async () => {
        if (isEss) {
          await Promise.all(
            roles.map((role) => {
              return utils.createRole(role.name, role);
            })
          );
          await Promise.all(
            Object.values(users).map((user) => {
              return utils.createUser(user);
            })
          );
        }
      });

      after(async () => {
        if (isEss) {
          await utils.deleteUsers(Object.values(users).map((user) => user.username));
          await utils.deleteRoles(roles.map((role) => role.name));
        }
      });

      beforeEach(async () => {
        await deleteAllAlerts(supertest, log, es);
        await createAlertsIndex(supertest, log);
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alerts/8.8.0_multiple_docs',
          { docsOnly: false }
        );
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/external_consumer_alerts',
          // docsOnly: true ensures that any existing data in the same index is not first deleted
          { docsOnly: true }
        );

        expect(await getAlertCount()).to.eql(
          6,
          "sanity check failed: there should be three 'siem' alerts and three 'external' alerts"
        );
      });

      afterEach(async () => {
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/external_consumer_alerts'
        );
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alerts/8.8.0_multiple_docs'
        );
      });

      describe('as a user with no privileges', () => {
        it('returns a 403 response due to insufficient privileges', async () => {
          const superTest = await utils.createSuperTestWithUser(users.secRulesNoneUser);
          const { body } = await superTest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(query)
            .expect(403);

          _expect(body).toEqual({
            statusCode: 403,
            message: _expect.stringContaining(
              'this action is granted by the Kibana privileges [securitySolution]'
            ),
            error: 'Forbidden',
          });
        });
      });

      describe('as a user with kibana alert:read privileges', () => {
        it('applies appropriate RBAC and returns only siem alerts', async () => {
          const superTest = await utils.createSuperTestWithUser(users.secRulesReadV1User);
          const { body } = await superTest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(query)
            .expect(200);

          const hits = body.hits.hits as Array<{ _source: DetectionAlert }>;
          _expect(hits).toHaveLength(3);

          for (const hit of hits) {
            _expect(getConsumer(hit)).toEqual('siem');
          }
        });
      });

      describe('as a user with kibana alert:all privileges', () => {
        it('applies appropriate RBAC and returns only siem alerts', async () => {
          const superTest = await utils.createSuperTestWithUser(users.secRulesAllV1User);
          const { body } = await superTest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(query)
            .expect(200);

          const hits = body.hits.hits as Array<{ _source: DetectionAlert }>;
          _expect(hits).toHaveLength(3);

          for (const hit of hits) {
            _expect(getConsumer(hit)).toEqual('siem');
          }
        });
      });

      describe('with field- and document-level security', () => {
        let user: typeof users.secRulesAllV1User;
        let role: any;

        afterEach(async () => {
          await utils.deleteUsers([user.username]);
          await utils.deleteRoles([role.name]);
        });

        describe('as a user with both kibana alert:all privileges and additional field-level restrictions', () => {
          beforeEach(async () => {
            role = {
              name: 'restricted_alerts_by_field',
              privileges: {
                elasticsearch: {
                  indices: [
                    {
                      names: ['.alerts-security.alerts-*'],
                      privileges: ['read', 'view_index_metadata', 'write'],
                      field_security: {
                        grant: ['*'],
                        except: ['user.name'],
                      },
                    },
                  ],
                },
                kibana: [
                  {
                    feature: {
                      [SECURITY_FEATURE_ID]: ['all'],
                    },
                    spaces: ['*'],
                  },
                ],
              },
            };
            user = {
              username: 'restricted_alerts_user',
              password: 'password',
              roles: [role.name],
            };
            await utils.createRole(role.name, role);
            await utils.createUser(user);
          });

          it('applies both RBAC and index privileges', async () => {
            const superTest = await utils.createSuperTestWithUser(user);
            const { body } = await superTest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(query)
              .expect(200);

            const hits = body.hits.hits as Array<{ _source: DetectionAlert }>;
            _expect(hits).toHaveLength(3);

            for (const hit of hits) {
              _expect(hit._source['user.name']).toBeUndefined();
              _expect(getConsumer(hit)).toEqual('siem');
            }
          });
        });

        describe('as a user with both kibana alert:all privileges and an additional role query restriction', () => {
          beforeEach(async () => {
            role = {
              name: 'restricted_alerts_by_query',
              privileges: {
                elasticsearch: {
                  indices: [
                    {
                      names: ['.alerts-security.alerts-*'],
                      privileges: ['read', 'view_index_metadata', 'write'],
                      query:
                        // this should return a single alert
                        '{"ids" : { "values" : ["eabbdefc23da981f2b74ab58b82622a97bb9878caa11bc914e2adfacc94780f1"] } } }',
                    },
                  ],
                },
                kibana: [
                  {
                    feature: {
                      [SECURITY_FEATURE_ID]: ['all'],
                    },
                    spaces: ['*'],
                  },
                ],
              },
            };
            user = {
              username: 'restricted_alerts_user',
              password: 'password',
              roles: [role.name],
            };
            await utils.createRole(role.name, role);
            await utils.createUser(user);
          });

          it('applies both RBAC and index privileges', async () => {
            const superTest = await utils.createSuperTestWithUser(user);
            const { body } = await superTest
              .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
              .set('kbn-xsrf', 'true')
              .send(query)
              .expect(200);

            const hits = body.hits.hits as Array<{ _source: DetectionAlert }>;
            _expect(hits).toHaveLength(1);

            for (const hit of hits) {
              _expect(getConsumer(hit)).toEqual('siem');
            }
          });
        });
      });
    });
  });
};
