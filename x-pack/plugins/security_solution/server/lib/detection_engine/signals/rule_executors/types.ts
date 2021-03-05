/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Duration } from 'moment';

import { Logger } from 'src/core/server';
import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertServices,
} from '../../../../../../alerts/server';
import { ExceptionListClient, ListClient } from '../../../../../../lists/server';
import { TelemetryEventsSender } from '../../../telemetry/sender';
import { SignalHit, SignalSearchResponse } from '../types';

export interface RuleQueryResult {
  success: boolean;
  searchAfterTimes: string[];
  lastLookBackDate: Date | null | undefined;
  signalsCount: number;
  signals: SignalSearchResponse;
  errors: string[];
}

export interface RuleIndexResult {
  success: boolean;
  bulkCreateTimes: string[];
  createdSignalsCount: number;
  createdSignals: SignalHit[];
  errors: string[];
}
export interface RuleExecutorResult extends RuleQueryResult, RuleIndexResult {}

export interface RuleExecutionContext {
  alertId: string;
  exceptionListClient: ExceptionListClient;
  eventsTelemetry: TelemetryEventsSender | undefined;
  gap: Duration | null;
  listClient: ListClient;
  logger: Logger;
  previousStartedAt: Date | null;
  services: AlertServices<AlertInstanceState, AlertInstanceContext, 'default'>;
  version: string;
}

export interface RuleExecutor {
  execute: () => Promise<RuleExecutorResult>;
}

export interface RuleStrategy {
  query: () => Promise<RuleQueryResult>;
  index: (result: RuleQueryResult) => Promise<RuleIndexResult>;
}
