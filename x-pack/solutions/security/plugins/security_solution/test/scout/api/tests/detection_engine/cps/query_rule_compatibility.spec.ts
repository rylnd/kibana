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
import {
  DEFAULT_INDICATOR_SOURCE_PATH,
  DETECTION_ENGINE_RULES_PREVIEW,
} from '../../../../../../common/constants';

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

const CPS_ORIGIN_HOST = 'scout-cps-origin-host';
const CPS_LINKED_HOST = 'scout-cps-linked-host';

const CPS_DETECTION_TEST_INDEX_MAPPINGS = {
  properties: {
    '@timestamp': { type: 'date' as const },
    /** Stable filter field for KQL / EQL / ES|QL in these tests */
    cps_run_id: { type: 'keyword' as const },
    'cps.detection.test.run_id': { type: 'keyword' as const },
    'host.name': { type: 'keyword' as const },
    'event.kind': { type: 'keyword' as const },
    'threat.indicator': {
      properties: {
        host: {
          properties: {
            name: { type: 'keyword' as const },
          },
        },
      },
    },
  },
};

type CpsRuleCompatibilityType =
  | 'query'
  | 'eql'
  | 'saved_query'
  | 'threshold'
  | 'threat_match'
  | 'new_terms'
  | 'esql';

const CPS_RULE_COMPATIBILITY_TYPES: readonly CpsRuleCompatibilityType[] = [
  'query',
  'eql',
  'saved_query',
  'threshold',
  'threat_match',
  'new_terms',
  'esql',
] as const;

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
  runId: string;
}): Promise<void> => {
  const { index, esClient, docBodyOverrides, runId } = params;
  const docTimestamp = new Date(Date.now() - 60_000).toISOString();

  await esClient.indices.delete({ index }, { ignore: [404] });
  await esClient.indices.create({ index, mappings: CPS_DETECTION_TEST_INDEX_MAPPINGS });

  const body = {
    '@timestamp': docTimestamp,
    cps_run_id: runId,
    'cps.detection.test.run_id': runId,
    'host.name': 'hostname',
    ...docBodyOverrides,
  };

  await esClient.index({
    index,
    refresh: 'wait_for',
    body,
  });
};

const seedThreatMatchCluster = async (params: {
  index: string;
  esClient: EsClient;
  runId: string;
  hostName: string;
}): Promise<void> => {
  const { index, esClient, runId, hostName } = params;
  const docTimestamp = new Date(Date.now() - 60_000).toISOString();

  await esClient.indices.delete({ index }, { ignore: [404] });
  await esClient.indices.create({ index, mappings: CPS_DETECTION_TEST_INDEX_MAPPINGS });

  await esClient.index({
    index,
    refresh: 'wait_for',
    body: {
      '@timestamp': docTimestamp,
      cps_run_id: runId,
      'cps.detection.test.run_id': runId,
      'event.kind': 'event',
      'host.name': hostName,
    },
  });

  await esClient.index({
    index,
    refresh: 'wait_for',
    body: {
      '@timestamp': docTimestamp,
      cps_run_id: runId,
      'cps.detection.test.run_id': runId,
      'event.kind': 'indicator',
      'threat.indicator': {
        host: { name: hostName },
      },
    },
  });
};

const seedCpsDocuments = async (params: {
  ruleType: CpsRuleCompatibilityType;
  testIndex: string;
  runId: string;
  esClient: EsClient;
  linkedEs: EsClient;
}): Promise<void> => {
  const { ruleType, testIndex, runId, esClient, linkedEs } = params;

  if (ruleType === 'threat_match') {
    await seedThreatMatchCluster({
      index: testIndex,
      esClient,
      runId,
      hostName: CPS_ORIGIN_HOST,
    });
    await seedThreatMatchCluster({
      index: testIndex,
      esClient: linkedEs,
      runId,
      hostName: CPS_LINKED_HOST,
    });
    return;
  }

  await createSimpleTestIndex({
    index: testIndex,
    esClient,
    runId,
    docBodyOverrides: {
      'host.name': CPS_ORIGIN_HOST,
    },
  });
  await createSimpleTestIndex({
    index: testIndex,
    esClient: linkedEs,
    runId,
    docBodyOverrides: {
      'host.name': CPS_LINKED_HOST,
    },
  });
};

