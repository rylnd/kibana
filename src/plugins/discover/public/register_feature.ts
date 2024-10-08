/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';

export function registerFeature(home: HomePublicPluginSetup) {
  home.featureCatalogue.register({
    id: 'discover',
    title: i18n.translate('discover.discoverTitle', {
      defaultMessage: 'Discover',
    }),
    subtitle: i18n.translate('discover.discoverSubtitle', {
      defaultMessage: 'Search and find insights.',
    }),
    description: i18n.translate('discover.discoverDescription', {
      defaultMessage: 'Interactively explore your data by querying and filtering raw documents.',
    }),
    icon: 'discoverApp',
    path: '/app/discover#/',
    showOnHomePage: false,
    category: 'data',
    solutionId: 'kibana',
    order: 200,
  });
}
