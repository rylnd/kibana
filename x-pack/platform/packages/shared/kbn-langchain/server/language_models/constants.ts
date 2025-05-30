/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const getDefaultArguments = (
  llmType?: string,
  temperature?: number,
  stop?: string[],
  maxTokens?: number
) =>
  llmType === 'bedrock'
    ? {
        temperature: temperature ?? DEFAULT_BEDROCK_TEMPERATURE,
        stopSequences: stop ?? DEFAULT_BEDROCK_STOP_SEQUENCES,
        maxTokens,
      }
    : llmType === 'gemini'
    ? {
        temperature: temperature ?? DEFAULT_GEMINI_TEMPERATURE,
      }
    : { n: 1, stop: stop ?? null, temperature: temperature ?? DEFAULT_OPEN_AI_TEMPERATURE };

export const DEFAULT_OPEN_AI_TEMPERATURE = 0.2;
// this is a fallback for logging, connector will default to the connector model
// x-pack/platform/plugins/shared/stack_connectors/common/openai/constants.ts
export const DEFAULT_OPEN_AI_MODEL = 'gpt-4.1';
const DEFAULT_BEDROCK_TEMPERATURE = 0;
const DEFAULT_BEDROCK_STOP_SEQUENCES = ['\n\nHuman:', '\nObservation:'];
const DEFAULT_GEMINI_TEMPERATURE = 0;
export const DEFAULT_TIMEOUT = 180000;