const buildRulePreviewBody = (params: {
  ruleType: CpsRuleCompatibilityType;
  runId: string;
  testIndex: string;
  timeframeEnd: string;
}): Record<string, unknown> => {
  const { ruleType, runId, testIndex, timeframeEnd } = params;

  const baseFields = {
    name: `CPS detection preview ${ruleType} ${runId}`,
    description: `Scout CPS scope validation for ${ruleType} rule`,
    risk_score: 21,
    severity: 'low',
    rule_id: `cps-de-${ruleType}-${runId}`,
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
  };

  const kqlRunFilter = `cps_run_id: "${runId}"`;

  switch (ruleType) {
    case 'query':
      return {
        ...baseFields,
        type: 'query',
        index: [testIndex],
        query: kqlRunFilter,
        language: 'kuery',
      };
    case 'eql':
      return {
        ...baseFields,
        type: 'eql',
        language: 'eql',
        index: [testIndex],
        query: `any where cps_run_id == "${runId}"`,
      };
    case 'saved_query':
      return {
        ...baseFields,
        type: 'saved_query',
        saved_id: 'does-not-exist-scout-cps-saved-query',
        query: kqlRunFilter,
        language: 'kuery',
        index: [testIndex],
      };
    case 'threshold':
      return {
        ...baseFields,
        type: 'threshold',
        language: 'kuery',
        index: [testIndex],
        query: kqlRunFilter,
        threshold: {
          field: 'host.name',
          value: 1,
        },
      };
    case 'threat_match':
      return {
        ...baseFields,
        type: 'threat_match',
        language: 'kuery',
        index: [testIndex],
        query: `${kqlRunFilter} and event.kind: event`,
        threat_query: `${kqlRunFilter} and event.kind: indicator`,
        threat_language: 'kuery',
        threat_index: [testIndex],
        threat_indicator_path: DEFAULT_INDICATOR_SOURCE_PATH,
        threat_mapping: [
          {
            entries: [
              {
                field: 'host.name',
                // `value` is the full threat-index field path (not a path relative to threat_indicator_path).
                value: 'threat.indicator.host.name',
                type: 'mapping',
              },
            ],
          },
        ],
      };
    case 'new_terms':
      return {
        ...baseFields,
        type: 'new_terms',
        language: 'kuery',
        index: [testIndex],
        query: kqlRunFilter,
        new_terms_fields: ['host.name'],
        history_window_start: 'now-30d',
      };
    case 'esql':
      return {
        ...baseFields,
        type: 'esql',
        language: 'esql',
        query: `from "${testIndex}" metadata _id, _index, _version | where cps_run_id == "${runId}"`,
      };
    default: {
      const exhaustive: never = ruleType;
      return exhaustive;
    }
  }
};

const getExpectedHostNames = (params: {
  routing: 'origin' | 'all_projects';
}): { expectedCount: number; expectedSortedHosts: string[] } => {
  if (params.routing === 'origin') {
    return { expectedCount: 1, expectedSortedHosts: [CPS_ORIGIN_HOST] };
  }
  return {
    expectedCount: 2,
    expectedSortedHosts: [CPS_LINKED_HOST, CPS_ORIGIN_HOST].sort(),
  };
};

