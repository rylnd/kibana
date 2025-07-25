/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common/src/constants';
import { API_VERSIONS } from '@kbn/security-solution-plugin/common/constants';
import { routeWithNamespace } from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export const PrivMonUtils = (
  getService: FtrProviderContext['getService'],
  namespace: string = 'default'
) => {
  const api = getService('securitySolutionApi');
  const log = getService('log');
  const supertest = getService('supertest');

  log.info(`Monitoring: Privileged Users: Using namespace ${namespace}`);

  const initPrivMonEngine = async () => {
    log.info(`Initializing Privilege Monitoring engine in namespace ${namespace || 'default'}`);
    const res = await api.initMonitoringEngine(namespace);

    if (res.status !== 200) {
      log.error(`Failed to initialize engine`);
      log.error(JSON.stringify(res.body));
    }

    expect(res.status).to.eql(200);
  };

  const bulkUploadUsersCsv = async (
    fileContent: string | Buffer,
    { expectStatusCode }: { expectStatusCode: number } = { expectStatusCode: 200 }
  ) => {
    const file = fileContent instanceof Buffer ? fileContent : Buffer.from(fileContent);
    return supertest
      .post(routeWithNamespace('/api/entity_analytics/monitoring/users/_csv', namespace))
      .set('kbn-xsrf', 'true')
      .set(ELASTIC_HTTP_VERSION_HEADER, API_VERSIONS.public.v1)
      .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
      .attach('file', file, { filename: 'users.csv', contentType: 'text/csv' })
      .expect(expectStatusCode);
  };

  const retry = async <T>(fn: () => Promise<T>, retries: number = 5, delay: number = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  return { initPrivMonEngine, bulkUploadUsersCsv, retry };
};
