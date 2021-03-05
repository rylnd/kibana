/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleExecutorResult, RuleStrategy } from './types';

export const defaultExecutionStrategy: (
  strategy: RuleStrategy
) => () => Promise<RuleExecutorResult> = (strategy) => async () => {
  const queryResult = await strategy.query();
  const indexResult = await strategy.index(queryResult);

  return {
    ...queryResult,
    ...indexResult,
    success: queryResult.success && indexResult.success,
    errors: [...new Set([...queryResult.errors, ...indexResult.errors])],
  };
};
