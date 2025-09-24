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
  ALERTS_AS_DATA_FIND_URL,
} from '@kbn/security-solution-plugin/common/constants';
import type { DetectionAlert } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { X_ELASTIC_INTERNAL_ORIGIN_REQUEST } from '@kbn/core-http-common';
import { getAlertStatus } from '../../../utils';
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

const query = {
  ...getAlertStatus(),
  query: {
    bool: {
      should: [{ match_all: {} }],
    },
  },
};

const getConsumer = (hit: { _source: DetectionAlert }): string =>
  hit?._source['kibana.alert.rule.consumer'];

const users = { secRulesAllV1User, secRulesReadV1User, secRulesNoneUser };
const roles = [secRulesAllV1, secRulesReadV1, secRulesNone];

export default ({ getService }: FtrProviderContextWithSpaces) => {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const log = getService('log');
  const es = getService('es');
  const utils = getService('securitySolutionUtils');
  const config = getService('config');
  const isServerless = config.get('serverless');
  const isEss = !isServerless;

  describe('@ess @serverless @serverlessQA query_signals_route and find_alerts_route', () => {
    beforeEach(async () => {
      await deleteAllAlerts(supertest, log, es);
    });

    describe.only('query_signals_route with hybrid RBAC', () => {
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
      afterEach(async () => {
        await utils.cleanUpCustomRole();
      });

      beforeEach(async () => {
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alerts/8.8.0_multiple_docs',
          { useCreate: true, docsOnly: true }
        );
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/external_consumer_alerts',
          { useCreate: true, docsOnly: true }
        );
        await createAlertsIndex(supertest, log);
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

      describe.only('as a user with both kibana alert:all privileges and additional index privileges', () => {
        let restrictedAlertsUser: typeof users.secRulesAllV1User;

        beforeEach(async () => {
          const restrictedAlertsRole = {
            name: 'restricted_alerts',
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
              kibana: [],
            },
          };
          restrictedAlertsUser = {
            ...users.secRulesAllV1User,
            username: 'restricted_alerts_user',
            roles: [...users.secRulesAllV1User.roles, restrictedAlertsRole.name],
          };
          await utils.createRole(restrictedAlertsRole.name, restrictedAlertsRole);
          await utils.createUser(restrictedAlertsUser);
        });

        it('applies both RBAC and index privileges', async () => {
          const superTest = await utils.createSuperTestWithUser(restrictedAlertsUser);
          const { body } = await superTest
            .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
            .set('kbn-xsrf', 'true')
            .send(query)
            .expect(200);

          console.log('body', body.hits.hits[0]._source);
          const hits = body.hits.hits as Array<{ _source: DetectionAlert }>;
          _expect(hits).toHaveLength(3);

          for (const hit of hits) {
            _expect(getConsumer(hit)).toEqual('siem');
            _expect(hit._source['kibana.alert.rule.name']).toBeUndefined();
          }
        });
      });
    });

    describe('validation checks', () => {
      it('should not give errors when querying and the alerts index does exist and is empty', async () => {
        await createAlertsIndex(supertest, log);
        const { body } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(query)
          .expect(200);

        // remove any server generated items that are indeterministic
        delete body.took;

        expect(body).to.eql({
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            statuses: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
        });

        await deleteAllAlerts(supertest, log, es);
      });
    });

    describe('runtime fields', () => {
      beforeEach(async () => {
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/alerts/8.8.0_multiple_docs',
          {
            useCreate: true,
            docsOnly: true,
          }
        );
        await createAlertsIndex(supertest, log);
      });
      afterEach(async () => {
        await deleteAllAlerts(supertest, log, es);
      });

      it('should be able to filter using a runtime field defined in the request', async () => {
        const queryRuntime = {
          query: {
            bool: {
              should: [{ match_phrase: { signal_status_querytime: 'open' } }],
            },
          },
          runtime_mappings: {
            signal_status_querytime: {
              type: 'keyword',
              script: {
                source: `emit(doc['signal.status'].value)`,
              },
            },
          },
        };
        const { body } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(queryRuntime)
          .expect(200);
        expect(body.hits.total.value).to.eql(3);
      });
    });

    describe('find_alerts_route', () => {
      describe('validation checks', () => {
        it('should not give errors when querying and the alerts index does exist and is empty', async () => {
          await createAlertsIndex(supertest, log);
          const { body } = await supertest
            .post(ALERTS_AS_DATA_FIND_URL)
            .set('kbn-xsrf', 'true')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send({
              ...query,
              index: '.siem-signals-default',
            })
            .expect(200);

          // remove any server generated items that are indeterministic
          delete body.took;

          expect(body).to.eql({
            timed_out: false,
            _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
            hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
            aggregations: {
              statuses: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            },
          });

          await deleteAllAlerts(supertest, log, es);
        });

        it('should not give errors when executing security solution histogram aggs', async () => {
          await createAlertsIndex(supertest, log);
          await supertest
            .post(ALERTS_AS_DATA_FIND_URL)
            .set('kbn-xsrf', 'true')
            .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
            .send({
              index: '.siem-signals-default',
              aggs: {
                alertsByGrouping: {
                  terms: {
                    field: 'event.category',
                    missing: 'All others',
                    order: { _count: 'desc' },
                    size: 10,
                  },
                  aggs: {
                    alerts: {
                      date_histogram: {
                        field: '@timestamp',
                        fixed_interval: '2699999ms',
                        min_doc_count: 0,
                        extended_bounds: {
                          min: '2021-08-17T04:00:00.000Z',
                          max: '2021-08-18T03:59:59.999Z',
                        },
                      },
                    },
                  },
                },
              },
              query: {
                bool: {
                  filter: [
                    {
                      bool: {
                        must: [],
                        filter: [
                          {
                            match_phrase: {
                              'kibana.alert.rule.uuid': 'c76f1a10-ffb6-11eb-8914-9b237bf6808c',
                            },
                          },
                          { term: { 'kibana.alert.workflow_status': 'open' } },
                        ],
                        should: [],
                        must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
                      },
                    },
                    {
                      range: {
                        '@timestamp': {
                          gte: '2021-08-17T04:00:00.000Z',
                          lte: '2021-08-18T03:59:59.999Z',
                        },
                      },
                    },
                  ],
                },
              },
            })
            .expect(200);

          await deleteAllAlerts(supertest, log, es);
        });
      });
    });
  });
};
