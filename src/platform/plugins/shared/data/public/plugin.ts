/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './index.scss';

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import {
  Storage,
  IStorageWrapper,
  createStartServicesGetter,
} from '@kbn/kibana-utils-plugin/public';
import {
  EVENT_PROPERTY_EXECUTION_CONTEXT,
  EVENT_PROPERTY_SEARCH_TIMEOUT_MS,
  EVENT_TYPE_DATA_SEARCH_TIMEOUT,
} from './search/constants';
import type { ConfigSchema } from '../server/config';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  DataSetupDependencies,
  DataStartDependencies,
} from './types';
import { SearchService } from './search/search_service';
import { QueryService } from './query';
import {
  setIndexPatterns,
  setOverlays,
  setSearchService,
  setUiSettings,
  setTheme,
} from './services';
import { applyFilterTrigger } from './triggers';
import { getTableViewDescription } from './utils/table_inspector_view';
import { NowProvider, NowProviderInternalContract } from './now_provider';
import { getAggsFormats, DatatableUtilitiesService } from '../common';
import type {
  MultiValueClickDataContext,
  RangeSelectDataContext,
  ValueClickDataContext,
} from './actions/filters';

export class DataPublicPlugin
  implements
    Plugin<
      DataPublicPluginSetup,
      DataPublicPluginStart,
      DataSetupDependencies,
      DataStartDependencies
    >
{
  private readonly searchService: SearchService;
  private readonly queryService: QueryService;
  private readonly storage: IStorageWrapper;
  private readonly nowProvider: NowProviderInternalContract;

  constructor(initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.searchService = new SearchService(initializerContext);
    this.queryService = new QueryService(
      initializerContext.config.get().query.timefilter.minRefreshInterval
    );

    this.storage = new Storage(window.localStorage);
    this.nowProvider = new NowProvider();
  }

  public setup(
    core: CoreSetup<DataStartDependencies, DataPublicPluginStart>,
    {
      expressions,
      uiActions,
      usageCollection,
      inspector,
      fieldFormats,
      management,
    }: DataSetupDependencies
  ): DataPublicPluginSetup {
    const startServices = createStartServicesGetter(core.getStartServices);

    setTheme(core.theme);

    const searchService = this.searchService.setup(core, {
      usageCollection,
      expressions,
      management,
      nowProvider: this.nowProvider,
    });

    const queryService = this.queryService.setup({
      uiSettings: core.uiSettings,
      storage: this.storage,
      nowProvider: this.nowProvider,
    });

    uiActions.registerTrigger(applyFilterTrigger);

    inspector.registerView(
      getTableViewDescription(() => ({
        uiActions: startServices().plugins.uiActions,
        uiSettings: startServices().core.uiSettings,
        fieldFormats: startServices().self.fieldFormats,
        isFilterable: startServices().self.datatableUtilities.isFilterable,
      }))
    );

    fieldFormats.register(
      getAggsFormats((serializedFieldFormat) =>
        startServices().plugins.fieldFormats.deserialize(serializedFieldFormat)
      )
    );

    core.analytics.registerEventType({
      eventType: EVENT_TYPE_DATA_SEARCH_TIMEOUT,
      schema: {
        [EVENT_PROPERTY_SEARCH_TIMEOUT_MS]: {
          type: 'long',
          _meta: {
            description:
              'The time (in ms) before the search request was aborted due to timeout (search:timeout advanced setting)',
          },
        },
        [EVENT_PROPERTY_EXECUTION_CONTEXT]: {
          type: 'pass_through',
          _meta: {
            description: 'Execution context of the search request that timed out',
          },
        },
      },
    });

    return {
      search: searchService,
      query: queryService,
    };
  }

  public start(
    core: CoreStart,
    { uiActions, fieldFormats, dataViews, inspector, screenshotMode }: DataStartDependencies
  ): DataPublicPluginStart {
    const { uiSettings, overlays } = core;
    setOverlays(overlays);
    setUiSettings(uiSettings);
    setIndexPatterns(dataViews);

    const query = this.queryService.start({
      storage: this.storage,
      http: core.http,
      uiSettings,
    });

    const search = this.searchService.start(core, {
      fieldFormats,
      indexPatterns: dataViews,
      inspector,
      screenshotMode,
      scriptedFieldsEnabled: dataViews.scriptedFieldsEnabled,
    });
    setSearchService(search);

    uiActions.addTriggerActionAsync('SELECT_RANGE_TRIGGER', 'ACTION_SELECT_RANGE', async () => {
      const { createSelectRangeActionDefinition } = await import('./actions');
      const rangeSelectAction = createSelectRangeActionDefinition(() => ({
        uiActions,
      }));
      return rangeSelectAction;
    });

    uiActions.addTriggerActionAsync('VALUE_CLICK_TRIGGER', 'ACTION_VALUE_CLICK', async () => {
      const { createValueClickActionDefinition } = await import('./actions');
      const valueClickAction = createValueClickActionDefinition(() => ({
        uiActions,
      }));
      return valueClickAction;
    });

    uiActions.addTriggerActionAsync(
      'MULTI_VALUE_CLICK_TRIGGER',
      'ACTION_MULTI_VALUE_CLICK',
      async () => {
        const { createMultiValueClickActionDefinition } = await import('./actions');
        const multiValueClickAction = createMultiValueClickActionDefinition(() => ({
          query,
        }));
        return multiValueClickAction;
      }
    );

    const datatableUtilities = new DatatableUtilitiesService(search.aggs, dataViews, fieldFormats);
    const dataServices = {
      actions: {
        createFiltersFromValueClickAction: async (context: ValueClickDataContext) => {
          const { createFiltersFromValueClickAction } = await import('./actions/filters');
          return createFiltersFromValueClickAction(context);
        },
        createFiltersFromRangeSelectAction: async (context: RangeSelectDataContext) => {
          const { createFiltersFromRangeSelectAction } = await import('./actions/filters');
          return createFiltersFromRangeSelectAction(context);
        },
        createFiltersFromMultiValueClickAction: async (context: MultiValueClickDataContext) => {
          const { createFiltersFromMultiValueClickAction } = await import('./actions/filters');
          return createFiltersFromMultiValueClickAction(context);
        },
      },
      datatableUtilities,
      fieldFormats,
      indexPatterns: dataViews,
      dataViews,
      query,
      search,
      nowProvider: this.nowProvider,
    };

    return dataServices;
  }

  public stop() {
    this.queryService.stop();
    this.searchService.stop();
  }
}
