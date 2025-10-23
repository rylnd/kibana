/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import {
  EQL_RULE_TYPE_ID,
  ESQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';
import { PLUGIN_ID } from '.';

export interface AdHocFeaturesSetupDeps {
  features: FeaturesPluginSetup;
}

export interface AdHocFeaturesStartDeps {
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

export class AdHocFeaturesPlugin
  implements Plugin<void, void, AdHocFeaturesSetupDeps, AdHocFeaturesStartDeps>
{
  public setup(core: CoreSetup<AdHocFeaturesStartDeps>, deps: AdHocFeaturesSetupDeps) {
    const { features } = deps;
    this.registerFeatures(features);
  }

  public start() {}

  public stop() {}

  private registerFeatures(features: FeaturesPluginSetup) {
    // Define SIEM rule types for which we want to expose specific alerting rule privileges
    const SECURITY_RULE_TYPES = [
      ESQL_RULE_TYPE_ID,
      EQL_RULE_TYPE_ID,
      INDICATOR_RULE_TYPE_ID,
      ML_RULE_TYPE_ID,
      QUERY_RULE_TYPE_ID,
      SAVED_QUERY_RULE_TYPE_ID,
      THRESHOLD_RULE_TYPE_ID,
      NEW_TERMS_RULE_TYPE_ID,
    ];

    // Map the rule types to the SIEM consumer so we can grant granular privileges like enable/manual_run
    const testAlertingFeatures = SECURITY_RULE_TYPES.map((ruleTypeId) => ({
      ruleTypeId,
      consumers: [PLUGIN_ID],
    }));

    // Dedicated SIEM enable fixture: narrow base privileges to read, and expose granular enable via sub-feature
    features.registerKibanaFeature({
      id: 'slugBaseFeature',
      name: 'Slug Base Fixture',
      app: ['kibana'],
      category: { id: 'slug-base', label: 'Slug Base Fixture' },
      privileges: {
        all: {
          app: ['kibana'],
          savedObject: { all: [], read: [] },
          // Only read on rules by default; write comes from sub-features like enable
          alerting: { rule: { read: testAlertingFeatures } },
          ui: [],
        },
        read: {
          app: ['kibana'],
          savedObject: { all: [], read: [] },
          alerting: { rule: { read: testAlertingFeatures } },
          ui: [],
        },
      },
      subFeatures: [
        {
          name: 'Manual run of alerting rules',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  name: 'Manual run',
                  id: 'manual_run',
                  includeIn: 'none',
                  savedObject: { all: [], read: [] },
                  alerting: { rule: { manual_run: testAlertingFeatures } },
                  ui: [],
                },
              ],
            },
          ],
        },
        {
          name: 'Enable and disable alerting rules',
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  name: 'Enable and disable rules',
                  id: 'enable_disable',
                  includeIn: 'none',
                  savedObject: { all: [], read: [] },
                  alerting: { rule: { enable: testAlertingFeatures, read: testAlertingFeatures } },
                  ui: [],
                },
              ],
            },
          ],
        },
      ],
    });
  }
}
