/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import dateMath from '@kbn/datemath';
import type { CoreStart, ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { Filter } from '@kbn/es-query';
import type { DataViewAttributes } from '@kbn/data-views-plugin/common';
import type {
  RuleQueryInspectorHandler,
  RuleQueryInspectorResponse,
} from '@kbn/alerting-plugin/server';
import type { ListPluginSetup } from '@kbn/lists-plugin/server';
import { buildExceptionFilter } from '@kbn/lists-plugin/server/services/exception_lists';
import { getIndexListFromEsqlQuery } from '@kbn/securitysolution-utils';

import type { ListArray } from '@kbn/securitysolution-io-ts-list-types';

import { getQueryFilter } from './utils/get_query_filter';
import { buildEventsSearchQuery, buildTimeRangeFilter } from './utils/build_events_query';
import { getListClient } from './utils/get_list_client';
import { getExceptions } from './utils/utils';

interface GetStartDeps {
  coreStart: CoreStart;
  getSpaceId: ((request: KibanaRequest) => string) | undefined;
}

interface HandlerDeps {
  lists: ListPluginSetup | undefined;
}

interface SecurityRuleParams {
  type: string;
  query?: string;
  language?: string;
  filters?: unknown[];
  index?: string[];
  dataViewId?: string;
  savedId?: string;
  from: string;
  to: string;
  maxSignals: number;
  timestampOverride?: string;
  timestampOverrideFallbackDisabled?: boolean;
  eventCategoryOverride?: string;
  timestampField?: string;
  tiebreakerField?: string;
  exceptionsList?: ListArray;
  threshold?: {
    field: string | string[];
    value: number;
    cardinality?: Array<{ field: string; value: number }>;
  };
}

const resolveIndices = async (
  params: SecurityRuleParams,
  savedObjectsClient: ReturnType<CoreStart['savedObjects']['getScopedClient']>
): Promise<{ index: string[]; runtimeMappings: estypes.MappingRuntimeFields | undefined }> => {
  if (params.type === 'esql' && params.query) {
    return { index: getIndexListFromEsqlQuery(params.query), runtimeMappings: undefined };
  }

  if (params.type === 'machine_learning') {
    return { index: [], runtimeMappings: undefined };
  }

  if (params.dataViewId) {
    const dataView = await savedObjectsClient.get<DataViewAttributes>(
      'index-pattern',
      params.dataViewId
    );
    const indices = dataView.attributes.title.split(',');
    const runtimeMappings: estypes.MappingRuntimeFields | undefined =
      dataView.attributes.runtimeFieldMap
        ? JSON.parse(dataView.attributes.runtimeFieldMap)
        : undefined;
    return { index: indices, runtimeMappings };
  }

  return { index: params.index ?? [], runtimeMappings: undefined };
};

const resolveTimeRange = (
  params: SecurityRuleParams
): { from: string; to: string } => {
  const now = new Date();
  const from = dateMath.parse(params.from, {})?.toISOString() ?? now.toISOString();
  const to = dateMath.parse(params.to, { roundUp: true })?.toISOString() ?? now.toISOString();
  return { from, to };
};

const resolveSavedQuery = async (
  savedId: string,
  savedObjectsClient: ReturnType<CoreStart['savedObjects']['getScopedClient']>
): Promise<{ query: string; language: string; filters: unknown[] }> => {
  const savedObject = await savedObjectsClient.get<{
    query: { query: string; language: string };
    filters: unknown[];
  }>('query', savedId);
  return {
    query: savedObject.attributes.query.query,
    language: savedObject.attributes.query.language,
    filters: savedObject.attributes.filters ?? [],
  };
};

const resolveExceptionFilter = async (
  params: SecurityRuleParams,
  lists: ListPluginSetup | undefined,
  esClient: ElasticsearchClient,
  savedObjectsClient: ReturnType<CoreStart['savedObjects']['getScopedClient']>,
  spaceId: string
): Promise<Filter | undefined> => {
  if (!params.exceptionsList?.length || !lists) {
    return undefined;
  }

  const { listClient, exceptionsClient } = getListClient({
    lists,
    spaceId,
    updatedByUser: null,
    esClient,
    savedObjectClient: savedObjectsClient,
  });

  const exceptionItems = await getExceptions({
    client: exceptionsClient,
    lists: params.exceptionsList,
    shouldFilterOutEndpointExceptions: false,
  });

  if (!exceptionItems.length) {
    return undefined;
  }

  const { filter } = await buildExceptionFilter({
    startedAt: new Date(),
    alias: null,
    excludeExceptions: true,
    chunkSize: 10,
    lists: exceptionItems,
    listClient,
  });

  return filter;
};

const getPrimaryTimestamp = (params: SecurityRuleParams): string =>
  params.timestampOverride ?? '@timestamp';

const getSecondaryTimestamp = (params: SecurityRuleParams): string | undefined => {
  if (!params.timestampOverride) return undefined;
  if (params.timestampOverrideFallbackDisabled) return undefined;
  if (params.timestampOverride === '@timestamp') return undefined;
  return '@timestamp';
};

const buildQueryRuleRequest = (
  params: SecurityRuleParams,
  index: string[],
  runtimeMappings: estypes.MappingRuntimeFields | undefined,
  from: string,
  to: string,
  exceptionFilter: Filter | undefined,
  query?: string,
  language?: string,
  filters?: unknown[]
) => {
  const effectiveQuery = query ?? params.query ?? '';
  const effectiveLanguage = language ?? params.language ?? 'kuery';
  const effectiveFilters = filters ?? params.filters ?? [];
  const primaryTimestamp = getPrimaryTimestamp(params);
  const secondaryTimestamp = getSecondaryTimestamp(params);

  const esFilter = getQueryFilter({
    query: effectiveQuery,
    language: effectiveLanguage as 'kuery' | 'lucene',
    filters: effectiveFilters,
    index,
    exceptionFilter,
  });

  return buildEventsSearchQuery({
    aggregations: undefined,
    index,
    from,
    to,
    runtimeMappings,
    filter: esFilter,
    size: Math.min(params.maxSignals ?? 100, 100),
    sortOrder: 'desc',
    searchAfterSortIds: undefined,
    primaryTimestamp,
    secondaryTimestamp,
    trackTotalHits: true,
  });
};

const buildEqlRuleRequest = (
  params: SecurityRuleParams,
  index: string[],
  runtimeMappings: estypes.MappingRuntimeFields | undefined,
  from: string,
  to: string,
  exceptionFilter: Filter | undefined
) => {
  const primaryTimestamp = getPrimaryTimestamp(params);
  const secondaryTimestamp = getSecondaryTimestamp(params);

  const esFilter = getQueryFilter({
    query: '',
    language: 'eql',
    filters: params.filters ?? [],
    index,
    exceptionFilter,
  });

  const rangeFilter = buildTimeRangeFilter({ to, from, primaryTimestamp, secondaryTimestamp });

  return {
    index,
    allow_no_indices: true,
    size: Math.min(params.maxSignals ?? 100, 100),
    query: params.query,
    filter: {
      bool: {
        filter: [rangeFilter, esFilter],
      },
    },
    runtime_mappings: runtimeMappings,
    timestamp_field: params.timestampField,
    event_category_field: params.eventCategoryOverride,
    ...(params.tiebreakerField ? { tiebreaker_field: params.tiebreakerField } : {}),
  };
};

const buildEsqlRuleRequest = (
  params: SecurityRuleParams,
  from: string,
  to: string,
  exceptionFilter: Filter | undefined
) => {
  const primaryTimestamp = getPrimaryTimestamp(params);
  const secondaryTimestamp = getSecondaryTimestamp(params);

  const esFilter = getQueryFilter({
    query: '',
    language: 'esql',
    filters: params.filters ?? [],
    index: undefined,
    exceptionFilter,
  });

  const rangeFilter = buildTimeRangeFilter({ to, from, primaryTimestamp, secondaryTimestamp });

  return {
    query: `${params.query} | limit ${Math.min(params.maxSignals ?? 100, 100)}`,
    filter: {
      bool: {
        filter: [rangeFilter, esFilter],
      },
    },
  };
};

export const createSecurityRuleQueryInspectorHandler = (
  getStartDeps: () => Promise<GetStartDeps>,
  deps: HandlerDeps
): RuleQueryInspectorHandler => {
  return async (
    request: KibanaRequest,
    _ruleId: string,
    ruleParams: Record<string, unknown>,
    mode: 'build' | 'execute',
    _alertId: string | undefined
  ): Promise<RuleQueryInspectorResponse> => {
    const params = ruleParams as unknown as SecurityRuleParams;
    const { coreStart, getSpaceId } = await getStartDeps();
    const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    const spaceId = getSpaceId?.(request) ?? 'default';

    const { index, runtimeMappings } = await resolveIndices(params, savedObjectsClient);
    const { from, to } = resolveTimeRange(params);

    const exceptionFilter = await resolveExceptionFilter(
      params,
      deps.lists,
      esClient,
      savedObjectsClient,
      spaceId
    );

    let searchRequest: Record<string, unknown>;
    let label: string | undefined;
    let isEql = false;
    let isEsql = false;

    switch (params.type) {
      case 'saved_query': {
        let query = params.query;
        let language = params.language;
        let filters = params.filters;
        if (params.savedId) {
          const saved = await resolveSavedQuery(params.savedId, savedObjectsClient);
          query = saved.query;
          language = saved.language;
          filters = saved.filters;
        }
        searchRequest = buildQueryRuleRequest(
          params, index, runtimeMappings, from, to, exceptionFilter, query, language, filters
        ) as unknown as Record<string, unknown>;
        label = 'Saved Query Rule';
        break;
      }
      case 'eql': {
        searchRequest = buildEqlRuleRequest(
          params, index, runtimeMappings, from, to, exceptionFilter
        ) as unknown as Record<string, unknown>;
        label = 'EQL Rule';
        isEql = true;
        break;
      }
      case 'esql': {
        searchRequest = buildEsqlRuleRequest(
          params, from, to, exceptionFilter
        ) as unknown as Record<string, unknown>;
        label = 'ES|QL Rule';
        isEsql = true;
        break;
      }
      case 'machine_learning': {
        throw new Error('Query inspection is not supported for machine learning rules');
      }
      default: {
        searchRequest = buildQueryRuleRequest(
          params, index, runtimeMappings, from, to, exceptionFilter
        ) as unknown as Record<string, unknown>;
        break;
      }
    }

    let response: Record<string, unknown> | undefined;
    if (mode === 'execute') {
      if (isEql) {
        const eqlResponse = await esClient.eql.search(
          searchRequest as unknown as Parameters<typeof esClient.eql.search>[0]
        );
        response = eqlResponse as unknown as Record<string, unknown>;
      } else if (isEsql) {
        const esqlResponse = await esClient.esql.query(
          searchRequest as unknown as Parameters<typeof esClient.esql.query>[0]
        );
        response = esqlResponse as unknown as Record<string, unknown>;
      } else {
        const searchResponse = await esClient.search(
          searchRequest as Parameters<typeof esClient.search>[0]
        );
        response = searchResponse as unknown as Record<string, unknown>;
      }
    }

    const indexLabel = Array.isArray(index) ? index.join(',') : '';

    return {
      queries: [
        {
          index: indexLabel,
          request: searchRequest,
          ...(response ? { response } : {}),
          ...(label ? { label } : {}),
        },
      ],
    };
  };
};
