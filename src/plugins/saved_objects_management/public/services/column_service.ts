/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SpacesApi } from '@kbn/spaces-plugin/public';
import { ShareToSpaceSavedObjectsManagementColumn } from './columns';
import { SavedObjectsManagementColumn } from './types';

export interface SavedObjectsManagementColumnServiceSetup {
  /**
   * register given column in the registry.
   */
  register: (column: SavedObjectsManagementColumn) => void;
}

export interface SavedObjectsManagementColumnServiceStart {
  /**
   * return all {@link SavedObjectsManagementColumn | columns} currently registered.
   */
  getAll: () => SavedObjectsManagementColumn[];
}

export class SavedObjectsManagementColumnService {
  private readonly columns = new Map<string, SavedObjectsManagementColumn>();

  setup(): SavedObjectsManagementColumnServiceSetup {
    return {
      register: (column) => this.register(column),
    };
  }

  start(spacesApi?: SpacesApi): SavedObjectsManagementColumnServiceStart {
    if (spacesApi && !spacesApi.hasOnlyDefaultSpace) {
      this.register(new ShareToSpaceSavedObjectsManagementColumn(spacesApi.ui));
    }
    return {
      getAll: () => [...this.columns.values()],
    };
  }

  private register(column: SavedObjectsManagementColumn) {
    if (this.columns.has(column.id)) {
      throw new Error(`Saved Objects Management Column with id '${column.id}' already exists`);
    }
    this.columns.set(column.id, column);
  }
}
