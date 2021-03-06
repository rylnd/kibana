/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from 'kibana/public';
import { BASE_ACTION_API_PATH } from '../../../constants';

export async function getChoices({
  http,
  signal,
  connectorId,
  fields,
}: {
  http: HttpSetup;
  signal: AbortSignal;
  connectorId: string;
  fields: string[];
}): Promise<Record<string, any>> {
  return await http.post(
    `${BASE_ACTION_API_PATH}/connector/${encodeURIComponent(connectorId)}/_execute`,
    {
      body: JSON.stringify({
        params: { subAction: 'getChoices', subActionParams: { fields } },
      }),
      signal,
    }
  );
}