const fetchPreviewAlertHostNames = async (params: {
  esClient: EsClient;
  previewId: string;
  spaceId: string;
}): Promise<string[]> => {
  const { esClient, previewId, spaceId } = params;
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

  return alertSearch.hits.hits
    .map((hit) => (hit._source as Record<string, unknown> | undefined)?.['host.name'])
    .filter((v): v is string => typeof v === 'string');
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

    for (const ruleType of CPS_RULE_COMPATIBILITY_TYPES) {
      apiTest(
        `${ruleType} rule preview matches data in the origin project only when the space routes to origin`,
        async ({ apiClient, config, esClient, log, samlAuth }) => {
          const credentials = await samlAuth.asInteractiveUser('admin');
          const headers: Record<string, string> = {
            ...credentials.cookieHeader,
            ...COMMON_HEADERS,
          };

          const runId = randomUUID();
          const spaceId = `cps-de-${ruleType}-${runId.slice(0, 8)}`;
          const testIndex = `scout-${spaceId}`;
          const linkedEs = getLinkedEsClient(config, log);

          await createKibanaSpace({
            apiClient,
            spaceId,
            headers,
            projectRouting: SPACE_PROJECT_ROUTING_ORIGIN_ONLY,
          });

          try {
            await seedCpsDocuments({
              ruleType,
              testIndex,
              runId,
              esClient,
              linkedEs,
            });

            const timeframeEnd = new Date().toISOString();

            const previewResponse = await apiClient.post(
              `s/${spaceId}${DETECTION_ENGINE_RULES_PREVIEW}`,
              {
                headers,
                responseType: 'json',
                body: buildRulePreviewBody({ ruleType, runId, testIndex, timeframeEnd }),
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
            const { expectedCount, expectedSortedHosts } = getExpectedHostNames({
              routing: 'origin',
            });

            const hostNames = (
              await fetchPreviewAlertHostNames({ esClient, previewId, spaceId })
            ).sort();
            expect(hostNames).toHaveLength(expectedCount);
            expect(hostNames).toStrictEqual(expectedSortedHosts);
          } finally {
            await esClient.indices.delete({ index: testIndex }, { ignore: [404] });
            await linkedEs.indices.delete({ index: testIndex }, { ignore: [404] });
            await apiClient.delete(`api/spaces/space/${spaceId}`, { headers });
          }
        }
      );

      apiTest(
        `${ruleType} rule preview matches data in origin and linked projects when the space uses all-projects routing`,
        async ({ apiClient, config, esClient, log, samlAuth }) => {
          const credentials = await samlAuth.asInteractiveUser('admin');
          const headers: Record<string, string> = {
            ...credentials.cookieHeader,
            ...COMMON_HEADERS,
          };

          const runId = randomUUID();
          const spaceId = `cps-de-${ruleType}-all-${runId.slice(0, 8)}`;
          const testIndex = `scout-${spaceId}`;
          const linkedEs = getLinkedEsClient(config, log);

          await createKibanaSpace({
            apiClient,
            spaceId,
            headers,
            projectRouting: SPACE_PROJECT_ROUTING_ALL,
          });

          try {
            await seedCpsDocuments({
              ruleType,
              testIndex,
              runId,
              esClient,
              linkedEs,
            });

            const timeframeEnd = new Date().toISOString();

            const previewResponse = await apiClient.post(
              `s/${spaceId}${DETECTION_ENGINE_RULES_PREVIEW}`,
              {
                headers,
                responseType: 'json',
                body: buildRulePreviewBody({ ruleType, runId, testIndex, timeframeEnd }),
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
            const { expectedCount, expectedSortedHosts } = getExpectedHostNames({
              routing: 'all_projects',
            });

            const hostNames = (
              await fetchPreviewAlertHostNames({ esClient, previewId, spaceId })
            ).sort();
            expect(hostNames).toHaveLength(expectedCount);
            expect(hostNames).toStrictEqual(expectedSortedHosts);
          } finally {
            await esClient.indices.delete({ index: testIndex }, { ignore: [404] });
            await linkedEs.indices.delete({ index: testIndex }, { ignore: [404] });
            await apiClient.delete(`api/spaces/space/${spaceId}`, { headers });
          }
        }
      );
    }
  }
);
