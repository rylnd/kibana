/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import type { ESSearchRequest } from '@kbn/es-types';

interface BuildSortedEventsQueryOpts {
  aggs?: Record<string, estypes.AggregationsAggregationContainer>;
  track_total_hits: boolean | number;
  index: estypes.Indices;
  size: number;
}

export interface BuildSortedEventsQuery extends BuildSortedEventsQueryOpts {
  filter: unknown;
  from: string;
  to: string;
  sortOrder?: 'asc' | 'desc';
  searchAfterSortId: string | number | undefined;
  timeField: string;
  fields?: string[];
  runtime_mappings?: unknown;
  _source?: unknown;
}

export const buildSortedEventsQuery = ({
  aggs,
  index,
  from,
  to,
  filter,
  size,
  searchAfterSortId,
  sortOrder,
  timeField,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  track_total_hits,
  fields,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  runtime_mappings,
  _source,
}: BuildSortedEventsQuery): ESSearchRequest => {
  const sortField = timeField;
  const docFields = [timeField].map((tstamp) => ({
    field: tstamp,
    format: 'strict_date_optional_time',
  }));

  const rangeFilter: unknown[] = [
    {
      range: {
        [timeField]: {
          lte: to,
          gte: from,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];
  const filterWithTime = [filter, { bool: { filter: rangeFilter } }];

  const searchQuery = {
    allow_no_indices: true,
    index,
    size,
    ignore_unavailable: true,
    track_total_hits: track_total_hits ?? false,
    docvalue_fields: docFields,
    query: {
      bool: {
        filter: [...filterWithTime],
      },
    },
    ...(aggs ? { aggs } : {}),
    sort: [
      {
        [sortField]: {
          order: sortOrder ?? 'asc',
          format: 'strict_date_optional_time||epoch_millis',
        },
      },
    ],
    ...(runtime_mappings ? { runtime_mappings } : {}),
    ...(fields ? { fields } : {}),
    ...(_source != null ? { _source } : {}),
  };

  if (searchAfterSortId) {
    return {
      ...searchQuery,
      search_after: [searchAfterSortId],
    } as ESSearchRequest;
  }
  return searchQuery as ESSearchRequest;
};
