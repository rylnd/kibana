/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SUMMARY = i18n.translate('xpack.securitySolution.alertDetails.summary', {
  defaultMessage: 'Summary',
});

export const ALERT_SUMMARY = i18n.translate('xpack.securitySolution.alertDetails.alertSummary', {
  defaultMessage: 'Alert Summary',
});

export const THREAT_INTEL = i18n.translate('xpack.securitySolution.alertDetails.threatIntel', {
  defaultMessage: 'Threat Intel',
});

export const THREAT_SUMMARY = i18n.translate('xpack.securitySolution.alertDetails.threatSummary', {
  defaultMessage: 'Threat Summary',
});

export const VIEW_CTI_DATA = i18n.translate('xpack.securitySolution.alertDetails.threatIntelCta', {
  defaultMessage: 'View threat intel data',
});

export const INVESTIGATION_GUIDE = i18n.translate(
  'xpack.securitySolution.alertDetails.summary.investigationGuide',
  {
    defaultMessage: 'Investigation guide',
  }
);

export const TABLE = i18n.translate('xpack.securitySolution.eventDetails.table', {
  defaultMessage: 'Table',
});

export const JSON_VIEW = i18n.translate('xpack.securitySolution.eventDetails.jsonView', {
  defaultMessage: 'JSON View',
});

export const FIELD = i18n.translate('xpack.securitySolution.eventDetails.field', {
  defaultMessage: 'Field',
});

export const VALUE = i18n.translate('xpack.securitySolution.eventDetails.value', {
  defaultMessage: 'Value',
});

export const DESCRIPTION = i18n.translate('xpack.securitySolution.eventDetails.description', {
  defaultMessage: 'Description',
});

export const BLANK = i18n.translate('xpack.securitySolution.eventDetails.blank', {
  defaultMessage: ' ',
});

export const PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.eventDetails.filter.placeholder',
  {
    defaultMessage: 'Filter by Field, Value, or Description...',
  }
);

export const COPY_TO_CLIPBOARD = i18n.translate(
  'xpack.securitySolution.eventDetails.copyToClipboard',
  {
    defaultMessage: 'Copy to Clipboard',
  }
);

export const VIEW_COLUMN = (field: string) =>
  i18n.translate('xpack.securitySolution.eventDetails.viewColumnCheckboxAriaLabel', {
    values: { field },
    defaultMessage: 'View {field} column',
  });

export const NESTED_COLUMN = (field: string) =>
  i18n.translate('xpack.securitySolution.eventDetails.nestedColumnCheckboxAriaLabel', {
    values: { field },
    defaultMessage:
      'The {field} field is an object, and is broken down into nested fields which can be added as column',
  });

export const AGENT_STATUS = i18n.translate('xpack.securitySolution.detections.alerts.agentStatus', {
  defaultMessage: 'Agent status',
});
