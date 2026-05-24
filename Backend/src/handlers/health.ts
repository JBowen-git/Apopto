import { getSharedPackageStatus } from '@apopto/shared';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { jsonResponse, requestMetadata } from '../shared/response.js';
import { verifySharedSchemasAvailable } from '../shared/sharedSchemaSmoke.js';

export async function handler(event: APIGatewayProxyEventV2, context: Context) {
  verifySharedSchemasAvailable();
  const responseContext = requestMetadata(event, context);

  return jsonResponse(200, {
    status: 'ok',
    environment: process.env.APP_ENVIRONMENT ?? 'unknown',
    shared: getSharedPackageStatus(),
  }, responseContext);
}

export async function smokeHandler() {
  return jsonResponse(200, {
    status: 'ok',
    environment: 'local',
    shared: getSharedPackageStatus(),
    featureFlags: verifySharedSchemasAvailable(),
  }, { requestId: 'local-smoke', correlationId: 'local-smoke' });
}
