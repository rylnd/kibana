/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isThreatMatchRule } from '../../../../../common/detection_engine/utils';
import { RuleTypeParams } from '../../types';
import { defaultExecutionStrategy } from './default_execution_strategy';
import { buildThreatMatchStrategy } from './threat_match/rule_strategy';
import { RuleExecutionContext, RuleExecutor, RuleStrategy } from './types';

export const ruleExecutorFactory = (
  params: RuleTypeParams,
  context: RuleExecutionContext
): RuleExecutor | undefined => {
  let ruleStrategy: RuleStrategy | undefined;

  if (isThreatMatchRule(params.type)) {
    ruleStrategy = buildThreatMatchStrategy(params, context);
  }

  if (ruleStrategy == null) {
    return undefined;
  }

  return { execute: defaultExecutionStrategy(ruleStrategy) };
};
