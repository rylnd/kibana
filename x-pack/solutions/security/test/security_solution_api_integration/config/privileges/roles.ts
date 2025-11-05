/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SECURITY_FEATURE_ID } from '@kbn/security-solution-plugin/common/constants';
import type { Role } from '../services/types';

/**
 * Roles for privilege tests
 */

export const secAllV1: Role = {
  name: 'sec_all_v1',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
export const secReadV1: Role = {
  name: 'sec_read_v1',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};
export const secNoneV1: Role = {
  name: 'sec_none_v1',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          siem: ['none'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secTimelineAllV2: Role = {
  name: 'sec_timeline_all',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [SECURITY_FEATURE_ID]: ['all'],
          securitySolutionTimeline: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secTimelineReadV2: Role = {
  name: 'sec_timeline_read',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [SECURITY_FEATURE_ID]: ['read'],
          securitySolutionTimeline: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secTimelineNoneV2: Role = {
  name: 'sec_timeline_none',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [SECURITY_FEATURE_ID]: ['read'],
          securitySolutionTimeline: ['none'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secNotesAllV2: Role = {
  name: 'sec_notes_all',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['all'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [SECURITY_FEATURE_ID]: ['all'],
          securitySolutionNotes: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secNotesReadV2: Role = {
  name: 'sec_notes_read',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [SECURITY_FEATURE_ID]: ['read'],
          securitySolutionNotes: ['read'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const secNotesNoneV2: Role = {
  name: 'sec_notes_none',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: ['*'],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          [SECURITY_FEATURE_ID]: ['none'],
          securitySolutionNotes: ['none'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const roles: Role[] = [
  secTimelineAllV2,
  secTimelineReadV2,
  secTimelineNoneV2,
  secNotesAllV2,
  secNotesReadV2,
  secNotesNoneV2,
  secAllV1,
  secReadV1,
  secNoneV1,
];

export const rulesRead: Role = {
  name: 'rules:read',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: [
            '.alerts-security.alerts-default',
            '.internal.alerts-security.alerts-default-*',
            '.siem-signals-default',
            '.lists-default',
            '.items-default',
          ],
          privileges: ['maintenance', 'write', 'read', 'view_index_metadata'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          indexPatterns: ['all'],
          securitySolutionRulesV1: ['read'],
          savedObjectsManagement: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};

export const rulesAll: Role = {
  name: 'rules:all',
  privileges: {
    elasticsearch: {
      indices: [
        {
          names: [
            '.alerts-security.alerts-default',
            '.internal.alerts-security.alerts-default-*',
            '.siem-signals-default',
            '.lists-default',
            '.items-default',
          ],
          privileges: ['manage', 'write', 'read', 'view_index_metadata'],
        },
        {
          names: [
            '.preview.alerts-security.alerts-default',
            '.internal.preview.alerts-security.alerts-default-*',
          ],
          privileges: ['read'],
        },
      ],
    },
    kibana: [
      {
        feature: {
          indexPatterns: ['all'],
          siemv5: ['all'],
          actions: ['all'],
          securitySolutionRulesV1: ['all'],
          savedObjectsManagement: ['all'],
        },
        spaces: ['*'],
      },
    ],
  },
};
