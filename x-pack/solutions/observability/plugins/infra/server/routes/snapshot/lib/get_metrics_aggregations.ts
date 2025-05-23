/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { JsonObject } from '@kbn/utility-types';
import type {
  InventoryItemType,
  MetricsUIAggregation,
} from '@kbn/metrics-data-access-plugin/common';
import { findInventoryModel } from '@kbn/metrics-data-access-plugin/common';
import { networkTraffic } from '@kbn/metrics-data-access-plugin/common';
import type { SnapshotMetricInput, SnapshotRequest } from '../../../../common/http_api';
import { SnapshotCustomMetricInputRT } from '../../../../common/http_api';
import type { InfraSourceConfiguration } from '../../../lib/sources';

export interface InfraSnapshotRequestOptions
  extends Omit<SnapshotRequest, 'sourceId' | 'filterQuery'> {
  sourceConfiguration: InfraSourceConfiguration;
  filterQuery: JsonObject | undefined;
}

export const metricToAggregation = (
  nodeType: InventoryItemType,
  metric: SnapshotMetricInput,
  index: number
) => {
  const inventoryModel = findInventoryModel(nodeType);
  if (SnapshotCustomMetricInputRT.is(metric)) {
    if (metric.aggregation === 'rate') {
      return networkTraffic(`custom_${index}`, metric.field);
    }
    return {
      [`custom_${index}`]: {
        [metric.aggregation]: {
          field: metric.field,
        },
      },
    };
  }
  return inventoryModel.metrics.snapshot?.[metric.type];
};

export const getMetricsAggregations = (
  options: InfraSnapshotRequestOptions
): MetricsUIAggregation => {
  const { metrics } = options;
  return metrics.reduce((aggs, metric, index) => {
    const aggregation = metricToAggregation(options.nodeType, metric, index);
    if (!aggregation) {
      throw new Error(
        i18n.translate('xpack.infra.snapshot.missingSnapshotMetricError', {
          defaultMessage: 'The aggregation for {metric} for {nodeType} is not available.',
          values: {
            nodeType: options.nodeType,
            metric: metric.type,
          },
        })
      );
    }
    return Object.assign(aggs, aggregation);
  }, {});
};
