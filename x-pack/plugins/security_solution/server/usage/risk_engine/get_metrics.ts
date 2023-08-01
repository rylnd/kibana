/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { RiskEngineMetrics } from './types';

export interface GetRiskEngineMetricsOptions {
  dataViewId: string;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export const getRiskEngineMetrics = async ({
  dataViewId,
  esClient,
  savedObjectsClient,
  logger,
}: GetRiskEngineMetricsOptions): Promise<RiskEngineMetrics> => {};
