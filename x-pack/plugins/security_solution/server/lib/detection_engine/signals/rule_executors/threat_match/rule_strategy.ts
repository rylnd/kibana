/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_SEARCH_AFTER_PAGE_SIZE } from '../../../../../../common/constants';
import { RuleTypeParams } from '../../../types';
import { getInputIndex } from '../../get_input_output_index';
import { buildRuleMessageFactory } from '../../rule_messages';
import { singleBulkCreate } from '../../single_bulk_create';
import { buildThreatEnrichment } from '../../threat_mapping/build_threat_enrichment';
import { buildThreatSignals } from '../../threat_mapping/build_threat_signals';
import { RuleAlertAttributes } from '../../types';
import { getExceptions } from '../../utils';
import { RuleExecutionContext, RuleStrategy } from '.././types';

export const buildThreatMatchStrategy: (
  params: RuleTypeParams,
  context: RuleExecutionContext
) => RuleStrategy = (params, context) => {
  return {
    query: async () => {
      const {
        ruleId,
        index,
        filters,
        language,
        maxSignals,
        outputIndex,
        savedId,
        query,
        threatFilters,
        threatQuery,
        threatIndex,
        threatMapping,
        threatLanguage,
        type,
        exceptionsList,
        concurrentSearches,
        itemsPerSearch,
      } = params;
      const {
        alertId,
        eventsTelemetry,
        exceptionListClient,
        gap,
        listClient,
        logger,
        previousStartedAt,
        services,
        version,
      } = context;

      if (threatQuery == null || threatIndex == null || threatMapping == null || query == null) {
        throw new Error(
          [
            'Indicator match is missing threatQuery and/or threatIndex and/or threatMapping:',
            `threatQuery: "${threatQuery}"`,
            `threatIndex: "${threatIndex}"`,
            `threatMapping: "${threatMapping}"`,
          ].join(' ')
        );
      }

      const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);
      const savedObject = await services.savedObjectsClient.get<RuleAlertAttributes>(
        'alert',
        alertId
      );
      const {
        actions,
        name,
        tags,
        createdAt,
        createdBy,
        updatedBy,
        enabled,
        schedule: { interval },
        throttle,
      } = savedObject.attributes;
      const updatedAt = savedObject.updated_at ?? '';
      const refresh = actions.length ? 'wait_for' : false;
      const exceptionItems = await getExceptions({
        client: exceptionListClient,
        lists: exceptionsList ?? [],
      });
      const buildRuleMessage = buildRuleMessageFactory({
        id: alertId,
        ruleId,
        name,
        index: outputIndex,
      });

      const inputIndex = await getInputIndex(services, version, index);
      const queryResult = await buildThreatSignals({
        threatMapping,
        query,
        inputIndex,
        type,
        filters: filters ?? [],
        language,
        name,
        savedId,
        services,
        exceptionItems: exceptionItems ?? [],
        gap,
        previousStartedAt,
        listClient,
        logger,
        eventsTelemetry,
        alertId,
        outputIndex,
        params,
        searchAfterSize,
        actions,
        createdBy,
        createdAt,
        updatedBy,
        interval,
        updatedAt,
        enabled,
        refresh,
        tags,
        throttle,
        threatFilters: threatFilters ?? [],
        threatQuery,
        threatLanguage,
        buildRuleMessage,
        threatIndex,
        concurrentSearches: concurrentSearches ?? 1,
        itemsPerSearch: itemsPerSearch ?? 9000,
      });

      console.log('queryResult', JSON.stringify(queryResult.signals, null, 2));
      return queryResult;
    },
    index: async (queryResult) => {
      const {
        exceptionsList,
        outputIndex,
        threatFilters,
        threatIndex,
        threatIndicatorPath,
        threatLanguage,
        threatQuery,
      } = params;
      const {
        alertId,
        eventsTelemetry,
        exceptionListClient,
        gap,
        listClient,
        logger,
        previousStartedAt,
        services,
        version,
      } = context;
      if (threatQuery == null || threatIndex == null) {
        throw new Error(
          [
            'Indicator match is missing threatQuery and/or threatIndex:',
            `threatQuery: "${threatQuery}"`,
            `threatIndex: "${threatIndex}"`,
          ].join(' ')
        );
      }

      // TODO add this as a wrapper around the index function
      // sendAlertTelemetryEvents(
      //   logger,
      //   eventsTelemetry,
      //   filteredEvents,
      //   ruleParams,
      //   buildRuleMessage
      // );

      const savedObject = await services.savedObjectsClient.get<RuleAlertAttributes>(
        'alert',
        alertId
      );
      const {
        actions,
        name,
        tags,
        createdAt,
        createdBy,
        updatedBy,
        enabled,
        schedule: { interval },
        throttle,
      } = savedObject.attributes;
      const updatedAt = savedObject.updated_at ?? '';
      const refresh = actions.length ? 'wait_for' : false;
      const buildRuleMessage = buildRuleMessageFactory({
        id: alertId,
        ruleId: params.ruleId,
        name,
        index: outputIndex,
      });

      const exceptionItems = await getExceptions({
        client: exceptionListClient,
        lists: exceptionsList ?? [],
      });
      const threatEnrichment = buildThreatEnrichment({
        buildRuleMessage,
        exceptionItems: exceptionItems ?? [],
        listClient,
        logger,
        services,
        threatFilters: threatFilters ?? [],
        threatIndex,
        threatIndicatorPath,
        threatLanguage,
        threatQuery,
      });

      const enrichedSignals = await threatEnrichment(queryResult.signals);

      const {
        bulkCreateDuration,
        createdItems,
        createdItemsCount,
        errors,
        success,
      } = await singleBulkCreate({
        buildRuleMessage,
        filteredEvents: enrichedSignals,
        ruleParams: params,
        services,
        logger,
        id: alertId,
        signalsIndex: outputIndex,
        actions,
        name,
        createdAt,
        createdBy,
        updatedAt,
        updatedBy,
        interval,
        enabled,
        refresh,
        tags,
        throttle,
      });

      return {
        bulkCreateTimes: bulkCreateDuration ? [bulkCreateDuration] : [],
        createdSignals: createdItems,
        createdSignalsCount: createdItemsCount,
        errors,
        success,
      };
    },
  };
};
