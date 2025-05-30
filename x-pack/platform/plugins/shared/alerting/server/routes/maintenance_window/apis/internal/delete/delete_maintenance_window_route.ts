/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import type { ILicenseState } from '../../../../../lib';
import { verifyAccessAndContext } from '../../../../lib';
import type { AlertingRequestHandlerContext } from '../../../../../types';
import { INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH } from '../../../../../types';
import { MAINTENANCE_WINDOW_API_PRIVILEGES } from '../../../../../../common';

import type { DeleteMaintenanceWindowRequestParamsV1 } from '../../../../../../common/routes/maintenance_window/internal/apis/delete';
import { deleteParamsSchemaV1 } from '../../../../../../common/routes/maintenance_window/internal/apis/delete';

export const deleteMaintenanceWindowRoute = (
  router: IRouter<AlertingRequestHandlerContext>,
  licenseState: ILicenseState
) => {
  router.delete(
    {
      path: `${INTERNAL_ALERTING_API_MAINTENANCE_WINDOW_PATH}/{id}`,
      validate: {
        params: deleteParamsSchemaV1,
      },
      security: {
        authz: {
          requiredPrivileges: [`${MAINTENANCE_WINDOW_API_PRIVILEGES.WRITE_MAINTENANCE_WINDOW}`],
        },
      },
      options: {
        access: 'internal',
      },
    },
    router.handleLegacyErrors(
      verifyAccessAndContext(licenseState, async function (context, req, res) {
        licenseState.ensureLicenseForMaintenanceWindow();

        const params: DeleteMaintenanceWindowRequestParamsV1 = req.params;

        const maintenanceWindowClient = (await context.alerting).getMaintenanceWindowClient();

        await maintenanceWindowClient.delete({ id: params.id });

        return res.noContent();
      })
    )
  );
};
