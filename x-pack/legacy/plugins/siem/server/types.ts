/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';

export interface ServerFacade {
  config: Legacy.Server['config'];
  getInjectedUiAppVars: Legacy.Server['getInjectedUiAppVars'];
  indexPatternsServiceFactory: Legacy.Server['indexPatternsServiceFactory'];
  injectUiAppVars: Legacy.Server['injectUiAppVars'];
  plugins: {
    alerting?: Legacy.Server['plugins']['alerting'];
    xpack_main: Legacy.Server['plugins']['xpack_main'];
  };
  savedObjects: Legacy.Server['savedObjects'];
}

export interface LegacyPlugins {
  actions?: Legacy.Server['plugins']['actions'];
  alerting?: Legacy.Server['plugins']['alerting'];
}

export interface RequestFacade {
  auth: Legacy.Request['auth'];
  // getAlertsClient?: Legacy.Request['getAlertsClient'];
  // getActionsClient?: Legacy.Request['getActionsClient'];
  params: Legacy.Request['params'];
  payload: unknown;
  query: Legacy.Request['query'];
}
