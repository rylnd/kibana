/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AggregationsAggregationContainer,
  MappingRuntimeFields,
  Sort,
} from '@elastic/elasticsearch/lib/api/types';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, StartServicesAccessor } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { RegistryRuleType } from '@kbn/alerting-plugin/server/rule_type_registry';
// TODO can we do this?
import { getAuthzFilter, getSpacesFilter } from '@kbn/rule-registry-plugin/server/lib';
import { getRuleTypeIdsFilter } from '@kbn/rule-registry-plugin/server/lib/get_rule_type_ids_filter';
import { getConsumersFilter } from '@kbn/rule-registry-plugin/server/lib/get_consumers_filter';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { ReadOperations, AlertingAuthorizationEntity } from '@kbn/alerting-plugin/server';
import type { StartPlugins } from '../../../../plugin';
import { SearchAlertsRequestBody } from '../../../../../common/api/detection_engine/signals';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../../common/constants';
import { buildSiemResponse } from '../utils';

export const querySignalsRoute = (
  router: SecuritySolutionPluginRouter,
  ruleDataClient: IRuleDataClient | null,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .post({
      path: DETECTION_ENGINE_QUERY_SIGNALS_URL,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(SearchAlertsRequestBody),
          },
        },
      },
      async (context, request, response) => {
        // const esClient = (await context.core).elasticsearch.client.asCurrentUser;
        const alerting = await context.alerting;
        // TODO get this a better way?
        const [_, { alerting: alertingStart }] = await getStartServices();

        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { query, aggs, _source, fields, track_total_hits, size, runtime_mappings, sort } =
          request.body;
        const siemResponse = buildSiemResponse(response);
        if (
          query == null &&
          aggs == null &&
          _source == null &&
          fields == null &&
          track_total_hits == null &&
          size == null &&
          sort == null
        ) {
          return siemResponse.error({
            statusCode: 400,
            body: '"value" must have at least 1 children',
          });
        }
        try {
          const securityContext = await context.securitySolution;
          const spaceId = securityContext.getSpaceId();

          // TODO extract this whole section

          // TODO should we hardcode this, or require that the user specify the allowed types?
          const requestedRuleTypeIds = SECURITY_SOLUTION_RULE_TYPE_IDS;

          const alertingAuthorization = await alertingStart.getAlertingAuthorizationWithRequest(
            request
          );

          // TODO this should be `const validRuleTypes = alerting.getRegisteredAndNonInternalRuleTypes(ruleTypeIds);`
          const registeredRuleTypes = alerting.listTypes();
          const ruleTypesWithoutInternalRuleTypes =
            getRuleTypesWithoutInternalRuleTypes(registeredRuleTypes);
          const validRuleTypeIds = requestedRuleTypeIds.filter((ruleTypeId) =>
            ruleTypesWithoutInternalRuleTypes.has(ruleTypeId)
          );

          const authzFilter = (await getAuthzFilter(
            alertingAuthorization,
            ReadOperations.Find
          )) as estypes.QueryDslQueryContainer;

          const authorizedRuleTypes =
            await alertingAuthorization.getAllAuthorizedRuleTypesFindOperation({
              authorizationEntity: AlertingAuthorizationEntity.Alert,
              ruleTypeIds: validRuleTypeIds,
            });

          // TODO filter out excluded rule types (siem.notifications, etc.)
          const ruleTypeIds = Array.from(authorizedRuleTypes.keys());

          const indices = alertingStart.getAlertIndicesAlias(ruleTypeIds, spaceId);

          /* SECTION: append RBAC filters */
          // TODO respect requested filter
          const filter = [];

          filter.push(getSpacesFilter(spaceId) as estypes.QueryDslQueryContainer);

          if (authzFilter) {
            filter.push(authzFilter);
          }

          const ruleTypeFilter = getRuleTypeIdsFilter(requestedRuleTypeIds);
          if (ruleTypeFilter) {
            filter.push(ruleTypeFilter);
          }

          const consumersFilter = getConsumersFilter([AlertConsumers.SIEM]);
          if (consumersFilter) {
            filter.push(consumersFilter);
          }

          const _query = {
            ...(query?.ids != null
              ? { ids: query?.ids }
              : {
                  bool: {
                    ...(query?.bool ? { ...query.bool } : {}),
                    filter,
                  },
                }),
          };

          const { has_all_requested: hasCustomAlertingPrivileges } = await (
            await context.core
          ).elasticsearch.client.asCurrentUser.security.hasPrivileges({
            index: [
              {
                names: indices,
                privileges: ['read'],
              },
            ],
          });

          let esClient: ElasticsearchClient;
          if (hasCustomAlertingPrivileges) {
            esClient = (await context.core).elasticsearch.client.asCurrentUser;
          } else {
            esClient = (await context.core).elasticsearch.client.asInternalUser;
          }

          const result = await esClient.search({
            index: indices,
            query: _query,
            aggs: aggs as Record<string, AggregationsAggregationContainer>,
            _source,
            fields,
            track_total_hits,
            size,
            runtime_mappings: runtime_mappings as MappingRuntimeFields,
            sort: sort as Sort,
            ignore_unavailable: true,
          });
          return response.ok({ body: result });
        } catch (err) {
          // error while getting or updating signal with id: id in signal index .siem-signals
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};

const getRuleTypesWithoutInternalRuleTypes = (registeredRuleTypes: Map<string, RegistryRuleType>) =>
  new Map(
    Array.from(registeredRuleTypes).filter(
      ([_id, ruleType]) => ruleType.internallyManaged == null || !ruleType.internallyManaged
    )
  );
