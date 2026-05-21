import { getSharedPackageStatus } from '@apopto/shared';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { jsonResponse } from '../shared/response.js';
import { verifySharedSchemasAvailable } from '../shared/sharedSchemaSmoke.js';

export async function handler(_event: APIGatewayProxyEventV2, context: Context) {
  verifySharedSchemasAvailable();

  return jsonResponse(200, {
    status: 'ok',
    environment: process.env.APP_ENVIRONMENT ?? 'unknown',
    requestId: context.awsRequestId,
    shared: getSharedPackageStatus(),
  });
}

export async function smokeHandler() {
  return jsonResponse(200, {
    status: 'ok',
    environment: 'local',
    requestId: 'local-smoke',
    shared: getSharedPackageStatus(),
    featureFlags: verifySharedSchemasAvailable(),
  });
}
