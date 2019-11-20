/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isFunction } from 'lodash/fp';
import Boom from 'boom';
import uuid from 'uuid';
import { schema, TypeOf } from '@kbn/config-schema';
import { CoreSetup } from 'src/core/server';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';
import { createSignals } from '../alerts/create_signals';
import { isAlertType, SignalsRequest } from '../alerts/types';
import { createSignalsSchema } from './schemas';
import { readSignals } from '../alerts/read_signals';
import { transformAlertToSignal } from './utils';

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
  name: schema.string(),
  query: schema.string(),
  references: schema.arrayOf(schema.string()),
  rule_id: schema.string(),
  saved_id: schema.string(),
  severity: schema.string(),
  size: schema.number(),
  tags: schema.arrayOf(schema.string()),
  to: schema.string(),
  type: schema.oneOf([
    schema.literal('filter'),
    schema.literal('query'),
    schema.literal('saved_query'),
  ]),
});

export const createSignalsRoute = (core: CoreSetup) => {
  const router = core.http.createRouter();

  router.post(
    {
      path: DETECTION_ENGINE_RULES_URL,
      validate: { body },
      options: {
        tags: ['access:signals-all'],
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
        saved_id: savedId,
        filters,
        rule_id: ruleId,
        index,
        interval,
        max_signals: maxSignals,
        name,
        severity,
        size,
        tags,
        to,
        type,
        references,
      } = request.body;

      const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
      const actionsClient = isFunction(request.getActionsClient)
        ? request.getActionsClient()
        : null;

      if (!alertsClient || !actionsClient) {
        return response.notFound();
      }

      // if (ruleId != null) {
      //   const signal = await readSignals({ alertsClient, ruleId });
      //   if (signal != null) {
      //     return new Boom(`Signal rule_id ${ruleId} already exists`, { statusCode: 409 });
      //   }
      // }
      const createdSignal = await createSignals({
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
        savedId,
        filters,
        ruleId: ruleId != null ? ruleId : uuid.v4(),
        index,
        interval,
        maxSignals,
        name,
        severity,
        size,
        tags,
        to,
        type,
        references,
      });

      if (isAlertType(createdSignal)) {
        return response.ok({ body: transformAlertToSignal(createdSignal) });
      }

      return response.internalError({ body: 'Internal error transforming' });
    }
  );
};
