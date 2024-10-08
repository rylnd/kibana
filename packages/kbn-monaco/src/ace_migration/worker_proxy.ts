/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../monaco_imports';
import { ParserWorker, ParseResult } from './types';

export class WorkerProxyService<IWorker extends ParserWorker> {
  private worker: monaco.editor.MonacoWebWorker<IWorker> | undefined;

  public async getAnnos(modelUri: monaco.Uri): Promise<ParseResult | undefined> {
    if (!this.worker) {
      throw new Error('Worker Proxy Service has not been setup!');
    }
    await this.worker.withSyncedResources([modelUri]);
    const proxy = await this.worker.getProxy();
    return proxy.parse(modelUri.toString());
  }

  public setup(langId: string) {
    this.worker = monaco.editor.createWebWorker({ label: langId, moduleId: '' });
  }

  public stop() {
    if (this.worker) this.worker.dispose();
  }
}
