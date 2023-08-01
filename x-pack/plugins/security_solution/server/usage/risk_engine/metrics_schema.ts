/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { RiskEngineMetrics } from './types';

export const riskEngineMetricsSchema: MakeSchemaFrom<RiskEngineMetrics> = {
  risk_engine: {
    enabled: {
      type: 'long',
      _meta: { description: 'Number of spaces with the v1 Risk Engine enabled' },
    },
    executions: {
      type: 'long',
      _meta: {
        description: 'Total number of daily executions of the v1 Risk Engine task ',
      },
    },
    failed_executions: {
      type: 'long',
      _meta: {
        description: 'Total number of daily execution failures of the v1 Risk Engine task',
      },
    },
    avg_execution_duration: {
      type: 'long',
      _meta: { description: 'Daily average execution time (ms) of the v1 Risk Engine task' },
    },
    avg_entities_per_execution: {
      type: 'long',
      _meta: {
        description: 'Average number entities calculated per execution of the v1 Risk Engine task',
      },
    },
  },
  legacy_transforms: {
    enabled: {
      type: 'long',
      _meta: {
        description: 'Number of spaces with the legacy, transform-based Risk Engine enabled',
      },
    },
  },
  risk_scores: {
    avg_index_size: {
      type: 'long',
      _meta: {
        description: 'Average size of the Risk Score indices (MB)',
      },
    },
    index_size: {
      type: 'long',
      _meta: {
        description: 'Total size of the Risk Score indices (MB)',
      },
    },
    avg_entities: {
      type: 'long',
      _meta: {
        description: 'Average number of entities per Risk Score index',
      },
    },
    entities: {
      type: 'long',
      _meta: {
        description: 'Total number of entities across all Risk Score indices',
      },
    },
    avg_entities_with_change: {
      type: 'long',
      _meta: {
        description:
          'Average number of entities per Risk Score index whose score has changed since the last calculation',
      },
    },
    entities_with_change: {
      type: 'long',
      _meta: {
        description: 'Total number of entities whose score has changed since the last calculation',
      },
    },
  },
};
