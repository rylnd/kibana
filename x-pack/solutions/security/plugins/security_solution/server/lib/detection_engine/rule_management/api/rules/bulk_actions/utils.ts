/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScheduleBackfillResults } from '@kbn/alerting-plugin/server/application/backfill/methods/schedule/types';
import type { BulkOperationError } from '@kbn/alerting-plugin/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import type { RuleDetailsInError } from '../../../../../../../common/api/detection_engine';
import type {
  BulkActionsDryRunErrCode,
  NormalizedRuleError,
} from '../../../../../../../common/api/detection_engine/rule_management';
import type { PromisePoolError } from '../../../../../../utils/promise_pool';
import type { RuleAlertType } from '../../../../rule_schema';
import type { DryRunError } from '../../../logic/bulk_actions/dry_run';

interface HandleScheduleBackfillResultsParams {
  rules: RuleAlertType[];
  results: ScheduleBackfillResults;
}

interface HandleScheduleBackfillResultsOutcome {
  backfilled: RuleAlertType[];
  errors: Array<PromisePoolError<RuleAlertType, Error> | BulkOperationError>;
}

export const handleScheduleBackfillResults = ({
  results,
  rules,
}: HandleScheduleBackfillResultsParams): HandleScheduleBackfillResultsOutcome => {
  const errors: Array<PromisePoolError<RuleAlertType, Error> | BulkOperationError> = [];
  return results.reduce(
    (acc, backfillResult) => {
      if ('error' in backfillResult) {
        const ruleName = rules.find((rule) => rule.id === backfillResult.error.rule.id)?.name;
        const backfillError = backfillResult.error;
        const backfillRule = backfillError.rule;
        const error = {
          message: backfillError.message,
          status: backfillError.status,
          rule: { id: backfillRule.id, name: backfillRule.name ?? ruleName ?? '' },
        };
        acc.errors.push(error);
      } else {
        const backfillRule = rules.find((rule) => rule.id === backfillResult.rule.id);
        if (backfillRule) {
          acc.backfilled.push(backfillRule);
        }
      }
      return acc;
    },
    { backfilled: [], errors } as HandleScheduleBackfillResultsOutcome
  );
};

export type BulkActionError =
  | PromisePoolError<string>
  | PromisePoolError<RuleAlertType>
  | BulkOperationError;

/**
 * Normalize different error types (PromisePoolError<string> | PromisePoolError<RuleAlertType> | BulkOperationError)
 * to one common used in NormalizedRuleError
 * @param error BulkActionError
 */
export const normalizeBulkActionError = (errorObj: BulkActionError): NormalizedRuleError => {
  let message: string;
  let statusCode: number = 500;
  let errorCode: BulkActionsDryRunErrCode | undefined;
  let rule: RuleDetailsInError;

  if ('rule' in errorObj) {
    rule = errorObj.rule;
    message = errorObj.message;
  } else {
    const { error, item } = errorObj;
    const transformedError =
      error instanceof Error ? transformError(error) : { message: String(error), statusCode: 500 };

    errorCode = (error as DryRunError)?.errorCode;
    message = transformedError.message;
    statusCode = transformedError.statusCode;
    // The promise pool item is either a rule ID string or a rule object. We have
    // string IDs when we fail to fetch rules. Rule objects come from other
    // situations when we found a rule but failed somewhere else.
    rule = typeof item === 'string' ? { id: item } : { id: item.id, name: item.name };
  }

  return {
    message,
    status_code: statusCode,
    err_code: errorCode,
    rules: [rule],
  };
};
