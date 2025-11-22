/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionSkipResult } from '@kbn/alerting-plugin/common';
import type { IKibanaResponse, KibanaResponseFactory } from '@kbn/core/server';
import { truncate } from 'lodash';
import type {
  BulkEditActionResults,
  BulkEditActionSummary,
  NormalizedRuleError,
} from '../../../../../../../common/api/detection_engine';
import type {
  BulkActionType,
  BulkEditActionResponse,
} from '../../../../../../../common/api/detection_engine/rule_management';
import { BulkActionTypeEnum } from '../../../../../../../common/api/detection_engine/rule_management';
import type { RuleAlertType } from '../../../../rule_schema';
import { internalRuleToAPIResponse } from '../../../logic/detection_rules_client/converters/internal_rule_to_api_response';
import { type BulkActionError, normalizeBulkActionError } from './utils';

const MAX_ERROR_MESSAGE_LENGTH = 1000;

export const buildBulkResponse = (
  response: KibanaResponseFactory,
  {
    bulkAction,
    isDryRun = false,
    errors = [],
    updated = [],
    created = [],
    deleted = [],
    skipped = [],
  }: {
    bulkAction?: BulkActionType;
    isDryRun?: boolean;
    errors?: BulkActionError[];
    updated?: RuleAlertType[];
    created?: RuleAlertType[];
    deleted?: RuleAlertType[];
    skipped?: BulkActionSkipResult[];
  }
): IKibanaResponse<BulkEditActionResponse> => {
  const numSucceeded = updated.length + created.length + deleted.length;
  const numSkipped = skipped.length;
  const numFailed = errors.length;

  const summary: BulkEditActionSummary = {
    failed: numFailed,
    succeeded: numSucceeded,
    skipped: numSkipped,
    total: numSucceeded + numFailed + numSkipped,
  };

  // if response is for dry_run, empty lists of rules returned, as rules are not actually updated and stored within ES
  // thus, it's impossible to return reliably updated/duplicated/deleted rules
  const results: BulkEditActionResults = isDryRun
    ? {
        updated: [],
        created: [],
        deleted: [],
        skipped: [],
      }
    : {
        updated: updated.map((rule) => internalRuleToAPIResponse(rule)),
        created: created.map((rule) => internalRuleToAPIResponse(rule)),
        deleted: deleted.map((rule) => internalRuleToAPIResponse(rule)),
        skipped,
      };

  if (numFailed > 0) {
    let message = summary.succeeded > 0 ? 'Bulk edit partially failed' : 'Bulk edit failed';
    if (bulkAction === BulkActionTypeEnum.run) {
      message =
        summary.succeeded > 0
          ? 'Bulk manual rule run partially failed'
          : 'Bulk manual rule run failed';
    }

    const statusCode = getHighestStatusCodeFromErrors(errors);
    return response.custom<BulkEditActionResponse>({
      headers: { 'content-type': 'application/json' },
      body: {
        message,
        status_code: statusCode,
        attributes: {
          errors: normalizeErrorResponse(errors),
          results,
          summary,
        },
      },
      statusCode,
    });
  }

  const responseBody: BulkEditActionResponse = {
    success: true,
    rules_count: summary.total,
    attributes: { results, summary },
  };

  return response.ok({ body: responseBody });
};

export const normalizeErrorResponse = (errors: BulkActionError[]): NormalizedRuleError[] => {
  const errorsMap = new Map<string, NormalizedRuleError>();

  errors.forEach((errorObj) => {
    const {
      rules: [rule],
      message,
      status_code: statusCode,
      err_code: errorCode,
    } = normalizeBulkActionError(errorObj);

    if (errorsMap.has(message)) {
      errorsMap.get(message)?.rules.push(rule);
    } else {
      errorsMap.set(message, {
        message: truncate(message, { length: MAX_ERROR_MESSAGE_LENGTH }),
        status_code: statusCode,
        err_code: errorCode,
        rules: [rule],
      });
    }
  });

  return Array.from(errorsMap, ([_, normalizedError]) => normalizedError);
};

const getHighestStatusCodeFromErrors = (errors: BulkActionError[]) => {
  return Math.max(...errors.map((error) => normalizeBulkActionError(error).status_code));
};
