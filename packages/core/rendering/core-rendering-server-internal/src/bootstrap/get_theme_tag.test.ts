/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getThemeTag } from './get_theme_tag';

describe('getThemeTag', () => {
  it('returns the correct value for name:v8 and darkMode:false', () => {
    expect(
      getThemeTag({
        name: 'v8',
        darkMode: false,
      })
    ).toEqual('v8light');
  });
  it('returns the correct value for name:v8 and darkMode:true', () => {
    expect(
      getThemeTag({
        name: 'v8',
        darkMode: true,
      })
    ).toEqual('v8dark');
  });
});
