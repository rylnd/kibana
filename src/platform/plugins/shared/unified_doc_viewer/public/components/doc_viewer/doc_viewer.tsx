/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useMemo } from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { DocViewer, DocViewerApi } from '@kbn/unified-doc-viewer';

import { getUnifiedDocViewerServices } from '../../plugin';

export const UnifiedDocViewer = forwardRef<DocViewerApi, DocViewRenderProps>(
  ({ docViewsRegistry, ...props }, ref) => {
    const { unifiedDocViewer } = getUnifiedDocViewerServices();

    const registry = useMemo(() => {
      if (docViewsRegistry) {
        return typeof docViewsRegistry === 'function'
          ? docViewsRegistry(unifiedDocViewer.registry.clone())
          : docViewsRegistry;
      }
      return unifiedDocViewer.registry;
    }, [docViewsRegistry, unifiedDocViewer.registry]);

    return <DocViewer ref={ref} docViews={registry.getAll()} {...props} />;
  }
);
