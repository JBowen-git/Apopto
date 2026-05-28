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
  jsonResponse,
  requestMetadata,
  unauthorizedResponse,
  type ApiGatewayLikeResponse,
  type ResponseRequestContext,
} from '../shared/response.js';
import {
  resolveRuntimeParameter,
  type RuntimeParameterResolver,
} from '../shared/parameterStore.js';

export type BillingHandlerEnvironment = {
  CLIENT_PORTAL_TABLE?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_SECRET_KEY_PARAMETER_NAME?: string;
};

export type BillingHandlerDependencies = {
  createStripePortalSession?: StripePortalSessionCreator;
  environment?: BillingHandlerEnvironment;
  repository?: BillingRepository;
  resolveRuntimeParameter?: RuntimeParameterResolver;
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
    stripeSecretKey: environment.STRIPE_SECRET_KEY?.trim() || undefined,
    stripeSecretKeyParameterName: environment.STRIPE_SECRET_KEY_PARAMETER_NAME?.trim() || undefined,
    tableName,
  };
}

async function resolveStripeSecretKey({
  directValue,
  parameterName,
  resolver,
}: {
  directValue?: string;
  parameterName?: string;
  resolver: RuntimeParameterResolver;
}) {
  if (directValue) {
    return directValue;
  }

  if (!parameterName) {
    return undefined;
  }

  return resolver(parameterName);
}

function scopeFailureResponse(
  routeKey: string,
  claims: Auth0Claims,
  responseContext: ResponseRequestContext,
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
    responseContext,
  );
}

function failureResponse(result: BillingApiFailure, responseContext: ResponseRequestContext) {
  return errorResponse(
    result.statusCode,
    result.error,
    result.message,
    result.details,
    responseContext,
  );
}

export function createBillingHandler(dependencies: BillingHandlerDependencies = {}) {
  return async (
    event: APIGatewayProxyEventV2,
    context: Context,
  ): Promise<ApiGatewayLikeResponse> => {
    const routeKey = getRouteKey(event);
    const responseContext = { ...requestMetadata(event, context), routeKey };

    if (!routeScopes[routeKey]) {
      return notImplementedHandler(event, context);
    }

    try {
      const environment = dependencies.environment ?? process.env;
      const {
        stripeSecretKey,
        stripeSecretKeyParameterName,
        tableName,
      } = getRequiredEnvironment(environment);
      const repository = dependencies.repository ?? defaultRepository(tableName);
      const claims = parseAuth0Claims(event);
      const routeScopeFailure = scopeFailureResponse(routeKey, claims, responseContext);

      if (routeScopeFailure) {
        return routeScopeFailure;
      }

      if (routeKey === 'GET /api/billing') {
        const result = await getBilling({
          auth0Sub: claims.sub,
          repository,
        });

        if (!result.ok) {
          return failureResponse(result, responseContext);
        }

        return jsonResponse(200, result.response, responseContext);
      }

      const resolvedStripeSecretKey = await resolveStripeSecretKey({
        directValue: stripeSecretKey,
        parameterName: stripeSecretKeyParameterName,
        resolver: dependencies.resolveRuntimeParameter ?? resolveRuntimeParameter,
      });

      const result = await createStripePortalSession({
        auth0Sub: claims.sub,
        body: parseJsonBody(event),
        createStripePortalSession: dependencies.createStripePortalSession,
        repository,
        stripeSecretKey: resolvedStripeSecretKey,
      });

      if (!result.ok) {
        return failureResponse(result, responseContext);
      }

      return jsonResponse(200, result.response, responseContext);
    } catch (error) {
      if (error instanceof AuthClaimError) {
        return unauthorizedResponse(responseContext, error.message);
      }

      if (error instanceof SyntaxError) {
        return errorResponse(
          400,
          'invalid_json',
          'The request body must be valid JSON.',
          undefined,
          responseContext,
        );
      }

      return errorResponse(
        500,
        'internal_error',
        'The billing request could not be completed.',
        {
          errorName: (error as { name?: string }).name ?? 'UnknownError',
        },
        responseContext,
      );
    }
  };
}

export const handler = createBillingHandler();
