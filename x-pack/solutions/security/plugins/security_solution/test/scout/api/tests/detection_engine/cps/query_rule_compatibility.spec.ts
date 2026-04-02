/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import {
  apiTest,
  type EsClient,
  getLinkedEsClient,
  tags,
  type ApiClientFixture,
} from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import { DETECTION_ENGINE_RULES_PREVIEW } from '../../../../../../common/constants';

/**
 * Cross-project search (CPS) for the detection engine is exercised against a Serverless stack
 * with a linked Elasticsearch project (origin + remote). Locally:
 *
 * node scripts/scout start-server --arch serverless --domain security_complete --serverConfigSet cps_local
 */
const DETECTION_ENGINE_CPS_TAGS = [...tags.serverless.security.complete];

const COMMON_HEADERS = {
  'kbn-xsrf': 'scout-cps-detection-engine',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
  'elastic-api-version': '2023-10-31',
} as const;

/** Space NPRE expression: search only the origin (self-linked) project; excludes the remote linked project. */
const SPACE_PROJECT_ROUTING_ORIGIN_ONLY = '_alias:_origin';

/** Space NPRE expression: search the origin and all linked projects (wildcard alias scope). */
const SPACE_PROJECT_ROUTING_ALL = '_alias:*';

const getSearchTotalHits = (total: unknown): number => {
  if (typeof total === 'number') {
    return total;
  }
  if (
    total !== null &&
    typeof total === 'object' &&
    'value' in total &&
    typeof (total as { value: unknown }).value === 'number'
  ) {
    return (total as { value: number }).value;
  }
  return 0;
};

const CPS_DETECTION_TEST_INDEX_MAPPINGS = {
  properties: {
    '@timestamp': { type: 'date' as const },
    'cps.detection.test.run_id': { type: 'keyword' as const },
    'host.name': { type: 'keyword' as const },
  },
};

const createKibanaSpace = async (params: {
  apiClient: ApiClientFixture;
  spaceId: string;
  headers: Record<string, string>;
  projectRouting?: string;
}): Promise<void> => {
  const { apiClient, spaceId, headers, projectRouting } = params;
  const createResponse = await apiClient.post('api/spaces/space', {
    headers,
    responseType: 'json',
    body: {
      id: spaceId,
      name: `CPS detection test ${spaceId}`,
      description: 'Temporary space for detection engine CPS Scout tests',
      disabledFeatures: [],
      ...(projectRouting !== undefined ? { projectRouting } : {}),
    },
  });
  expect(createResponse).toHaveStatusCode(200);
};

const createSimpleTestIndex = async (params: {
  index: string;
  esClient: EsClient;
  docBodyOverrides?: Record<string, unknown>;
}): Promise<void> => {
  const { index, esClient, docBodyOverrides } = params;
  const docTimestamp = new Date(Date.now() - 60_000).toISOString();

  await esClient.indices.delete({ index }, { ignore: [404] });
  await esClient.indices.create({ index, mappings: CPS_DETECTION_TEST_INDEX_MAPPINGS });

  const body = {
    '@timestamp': docTimestamp,
    'host.name': 'hostname',
    ...docBodyOverrides,
  };

  await esClient.index({
    index,
    refresh: 'wait_for',
    body,
  });
};

