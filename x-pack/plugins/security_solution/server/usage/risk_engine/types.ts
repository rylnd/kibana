/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RiskEngineMetrics {
  risk_engine?: {
    enabled: number;
    executions: number;
    failed_executions: number;
    avg_execution_duration: number;
    avg_entities_per_execution: number;
  };
  legacy_transforms?: {
    enabled: number;
  };
  risk_scores?: {
    avg_index_size: number;
    index_size: number;
    entities: number;
    avg_entities: number;
    entities_with_change: number;
    avg_entities_with_change: number;
  };
}
