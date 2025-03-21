/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import type { IndexPattern, Threshold, Timerange } from './create_lens_definition';
import { createLensDefinitionForRatioChart } from './create_lens_definition';

interface LogThresholdRatioChartProps {
  index: IndexPattern;
  threshold: Threshold;
  timeRange: { from: string; to: string };
  alertRange: Timerange;
  numeratorKql: string;
  denominatorKql: string;
  height: number;
  interval?: string;
  filter?: string;
}

export function LogThresholdRatioChart({
  numeratorKql,
  denominatorKql,
  index,
  threshold,
  timeRange,
  alertRange,
  height,
  interval = 'auto',
  filter = '',
}: LogThresholdRatioChartProps) {
  const {
    lens: { EmbeddableComponent },
  } = useKibanaContextForPlugin().services;
  const { euiTheme } = useEuiTheme();
  const lensDef = createLensDefinitionForRatioChart(
    index,
    euiTheme,
    numeratorKql,
    denominatorKql,
    threshold,
    alertRange,
    interval,
    filter
  );
  return (
    <div>
      <EmbeddableComponent
        id="logThresholdRatioChart"
        style={{ height }}
        timeRange={timeRange}
        attributes={lensDef}
        viewMode={'view'}
        noPadding
      />
    </div>
  );
}
