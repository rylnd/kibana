/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import archives from '../../common/fixtures/es_archiver/archives_metadata';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const apmApiClient = getService('apmApiClient');

  const archiveName = 'apm_8.0.0';
  const { start, end } = archives[archiveName];
  const transactionType = 'request';
  const transactionName = 'GET /api';

  registry.when(
    'Breakdown when data is loaded',
    { config: 'basic', archives: [archiveName] },
    () => {
      it('returns the transaction breakdown for a service', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/transaction/charts/breakdown',
          params: {
            path: { serviceName: 'opbeans-node' },
            query: {
              start,
              end,
              transactionType,
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);
        expectSnapshot(response.body).toMatch();
      });
      it('returns the transaction breakdown for a transaction group', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/transaction/charts/breakdown',
          params: {
            path: { serviceName: 'opbeans-node' },
            query: {
              start,
              end,
              transactionType,
              transactionName,
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);

        const { timeseries } = response.body;

        const numberOfSeries = timeseries.length;

        expectSnapshot(numberOfSeries).toMatchInline(`1`);

        const { title, type, data, hideLegend, legendValue } = timeseries[0];

        const nonNullDataPoints = data.filter(({ y }: { y: number | null }) => y !== null);

        expectSnapshot(nonNullDataPoints.length).toMatchInline(`47`);

        expectSnapshot(
          data.slice(0, 5).map(({ x, y }: { x: number; y: number | null }) => {
            return {
              x: new Date(x ?? NaN).toISOString(),
              y,
            };
          })
        ).toMatchInline(`
        Array [
          Object {
            "x": "2021-08-03T06:50:00.000Z",
            "y": null,
          },
          Object {
            "x": "2021-08-03T06:50:30.000Z",
            "y": 1,
          },
          Object {
            "x": "2021-08-03T06:51:00.000Z",
            "y": null,
          },
          Object {
            "x": "2021-08-03T06:51:30.000Z",
            "y": 1,
          },
          Object {
            "x": "2021-08-03T06:52:00.000Z",
            "y": 1,
          },
        ]
      `);

        expectSnapshot(title).toMatchInline(`"app"`);
        expectSnapshot(type).toMatchInline(`"areaStacked"`);
        expectSnapshot(hideLegend).toMatchInline(`false`);
        expectSnapshot(legendValue).toMatchInline(`"100%"`);

        expectSnapshot(data).toMatch();
      });
      it('returns the transaction breakdown sorted by name', async () => {
        const response = await apmApiClient.readUser({
          endpoint: 'GET /internal/apm/services/{serviceName}/transaction/charts/breakdown',
          params: {
            path: { serviceName: 'opbeans-node' },
            query: {
              start,
              end,
              transactionType,
              environment: 'ENVIRONMENT_ALL',
              kuery: '',
            },
          },
        });

        expect(response.status).to.be(200);
        expectSnapshot(response.body.timeseries.map((serie: { title: string }) => serie.title))
          .toMatchInline(`
          Array [
            "app",
            "http",
            "postgresql",
            "redis",
          ]
        `);
      });
    }
  );
}
