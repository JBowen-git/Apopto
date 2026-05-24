import {
  BillingResponseSchema,
  CreateStripePortalSessionRequestSchema,
  CreateStripePortalSessionResponseSchema,
} from '@apopto/shared';
import type { ApiClient } from './client';

export const billingPortalScopes = [
  'read:client',
  'read:billing',
] as const;

export async function getBilling(apiClient: ApiClient) {
  return BillingResponseSchema.parse(await apiClient.get('/api/billing'));
}

export async function createStripePortalSession(
  apiClient: ApiClient,
  returnUrl?: string,
) {
  const body = CreateStripePortalSessionRequestSchema.parse({
    ...(returnUrl ? { returnUrl } : {}),
  });

  return CreateStripePortalSessionResponseSchema.parse(
    await apiClient.post('/api/billing/stripe-portal-session', body),
  );
}
