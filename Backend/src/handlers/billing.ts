import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { AuthClaimError, missingScopes, parseAuth0Claims, type Auth0Claims } from '../auth/index.js';
import {
  createStripePortalSession,
  getBilling,
  type BillingApiFailure,
  type BillingRepository,
  type StripePortalSessionCreator,
} from '../billing/index.js';
import {
  createDynamoDocumentClient,
  createPortalRepository,
  getClientPortalTableName,
} from '../dynamodb/index.js';
import { createNotImplementedHandler } from '../router/notImplemented.js';
import { billingRoutes } from '../router/routeOwnership.js';
import {
  errorResponse,
  getRequestId,
  jsonResponse,
  unauthorizedResponse,
  type ApiGatewayLikeResponse,
} from '../shared/response.js';

export type BillingHandlerEnvironment = {
  CLIENT_PORTAL_TABLE?: string;
  STRIPE_SECRET_KEY?: string;
};

export type BillingHandlerDependencies = {
  createStripePortalSession?: StripePortalSessionCreator;
  environment?: BillingHandlerEnvironment;
  repository?: BillingRepository;
};

const notImplementedHandler = createNotImplementedHandler('billing', billingRoutes);

const routeScopes: Record<string, string[]> = {
  'GET /api/billing': ['read:billing'],
  'POST /api/billing/stripe-portal-session': ['read:billing'],
};

function getRouteKey(event: APIGatewayProxyEventV2) {
  if (event.routeKey && event.routeKey !== '$default') {
    return event.routeKey;
  }

  return `${event.requestContext.http.method} ${event.rawPath}`;
}

function parseJsonBody(event: APIGatewayProxyEventV2) {
  if (!event.body) {
    return {};
  }

  const body = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  return JSON.parse(body) as unknown;
}

function defaultRepository(tableName: string): BillingRepository {
  return createPortalRepository({
    tableName,
    client: createDynamoDocumentClient(),
  });
}

function getRequiredEnvironment(environment: BillingHandlerEnvironment) {
  const tableName = environment.CLIENT_PORTAL_TABLE?.trim();

  if (!tableName) {
    throw new Error('CLIENT_PORTAL_TABLE is required for the billing handler.');
  }

  return {
    stripeSecretKey: environment.STRIPE_SECRET_KEY?.trim(),
    tableName,
  };
}

function scopeFailureResponse(
  routeKey: string,
  claims: Auth0Claims,
  requestId: string | undefined,
) {
  const requiredScopes = routeScopes[routeKey] ?? [];
  const missing = missingScopes(claims, requiredScopes);

  if (missing.length === 0) {
    return null;
  }

  return errorResponse(
    403,
    'insufficient_scope',
    'The access token does not include the permissions required for this route.',
    {
      missingScopes: missing,
      requiredScopes,
    },
    { requestId },
  );
}

function failureResponse(result: BillingApiFailure, requestId: string | undefined) {
  return errorResponse(
    result.statusCode,
    result.error,
    result.message,
    result.details,
    { requestId },
  );
}

export function createBillingHandler(dependencies: BillingHandlerDependencies = {}) {
  return async (
    event: APIGatewayProxyEventV2,
    context: Context,
  ): Promise<ApiGatewayLikeResponse> => {
    const requestId = getRequestId(event, context);
    const routeKey = getRouteKey(event);

    if (!routeScopes[routeKey]) {
      return notImplementedHandler(event, context);
    }

    try {
      const environment = dependencies.environment ?? process.env;
      const { stripeSecretKey, tableName } = getRequiredEnvironment(environment);
      const repository = dependencies.repository ?? defaultRepository(tableName);
      const claims = parseAuth0Claims(event);
      const routeScopeFailure = scopeFailureResponse(routeKey, claims, requestId);

      if (routeScopeFailure) {
        return routeScopeFailure;
      }

      if (routeKey === 'GET /api/billing') {
        const result = await getBilling({
          auth0Sub: claims.sub,
          repository,
        });

        if (!result.ok) {
          return failureResponse(result, requestId);
        }

        return jsonResponse(200, result.response, { requestId });
      }

      const result = await createStripePortalSession({
        auth0Sub: claims.sub,
        body: parseJsonBody(event),
        createStripePortalSession: dependencies.createStripePortalSession,
        repository,
        stripeSecretKey,
      });

      if (!result.ok) {
        return failureResponse(result, requestId);
      }

      return jsonResponse(200, result.response, { requestId });
    } catch (error) {
      if (error instanceof AuthClaimError) {
        return unauthorizedResponse(requestId, error.message);
      }

      if (error instanceof SyntaxError) {
        return errorResponse(
          400,
          'invalid_json',
          'The request body must be valid JSON.',
          undefined,
          { requestId },
        );
      }

      return errorResponse(
        500,
        'internal_error',
        'The billing request could not be completed.',
        {
          errorName: (error as { name?: string }).name ?? 'UnknownError',
        },
        { requestId },
      );
    }
  };
}

export const handler = createBillingHandler();
