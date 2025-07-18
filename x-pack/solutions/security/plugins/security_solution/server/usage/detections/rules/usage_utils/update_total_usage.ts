/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesTypeUsage, RuleMetric, FeatureTypeUsage } from '../types';
import { getNotificationsEnabledDisabled } from './get_notifications_enabled_disabled';
import { updateAlertSuppressionUsage } from './update_alert_suppression_usage';
import { updateResponseActionsUsage } from './update_response_actions_usage';

export interface UpdateTotalUsageOptions {
  detectionRuleMetric: RuleMetric;
  updatedUsage: RulesTypeUsage;
  totalType:
    | 'custom_total'
    | 'elastic_total'
    | 'elastic_customized_total'
    | 'elastic_noncustomized_total';
}

export const updateTotalUsage = ({
  detectionRuleMetric,
  updatedUsage,
  totalType,
}: UpdateTotalUsageOptions): FeatureTypeUsage => {
  const {
    legacyNotificationEnabled,
    legacyNotificationDisabled,
    notificationEnabled,
    notificationDisabled,
  } = getNotificationsEnabledDisabled(detectionRuleMetric);

  return {
    enabled: detectionRuleMetric.enabled
      ? updatedUsage[totalType].enabled + 1
      : updatedUsage[totalType].enabled,
    disabled: !detectionRuleMetric.enabled
      ? updatedUsage[totalType].disabled + 1
      : updatedUsage[totalType].disabled,
    alerts: updatedUsage[totalType].alerts + detectionRuleMetric.alert_count_daily,
    cases: updatedUsage[totalType].cases + detectionRuleMetric.cases_count_total,
    legacy_notifications_enabled: legacyNotificationEnabled
      ? updatedUsage[totalType].legacy_notifications_enabled + 1
      : updatedUsage[totalType].legacy_notifications_enabled,
    legacy_notifications_disabled: legacyNotificationDisabled
      ? updatedUsage[totalType].legacy_notifications_disabled + 1
      : updatedUsage[totalType].legacy_notifications_disabled,
    notifications_enabled: notificationEnabled
      ? updatedUsage[totalType].notifications_enabled + 1
      : updatedUsage[totalType].notifications_enabled,
    notifications_disabled: notificationDisabled
      ? updatedUsage[totalType].notifications_disabled + 1
      : updatedUsage[totalType].notifications_disabled,
    legacy_investigation_fields: detectionRuleMetric.has_legacy_investigation_field
      ? updatedUsage[totalType].legacy_investigation_fields + 1
      : updatedUsage[totalType].legacy_investigation_fields,
    alert_suppression: updateAlertSuppressionUsage({
      usage: updatedUsage[totalType],
      detectionRuleMetric,
    }),
    has_exceptions: detectionRuleMetric.has_exceptions
      ? updatedUsage[totalType].has_exceptions + 1
      : updatedUsage[totalType].has_exceptions,
    response_actions: updateResponseActionsUsage({
      usage: updatedUsage[totalType],
      detectionRuleMetric,
    }),
  };
};
