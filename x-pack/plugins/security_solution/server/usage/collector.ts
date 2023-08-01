/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CollectorFetchContext } from '@kbn/usage-collection-plugin/server';

import type { CollectorDependencies, DashboardMetrics } from './types';
import type { RiskEngineMetrics } from './risk_engine';
import { getRiskEngineMetrics, riskEngineMetricsSchema } from './risk_engine';
import type { DetectionMetrics } from './detections/types';
import { getDetectionsMetrics } from './detections/get_metrics';
import { getInternalSavedObjectsClient } from './get_internal_saved_objects_client';
import { getEndpointMetrics } from './endpoint/get_metrics';
import { getDashboardMetrics } from './dashboards/get_dashboards_metrics';
import { detectionsMetricsSchema } from './detections/metrics_schema';

export type RegisterCollector = (deps: CollectorDependencies) => void;

export interface UsageData {
  detectionMetrics: DetectionMetrics;
  endpointMetrics: {};
  dashboardMetrics: DashboardMetrics;
  riskEngineMetrics: RiskEngineMetrics;
}

export const registerCollector: RegisterCollector = ({
  core,
  eventLogIndex,
  signalsIndex,
  ml,
  usageCollection,
  logger,
}) => {
  if (!usageCollection) {
    logger.debug('Usage collection is undefined, therefore returning early without registering it');
    return;
  }

  const collector = usageCollection.makeUsageCollector<UsageData>({
    type: 'security_solution',
    schema: {
      detectionMetrics: detectionsMetricsSchema,
      endpointMetrics: {
        unique_endpoint_count: {
          type: 'long',
          _meta: { description: 'Number of active unique endpoints in last 24 hours' },
        },
      },
      dashboardMetrics: {
        dashboard_tag: {
          created_at: {
            type: 'keyword',
            _meta: { description: 'The time the tab was created' },
          },
          linked_dashboards_count: {
            type: 'long',
            _meta: { description: 'Number of associated dashboards' },
          },
        },
        dashboards: {
          type: 'array',
          items: {
            created_at: {
              type: 'keyword',
              _meta: { description: 'The time the dashboard was created' },
            },
            dashboard_id: {
              type: 'keyword',
              _meta: { description: 'The dashboard saved object id' },
            },
            error_message: {
              type: 'keyword',
              _meta: { description: 'The relevant error message' },
            },
            error_status_code: {
              type: 'long',
              _meta: { description: 'The relevant error status code' },
            },
          },
        },
      },
      riskEngineMetrics: riskEngineMetricsSchema,
    },
    isReady: () => true,
    fetch: async ({ esClient }: CollectorFetchContext): Promise<UsageData> => {
      const savedObjectsClient = await getInternalSavedObjectsClient(core);
      const [detectionMetrics, endpointMetrics, dashboardMetrics, riskEngineMetrics] =
        await Promise.allSettled([
          getDetectionsMetrics({
            eventLogIndex,
            signalsIndex,
            esClient,
            savedObjectsClient,
            logger,
            mlClient: ml,
          }),
          getEndpointMetrics({ esClient, logger }),
          getDashboardMetrics({
            savedObjectsClient,
            logger,
          }),
          getRiskEngineMetrics({ esClient, savedObjectsClient, logger }),
        ]);
      return {
        detectionMetrics: detectionMetrics.status === 'fulfilled' ? detectionMetrics.value : {},
        endpointMetrics: endpointMetrics.status === 'fulfilled' ? endpointMetrics.value : {},
        dashboardMetrics: dashboardMetrics.status === 'fulfilled' ? dashboardMetrics.value : {},
        riskEngineMetrics: riskEngineMetrics.status === 'fulfilled' ? riskEngineMetrics.value : {},
      };
    },
  });

  usageCollection.registerCollector(collector);
};
