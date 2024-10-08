/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BedrockLogo, OpenAILogo, GeminiLogo } from '@kbn/stack-connectors-plugin/public/common';
import { ComponentType, useMemo } from 'react';
import { LLMs } from '../../common/types';
import { LLMModel } from '../types';
import { useLoadConnectors } from './use_load_connectors';
import { MODELS } from '../../common/models';

const mapLlmToModels: Record<
  LLMs,
  {
    icon: ComponentType;
    getModels: (
      connectorName: string,
      includeName: boolean
    ) => Array<{ label: string; value?: string; promptTokenLimit?: number }>;
  }
> = {
  [LLMs.openai]: {
    icon: OpenAILogo,
    getModels: (connectorName, includeName) =>
      MODELS.filter(({ provider }) => provider === LLMs.openai).map((model) => ({
        label: `${model.name} ${includeName ? `(${connectorName})` : ''}`,
        value: model.model,
        promptTokenLimit: model.promptTokenLimit,
      })),
  },
  [LLMs.openai_azure]: {
    icon: OpenAILogo,
    getModels: (connectorName) => [
      {
        label: i18n.translate('xpack.searchPlayground.openAIAzureModel', {
          defaultMessage: '{name} (Azure OpenAI)',
          values: { name: connectorName },
        }),
      },
    ],
  },
  [LLMs.openai_other]: {
    icon: OpenAILogo,
    getModels: (connectorName) => [
      {
        label: i18n.translate('xpack.searchPlayground.otherOpenAIModel', {
          defaultMessage: '{name} (OpenAI Compatible Service)',
          values: { name: connectorName },
        }),
      },
    ],
  },
  [LLMs.bedrock]: {
    icon: BedrockLogo,
    getModels: () =>
      MODELS.filter(({ provider }) => provider === LLMs.bedrock).map((model) => ({
        label: model.name,
        value: model.model,
        promptTokenLimit: model.promptTokenLimit,
      })),
  },
  [LLMs.gemini]: {
    icon: GeminiLogo,
    getModels: () =>
      MODELS.filter(({ provider }) => provider === LLMs.gemini).map((model) => ({
        label: model.name,
        value: model.model,
        promptTokenLimit: model.promptTokenLimit,
      })),
  },
};

export const useLLMsModels = (): LLMModel[] => {
  const { data: connectors } = useLoadConnectors();

  const mapConnectorTypeToCount = useMemo(
    () =>
      connectors?.reduce<Partial<Record<LLMs, number>>>(
        (result, connector) => ({
          ...result,
          [connector.type]: (result[connector.type] || 0) + 1,
        }),
        {}
      ),
    [connectors]
  );

  return useMemo(
    () =>
      connectors?.reduce<LLMModel[]>((result, connector) => {
        const llmParams = mapLlmToModels[connector.type];

        if (!llmParams) {
          return result;
        }

        const showConnectorName = Number(mapConnectorTypeToCount?.[connector.type]) > 1;

        return [
          ...result,
          ...llmParams
            .getModels(connector.name, false)
            .map(({ label, value, promptTokenLimit }) => ({
              id: connector?.id + label,
              name: label,
              value,
              connectorType: connector.type,
              connectorName: connector.name,
              showConnectorName,
              icon: llmParams.icon,
              disabled: !connector,
              connectorId: connector.id,
              promptTokenLimit,
            })),
        ];
      }, []) || [],
    [connectors, mapConnectorTypeToCount]
  );
};
