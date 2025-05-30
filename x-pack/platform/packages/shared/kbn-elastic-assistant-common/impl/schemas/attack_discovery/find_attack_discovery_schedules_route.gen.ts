/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 *
 * info:
 *   title: Find Knowledge Base Entries API endpoint
 *   version: 2023-10-31
 */

import { z } from '@kbn/zod';

import { NonEmptyString } from '../common_attributes.gen';
import { AttackDiscoverySchedule } from './schedules.gen';

export type FindAttackDiscoverySchedulesRequestQuery = z.infer<
  typeof FindAttackDiscoverySchedulesRequestQuery
>;
export const FindAttackDiscoverySchedulesRequestQuery = z.object({
  page: z.coerce.number().optional(),
  perPage: z.coerce.number().optional(),
  sortField: NonEmptyString.optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
});
export type FindAttackDiscoverySchedulesRequestQueryInput = z.input<
  typeof FindAttackDiscoverySchedulesRequestQuery
>;

export type FindAttackDiscoverySchedulesResponse = z.infer<
  typeof FindAttackDiscoverySchedulesResponse
>;
export const FindAttackDiscoverySchedulesResponse = z.object({
  total: z.number(),
  data: z.array(AttackDiscoverySchedule),
});
