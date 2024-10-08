/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { mergeSavedObjectMigrations, mergeSavedObjectMigrationMaps } from './src/merge_migrations';
export {
  SavedObjectsUtils,
  ALL_NAMESPACES_STRING,
  DEFAULT_NAMESPACE_STRING,
  FIND_DEFAULT_PAGE,
  FIND_DEFAULT_PER_PAGE,
} from './src/saved_objects_utils';

export { setsAreEqual, arrayMapsAreEqual, setMapsAreEqual } from './src/saved_objects_test_utils';
