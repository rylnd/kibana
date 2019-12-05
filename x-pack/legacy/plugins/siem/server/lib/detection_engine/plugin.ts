/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PluginInitializerContext, Logger, CoreSetup } from 'src/core/server';
import { rulesAlertType } from './alerts/rules_alert_type';
import { isAlertExecutor } from './alerts/types';
import { createRulesRoute } from './routes/create_rules_route';
import { readRulesRoute } from './routes/read_rules_route';
import { findRulesRoute } from './routes/find_rules_route';
import { deleteRulesRoute } from './routes/delete_rules_route';
import { updateRulesRoute } from './routes/update_rules_route';
import { ServerFacade } from '../../types';

export class Plugin {
  readonly name = 'detection_engine';
  private readonly logger: Logger;
  private context: PluginInitializerContext;

  constructor(context: PluginInitializerContext) {
    this.context = context;
    this.logger = context.logger.get('plugins', 'siem', this.name);
  }

  public setup(core: CoreSetup, plugins: {}, __legacy: ServerFacade) {
    const version = this.context.env.packageInfo.version;
    const {
      plugins: { alerting },
      route,
    } = __legacy;

    if (alerting != null) {
      const type = rulesAlertType({ logger: this.logger, version });
      if (isAlertExecutor(type)) {
        alerting.setup.registerType(type);
      }
    }

    // Signals/Alerting Rules routes for
    // routes such as ${DETECTION_ENGINE_RULES_URL}
    // that have the REST endpoints of /api/detection_engine/rules
    createRulesRoute(core, __legacy);
    readRulesRoute(route);
    updateRulesRoute(route);
    deleteRulesRoute(route);
    findRulesRoute(route);
  }
}
