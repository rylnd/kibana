/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import chunk from 'lodash/fp/chunk';
import { getThreatList, getThreatListCount } from './get_threat_list';

import { CreateThreatSignalsOptions } from './types';
import { buildRuleQueryResult, combineConcurrentQueryResults, combineQueryResults } from './utils';
import { buildThreatSignal } from './build_threat_signal';
import { RuleQueryResult } from '../rule_executors/types';

export const buildThreatSignals = async ({
  threatMapping,
  query,
  inputIndex,
  type,
  filters,
  language,
  savedId,
  services,
  exceptionItems,
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
  threatFilters,
  threatQuery,
  threatLanguage,
  buildRuleMessage,
  threatIndex,
  name,
  concurrentSearches,
  itemsPerSearch,
}: CreateThreatSignalsOptions): Promise<RuleQueryResult> => {
  logger.debug(buildRuleMessage('Indicator matching rule starting'));
  const perPage = concurrentSearches * itemsPerSearch;

  let result = buildRuleQueryResult();

  let threatListCount = await getThreatListCount({
    callCluster: services.callCluster,
    exceptionItems,
    threatFilters,
    query: threatQuery,
    language: threatLanguage,
    index: threatIndex,
  });
  logger.debug(buildRuleMessage(`Total indicator items: ${threatListCount}`));

  let threatList = await getThreatList({
    callCluster: services.callCluster,
    exceptionItems,
    threatFilters,
    query: threatQuery,
    language: threatLanguage,
    index: threatIndex,
    listClient,
    searchAfter: undefined,
    sortField: undefined,
    sortOrder: undefined,
    logger,
    buildRuleMessage,
    perPage,
  });

  while (threatList.hits.hits.length !== 0) {
    const chunks = chunk(itemsPerSearch, threatList.hits.hits);
    logger.debug(buildRuleMessage(`${chunks.length} concurrent indicator searches are starting.`));
    const concurrentSearchesPerformed = chunks.map<Promise<RuleQueryResult>>((slicedChunk) =>
      buildThreatSignal({
        threatMapping,
        query,
        inputIndex,
        type,
        filters,
        language,
        savedId,
        services,
        exceptionItems,
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
        updatedAt,
        interval,
        enabled,
        tags,
        refresh,
        throttle,
        buildRuleMessage,
        name,
        currentThreatList: slicedChunk,
        currentResult: result,
      })
    );
    const searchesPerformed = await Promise.all(concurrentSearchesPerformed);
    const searchResult = combineConcurrentQueryResults(searchesPerformed);
    result = combineQueryResults([result, searchResult]);
    threatListCount -= threatList.hits.hits.length;
    logger.debug(
      buildRuleMessage(
        `Concurrent indicator match searches completed with ${result.signalsCount} signals found`,
        `search times of ${result.searchAfterTimes}ms,`,
        `all successes are ${result.success}`
      )
    );
    if (result.signalsCount >= params.maxSignals) {
      logger.debug(
        buildRuleMessage(
          `Indicator match has reached its max signals count ${params.maxSignals}. Additional indicator items not checked are ${threatListCount}`
        )
      );
      break;
    }
    logger.debug(buildRuleMessage(`Indicator items left to check are ${threatListCount}`));

    threatList = await getThreatList({
      callCluster: services.callCluster,
      exceptionItems,
      query: threatQuery,
      language: threatLanguage,
      threatFilters,
      index: threatIndex,
      searchAfter: threatList.hits.hits[threatList.hits.hits.length - 1].sort,
      sortField: undefined,
      sortOrder: undefined,
      listClient,
      buildRuleMessage,
      logger,
      perPage,
    });
  }

  logger.debug(buildRuleMessage('Indicator matching rule has completed'));
  return result;
};
