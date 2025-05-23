/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginInitializer, PluginInitializerContext } from '@kbn/core/public';
import { WorkChatAppPlugin } from './plugin';
import {
  WorkChatFrameworkPluginSetup,
  WorkChatFrameworkPluginStart,
  WorkChatFrameworkPluginStartDependencies,
} from './types';

export const plugin: PluginInitializer<
  WorkChatFrameworkPluginSetup,
  WorkChatFrameworkPluginStart,
  {},
  WorkChatFrameworkPluginStartDependencies
> = (context: PluginInitializerContext) => {
  return new WorkChatAppPlugin(context);
};

export type { WorkChatFrameworkPluginSetup, WorkChatFrameworkPluginStart } from './types';
