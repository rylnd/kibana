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
import { createIndexRoute } from './routes/index/create_index_route';
import { readIndexRoute } from './routes/index/read_index_route';
import { deleteIndexRoute } from './routes/index/delete_index_route';
import { setSignalsStatusRoute } from './routes/signals/open_close_signals_route';
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

    if (__legacy.plugins.alerting != null) {
      const type = rulesAlertType({ logger: this.logger, version });
      if (isAlertExecutor(type)) {
        __legacy.plugins.alerting.setup.registerType(type);
      }
    }

    // Detection Engine Rule routes that have the REST endpoints of /api/detection_engine/rules
    // All REST rule creation, deletion, updating, etc...
    createRulesRoute(__legacy);
    readRulesRoute(__legacy);
    updateRulesRoute(__legacy);
    deleteRulesRoute(__legacy);
    findRulesRoute(__legacy);

    // Detection Engine Signals routes that have the REST endpoints of /api/detection_engine/signals
    // POST /api/detection_engine/signals/status
    // Example usage can be found in siem/server/lib/detection_engine/scripts/signals
    setSignalsStatusRoute(__legacy);

    // Detection Engine index routes that have the REST endpoints of /api/detection_engine/index
    // All REST index creation, policy management for spaces
    createIndexRoute(__legacy);
    readIndexRoute(__legacy);
    deleteIndexRoute(__legacy);
  }
}
