import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import { errorResponse } from '../shared/response.js';
import type { ApiGatewayLikeResponse } from '../shared/response.js';
import type { ApiRouteDefinition, HandlerGroupName } from './routeOwnership.js';
import { toRouteKey } from './routeOwnership.js';

type HandlerGroupEvent = Pick<APIGatewayProxyEventV2, 'rawPath' | 'routeKey'> & {
  requestContext?: {
    http?: {
      method?: string;
      path?: string;
    };
  };
};

function getRequestedRouteKey(event: HandlerGroupEvent) {
  if (event.routeKey && event.routeKey !== '$default') {
    return event.routeKey;
  }

  const method = event.requestContext?.http?.method ?? 'UNKNOWN';
  const path = event.rawPath ?? event.requestContext?.http?.path ?? 'unknown';

  return `${method} ${path}`;
}

export function createNotImplementedHandler(
  groupName: HandlerGroupName,
  routes: readonly ApiRouteDefinition[],
) {
  return async (
    event: APIGatewayProxyEventV2,
    _context: Context,
  ): Promise<ApiGatewayLikeResponse> => {
    const routeKey = getRequestedRouteKey(event);
    const matchedRoute = routes.find((route) => toRouteKey(route) === routeKey);

    return errorResponse(
      501,
      'not_implemented',
      `${groupName} API routes are reserved but not implemented in this phase.`,
      {
        group: groupName,
        routeKey,
        operation: matchedRoute?.operation ?? null,
        ownedRoutes: routes.map(toRouteKey),
      },
    );
  };
}
