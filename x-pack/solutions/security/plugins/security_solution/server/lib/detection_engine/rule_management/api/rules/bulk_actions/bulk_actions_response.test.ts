/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core/server/mocks';

import { buildBulkResponse } from './bulk_actions_response';
import { BulkActionTypeEnum } from '../../../../../../../common/api/detection_engine';

describe('buildBulkResponse', () => {
  let mockResponseFactory: ReturnType<typeof httpServerMock.createResponseFactory>;
  beforeEach(() => {
    mockResponseFactory = httpServerMock.createResponseFactory();
  });

  it('builds a bulk response with the correct structure', () => {
    buildBulkResponse(mockResponseFactory, {
      bulkAction: BulkActionTypeEnum.duplicate,
      isDryRun: false,
      errors: [],
      updated: [],
      created: [],
      deleted: [],
      skipped: [],
    });

    expect(mockResponseFactory.ok).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          success: true,
          rules_count: 0,
          attributes: expect.objectContaining({
            results: expect.objectContaining({
              updated: [],
              created: [],
              deleted: [],
              skipped: [],
            }),
            summary: expect.objectContaining({
              failed: 0,
              succeeded: 0,
              skipped: 0,
              total: 0,
            }),
          }),
        }),
      })
    );
  });

  describe('responses with errors', () => {
    it('returns error messages in the expected format', () => {
      const errorOutcome = {
        item: 'N/A',
        error: new Error('Something went wrong'),
      };

      buildBulkResponse(mockResponseFactory, {
        bulkAction: BulkActionTypeEnum.duplicate,
        isDryRun: false,
        errors: [errorOutcome],
        updated: [],
        created: [],
        deleted: [],
        skipped: [],
      });

      expect(mockResponseFactory.custom).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            message: 'Bulk edit failed',
            status_code: 500,
            attributes: expect.objectContaining({
              errors: [
                expect.objectContaining({
                  message: 'Something went wrong',
                  status_code: 500,
                  rules: [{ id: 'N/A' }],
                }),
              ],
            }),
          }),
          statusCode: 500,
        })
      );
    });

    it('responds with a status code of 403 if the error is a 403', () => {
      const errorOutcome = {
        item: 'N/A',
        error: Boom.forbidden('You do not have permission to perform this action'),
      };

      buildBulkResponse(mockResponseFactory, {
        bulkAction: BulkActionTypeEnum.duplicate,
        isDryRun: false,
        errors: [errorOutcome],
        updated: [],
        created: [],
        deleted: [],
        skipped: [],
      });

      expect(mockResponseFactory.custom).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            message: 'Bulk edit failed',
            status_code: 403,
            attributes: expect.objectContaining({
              errors: [
                expect.objectContaining({
                  message: 'You do not have permission to perform this action',
                  status_code: 403,
                  rules: [{ id: 'N/A' }],
                }),
              ],
            }),
          }),
          statusCode: 403,
        })
      );
    });

    it('responds with a status code of 500 if there is a 500 error', () => {
      const errorOutcome = {
        item: 'N/A',
        error: Boom.internal('Something went wrong'),
      };

      buildBulkResponse(mockResponseFactory, {
        bulkAction: BulkActionTypeEnum.duplicate,
        isDryRun: false,
        errors: [errorOutcome],
        updated: [],
        created: [],
        deleted: [],
        skipped: [],
      });

      expect(mockResponseFactory.custom).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            message: 'Bulk edit failed',
            status_code: 500,
            attributes: expect.objectContaining({
              errors: [
                expect.objectContaining({
                  message: 'An internal server error occurred',
                  status_code: 500,
                  rules: [{ id: 'N/A' }],
                }),
              ],
            }),
          }),
          statusCode: 500,
        })
      );
    });

    it('responds with the highest status code if there are multiple errors of the same tier of status code', () => {
      buildBulkResponse(mockResponseFactory, {
        bulkAction: BulkActionTypeEnum.duplicate,
        isDryRun: false,
        errors: [
          {
            item: 'mocked',
            error: Boom.forbidden('You do not have permission to perform this action'),
          },
          {
            item: 'mocked2',
            error: Boom.badRequest('User error'),
          },
        ],
        updated: [],
        created: [],
        deleted: [],
        skipped: [],
      });

      expect(mockResponseFactory.custom).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            message: 'Bulk edit failed',
            status_code: 403,
            attributes: expect.objectContaining({
              errors: [
                expect.objectContaining({
                  message: 'You do not have permission to perform this action',
                  status_code: 403,
                  rules: [{ id: 'mocked' }],
                }),
                expect.objectContaining({
                  message: 'User error',
                  status_code: 400,
                  rules: [{ id: 'mocked2' }],
                }),
              ],
            }),
          }),
          statusCode: 403,
        })
      );
    });

    it('responds with the highest status code if there are multiple errors of different tiers of status codes', () => {
      buildBulkResponse(mockResponseFactory, {
        bulkAction: BulkActionTypeEnum.duplicate,
        isDryRun: false,
        errors: [
          {
            item: 'mocked',
            error: Boom.forbidden('You do not have permission to perform this action'),
          },
          {
            item: 'mocked2',
            error: Boom.internal('Something went wrong'),
          },
        ],
        updated: [],
        created: [],
        deleted: [],
        skipped: [],
      });

      expect(mockResponseFactory.custom).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            message: 'Bulk edit failed',
            status_code: 500,
            attributes: expect.objectContaining({
              errors: [
                expect.objectContaining({
                  message: 'You do not have permission to perform this action',
                  status_code: 403,
                  rules: [{ id: 'mocked' }],
                }),
                expect.objectContaining({
                  message: 'An internal server error occurred',
                  status_code: 500,
                  rules: [{ id: 'mocked2' }],
                }),
              ],
            }),
          }),
          statusCode: 500,
        })
      );
    });
  });
});