apiTest.describe(
  'Detection engine and Cross-Project Search (CPS)',
  { tag: DETECTION_ENGINE_CPS_TAGS },
  () => {
    apiTest.beforeAll(async ({ config }, testInfo) => {
      // Linked Elasticsearch is only present when Scout servers use the cps_local config set.
      if (!config.serverless || !config.linkedProject) {
        testInfo.skip(
          true,
          'Requires serverless with a linked Elasticsearch project. Start servers with: node scripts/scout start-server --arch serverless --domain security_complete --serverConfigSet cps_local'
        );
      }
    });

    apiTest(
      'query rule preview matches data in the origin project only when the space routes to origin',
      async ({ apiClient, config, esClient, log, samlAuth }) => {
        const credentials = await samlAuth.asInteractiveUser('admin');
        const headers: Record<string, string> = {
          ...credentials.cookieHeader,
          ...COMMON_HEADERS,
        };

        const runId = randomUUID();
        const spaceId = `cps-de-${runId.slice(0, 8)}`;
        const testIndex = `scout-${spaceId}`;
        const linkedEs = getLinkedEsClient(config, log);

        await createKibanaSpace({
          apiClient,
          spaceId,
          headers,
          projectRouting: SPACE_PROJECT_ROUTING_ORIGIN_ONLY,
        });

        try {
          await createSimpleTestIndex({
            index: testIndex,
            esClient,
            docBodyOverrides: {
              'cps.detection.test.run_id': runId,
              'host.name': 'scout-cps-origin-host',
            },
          });
          await createSimpleTestIndex({
            index: testIndex,
            esClient: linkedEs,
            docBodyOverrides: {
              'cps.detection.test.run_id': runId,
              'host.name': 'scout-cps-linked-host',
            },
          });

          const timeframeEnd = new Date().toISOString();

          const previewResponse = await apiClient.post(
            `s/${spaceId}${DETECTION_ENGINE_RULES_PREVIEW}`,
            {
              headers,
              responseType: 'json',
              body: {
                type: 'query',
                name: `CPS detection preview ${runId}`,
                description: 'Scout CPS scope validation for custom query rule',
                risk_score: 21,
                severity: 'low',
                rule_id: `cps-de-rule-${runId}`,
                index: [testIndex],
                query: `cps.detection.test.run_id: "${runId}"`,
                language: 'kuery',
                from: 'now-24h',
                to: 'now',
                interval: '1m',
                max_signals: 100,
                enabled: true,
                author: [],
                false_positives: [],
                references: [],
                threat: [],
                tags: [],
                actions: [],
                invocationCount: 1,
                timeframeEnd,
              },
            }
          );

          expect(previewResponse).toHaveStatusCode(200);
          const previewBody = previewResponse.body as {
            previewId?: string;
            logs: Array<{ errors: string[]; warnings: string[] }>;
          };

          expect(previewBody.previewId).toBeDefined();
          expect(previewBody.logs[0]?.errors ?? []).toStrictEqual([]);

          const previewId = previewBody.previewId as string;
          const previewIndex = `.preview.alerts-security.alerts-${spaceId}`;

          const alertSearch = await esClient.search({
            index: previewIndex,
            query: {
              term: {
                'kibana.alert.rule.uuid': previewId,
              },
            },
            track_total_hits: true,
            size: 10,
            _source: true,
          });

          expect(getSearchTotalHits(alertSearch.hits.total)).toBe(1);

          const hitSource = alertSearch.hits.hits[0]?._source as
            | Record<string, unknown>
            | undefined;
          expect(hitSource).toBeDefined();

          expect(hitSource?.['host.name']).toBe('scout-cps-origin-host');
        } finally {
          await esClient.indices.delete({ index: testIndex }, { ignore: [404] });
          await linkedEs.indices.delete({ index: testIndex }, { ignore: [404] });
          await apiClient.delete(`api/spaces/space/${spaceId}`, { headers });
        }
      }
    );

    apiTest(
      'query rule preview matches data in origin and linked projects when the space uses all-projects routing',
      async ({ apiClient, config, esClient, log, samlAuth }) => {
        const credentials = await samlAuth.asInteractiveUser('admin');
        const headers: Record<string, string> = {
          ...credentials.cookieHeader,
          ...COMMON_HEADERS,
        };

        const runId = randomUUID();
        const spaceId = `cps-de-all-${runId.slice(0, 8)}`;
        const testIndex = `scout-${spaceId}`;
        const linkedEs = getLinkedEsClient(config, log);

        await createKibanaSpace({
          apiClient,
          spaceId,
          headers,
          projectRouting: SPACE_PROJECT_ROUTING_ALL,
        });

        try {
          await createSimpleTestIndex({
            index: testIndex,
            esClient,
            docBodyOverrides: {
              'cps.detection.test.run_id': runId,
              'host.name': 'scout-cps-origin-host',
            },
          });
          await createSimpleTestIndex({
            index: testIndex,
            esClient: linkedEs,
            docBodyOverrides: {
              'cps.detection.test.run_id': runId,
              'host.name': 'scout-cps-linked-host',
            },
          });

          const timeframeEnd = new Date().toISOString();

          const previewResponse = await apiClient.post(
            `s/${spaceId}${DETECTION_ENGINE_RULES_PREVIEW}`,
            {
              headers,
              responseType: 'json',
              body: {
                type: 'query',
                name: `CPS detection preview all-projects ${runId}`,
                description: 'Scout CPS all-projects scope validation for custom query rule',
                risk_score: 21,
                severity: 'low',
                rule_id: `cps-de-rule-all-${runId}`,
                index: [testIndex],
                query: `cps.detection.test.run_id: "${runId}"`,
                language: 'kuery',
                from: 'now-24h',
                to: 'now',
                interval: '1m',
                max_signals: 100,
                enabled: true,
                author: [],
                false_positives: [],
                references: [],
                threat: [],
                tags: [],
                actions: [],
                invocationCount: 1,
                timeframeEnd,
              },
            }
          );

          expect(previewResponse).toHaveStatusCode(200);
          const previewBody = previewResponse.body as {
            previewId?: string;
            logs: Array<{ errors: string[]; warnings: string[] }>;
          };

          expect(previewBody.previewId).toBeDefined();
          expect(previewBody.logs[0]?.errors ?? []).toStrictEqual([]);

          const previewId = previewBody.previewId as string;
          const previewIndex = `.preview.alerts-security.alerts-${spaceId}`;

          const alertSearch = await esClient.search({
            index: previewIndex,
            query: {
              term: {
                'kibana.alert.rule.uuid': previewId,
              },
            },
            track_total_hits: true,
            size: 10,
            _source: true,
          });

          expect(getSearchTotalHits(alertSearch.hits.total)).toBe(2);

          const hostNames = alertSearch.hits.hits
            .map((hit) => (hit._source as Record<string, unknown> | undefined)?.['host.name'])
            .filter((v): v is string => typeof v === 'string')
            .sort();
          expect(hostNames).toStrictEqual(
            ['scout-cps-linked-host', 'scout-cps-origin-host'].sort()
          );
        } finally {
          await esClient.indices.delete({ index: testIndex }, { ignore: [404] });
          await linkedEs.indices.delete({ index: testIndex }, { ignore: [404] });
          await apiClient.delete(`api/spaces/space/${spaceId}`, { headers });
        }
      }
    );
  }
);
