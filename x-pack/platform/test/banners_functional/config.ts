/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutTestRunConfigCategory } from '@kbn/scout-info';
import { FtrConfigProviderContext } from '@kbn/test';
import { services, pageObjects } from './ftr_provider_context';

export default async function ({ readConfigFile }: FtrConfigProviderContext) {
  const kibanaFunctionalConfig = await readConfigFile(
    require.resolve('../functional/config.base.ts')
  );

  return {
    testConfigCategory: ScoutTestRunConfigCategory.UI_TEST,
    testFiles: [require.resolve('./tests')],
    servers: {
      ...kibanaFunctionalConfig.get('servers'),
    },
    services,
    pageObjects,

    junit: {
      reportName: 'X-Pack Banners Functional Tests',
    },

    esTestCluster: kibanaFunctionalConfig.get('esTestCluster'),
    apps: {
      ...kibanaFunctionalConfig.get('apps'),
    },

    kbnTestServer: {
      ...kibanaFunctionalConfig.get('kbnTestServer'),
      serverArgs: [
        ...kibanaFunctionalConfig.get('kbnTestServer.serverArgs'),
        '--xpack.banners.placement=top',
        '--xpack.banners.textContent="global banner text"',
      ],
    },
  };
}
