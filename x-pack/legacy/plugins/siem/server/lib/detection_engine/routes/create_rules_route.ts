/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { schema } from '@kbn/config-schema';
import { CoreSetup } from 'src/core/server';
import { ensureRawRequest } from 'src/core/server/http/router';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import { createRules } from '../alerts/create_rules';
import { readRules } from '../alerts/read_rules';
import { transformAlertToRule } from './utils';
import { ServerFacade } from '../../../types';
import { isAlertType } from '../alerts/types';

const body = schema.object({
  description: schema.string(),
  enabled: schema.boolean({ defaultValue: true }),
  false_positives: schema.arrayOf(schema.string(), { defaultValue: [] }),
  filter: schema.object({}),
  filters: schema.arrayOf(schema.object({})),
  from: schema.string(),
  immutable: schema.boolean({ defaultValue: false }),
  index: schema.arrayOf(schema.string()),
  interval: schema.string({ defaultValue: '5m' }),
  language: schema.string(),
  max_signals: schema.number({ min: 0, defaultValue: 100 }),
  meta: schema.object({}),
  name: schema.string(),
  output_index: schema.string(),
  query: schema.string(),
  references: schema.arrayOf(schema.string()),
  risk_score: schema.number({ min: 0, max: 100 }),
  rule_id: schema.string(),
  saved_id: schema.string(),
  severity: schema.string(),
  size: schema.number(),
  tags: schema.arrayOf(schema.string()),
  threats: schema.arrayOf(
    schema.object({
      framework: schema.string(),
      tactic: schema.object({
        id: schema.string(),
        name: schema.string(),
        reference: schema.string(),
      }),
      technique: schema.object({
        id: schema.string(),
        name: schema.string(),
        reference: schema.string(),
      }),
    })
  ),
  to: schema.string(),
  type: schema.oneOf([
    schema.literal('filter'),
    schema.literal('query'),
    schema.literal('saved_query'),
  ]),
});

export const createRulesRoute = (core: CoreSetup, __legacy: ServerFacade): void => {
  const router = core.http.createRouter();

  router.post(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: { body },
      options: {
        tags: ['access:siem'],
      },
    },
    async (context, request, response) => {
      const {
        description,
        enabled,
        false_positives: falsePositives,
        filter,
        from,
        immutable,
        query,
        language,
        output_index: outputIndex,
        saved_id: savedId,
        meta,
        filters,
        rule_id: ruleId,
        index,
        interval,
        max_signals: maxSignals,
        risk_score: riskScore,
        name,
        severity,
        tags,
        threats,
        to,
        type,
        references,
      } = request.body;

      const alertsClient = __legacy.plugins.alerting!.start.getAlertsClientWithRequest(
        ensureRawRequest(request)
      );
      const actionsClient = null;

      if (!alertsClient || !actionsClient) {
        return response.notFound();
      }

      try {
        if (ruleId != null) {
          const rule = await readRules({ alertsClient, ruleId });
          if (rule != null) {
            return response.conflict({
              body: `rule_id ${ruleId} already exists`,
            });
          }
        }

        const createdRule = await createRules({
          alertsClient,
          actionsClient,
          description,
          enabled,
          falsePositives,
          filter,
          from,
          immutable,
          query,
          language,
          outputIndex,
          savedId,
          meta,
          filters,
          ruleId: ruleId != null ? ruleId : uuid.v4(),
          index,
          interval,
          maxSignals,
          riskScore,
          name,
          severity,
          tags,
          to,
          type,
          threats,
          references,
        });

        if (isAlertType(createdRule)) {
          return response.ok({ body: transformAlertToRule(createdRule) });
        }

        return response.internalError({ body: 'Internal error transforming' });
      } catch (err) {
        return response.internalError({ body: err.message });
      }
    }
  );
};
