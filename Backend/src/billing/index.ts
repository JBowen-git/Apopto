import {
  BillingResponseSchema,
  CreateStripePortalSessionRequestSchema,
  CreateStripePortalSessionResponseSchema,
  type BillingResponse,
  type CreateStripePortalSessionRequest,
  type CreateStripePortalSessionResponse,
} from '@apopto/shared';

import {
  pk,
  type InvoiceItem,
  type PortalTableItem,
} from '../dynamodb/index.js';
import { validateWithSchema } from '../shared/validation.js';
import {
  resolveClientContext,
  type TenantResolverRepository,
} from '../tenant/index.js';

export const billingSliceLimits = {
  invoices: 50,
} as const;

export type BillingRepository = TenantResolverRepository & {
  queryByPartition<TItem extends PortalTableItem = PortalTableItem>(
    options: {
      pk: string;
      skBeginsWith?: string;
      limit?: number;
      scanIndexForward?: boolean;
      consistentRead?: boolean;
    },
  ): Promise<TItem[]>;
};

export type StripePortalSessionInput = {
  customerId: string;
  returnUrl?: string;
  stripeSecretKey: string;
};

export type StripePortalSessionCreator = (
  input: StripePortalSessionInput,
) => Promise<CreateStripePortalSessionResponse>;

export type BillingApiFailure = {
  ok: false;
  statusCode: 400 | 401 | 403 | 404 | 409 | 500 | 501 | 502;
  error: string;
  message: string;
  details?: unknown;
};

export type GetBillingResult =
  | { ok: true; response: BillingResponse }
  | BillingApiFailure;

export type StripePortalSessionResult =
  | { ok: true; response: CreateStripePortalSessionResponse }
  | BillingApiFailure;

export type BillingServiceInput = {
  auth0Sub: string;
  repository: BillingRepository;
};

export type CreateStripePortalSessionInput = BillingServiceInput & {
  body: unknown;
  createStripePortalSession?: StripePortalSessionCreator;
  stripeSecretKey?: string;
};

function isInvoiceItem(item: PortalTableItem): item is InvoiceItem {
  return item.type === 'INVOICE';
}

function failureFromTenantResolution(
  result: Awaited<ReturnType<typeof resolveClientContext>>,
): BillingApiFailure {
  if (result.ok) {
    throw new Error('Resolved tenant context cannot be converted to a failure.');
  }

  if (result.reason === 'user_not_found') {
    return {
      ok: false,
      statusCode: 401,
      error: 'user_not_found',
      message: 'The authenticated user has not been initialized in the client portal.',
    };
  }

  if (result.reason === 'no_active_membership') {
    return {
      ok: false,
      statusCode: 403,
      error: 'no_active_membership',
      message: 'The authenticated user does not have an active client membership.',
      details: {
        memberships: result.memberships,
      },
    };
  }

  if (result.reason === 'multiple_active_memberships') {
    return {
      ok: false,
      statusCode: 409,
      error: 'tenant_context_not_ready',
      message: 'The authenticated user could not be mapped to exactly one active client.',
      details: {
        memberships: result.memberships,
      },
    };
  }

  return {
    ok: false,
    statusCode: 500,
    error: 'client_profile_missing',
    message: 'The active client membership points to a missing client profile.',
    details: {
      clientId: result.membership.clientId,
    },
  };
}

async function resolveBillingContext({
  auth0Sub,
  repository,
}: BillingServiceInput): Promise<
  | { ok: true; clientId: string }
  | BillingApiFailure
> {
  const result = await resolveClientContext({ auth0Sub, repository });

  if (!result.ok) {
    return failureFromTenantResolution(result);
  }

  if (!result.context.featureFlags.canViewBilling) {
    return {
      ok: false,
      statusCode: 403,
      error: 'billing_not_available',
      message: 'Billing is not available for this client status.',
      details: {
        clientStatus: result.context.client.status,
      },
    };
  }

  return {
    ok: true,
    clientId: result.context.client.clientId,
  };
}

function invoiceSummary(invoice: InvoiceItem) {
  return {
    amountDue: invoice.amountDue,
    createdAt: invoice.createdAt,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    invoiceId: invoice.invoiceId,
    provider: invoice.provider,
    status: invoice.status,
    updatedAt: invoice.updatedAt,
  };
}

async function listClientInvoices({
  clientId,
  repository,
}: {
  clientId: string;
  repository: BillingRepository;
}) {
  const invoices = await repository.queryByPartition<InvoiceItem>({
    limit: billingSliceLimits.invoices,
    pk: pk.client(clientId),
    scanIndexForward: true,
    skBeginsWith: 'INVOICE#',
  });

  return invoices.filter((invoice) => (
    isInvoiceItem(invoice)
    && invoice.clientId === clientId
  ));
}

function validationFailure(issues: unknown[]): BillingApiFailure {
  return {
    ok: false,
    statusCode: 400,
    error: 'validation_failed',
    message: 'The request body did not match the expected schema.',
    details: {
      issues,
    },
  };
}

function stripeNotConfiguredFailure(): BillingApiFailure {
  return {
    ok: false,
    statusCode: 501,
    error: 'stripe_not_configured',
    message: 'Stripe billing portal sessions are not configured for this environment.',
  };
}

export async function createStripeBillingPortalSession({
  customerId,
  returnUrl,
  stripeSecretKey,
}: StripePortalSessionInput): Promise<CreateStripePortalSessionResponse> {
  const body = new URLSearchParams({
    customer: customerId,
  });

  if (returnUrl) {
    body.set('return_url', returnUrl);
  }

  const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    body,
    headers: {
      authorization: `Bearer ${stripeSecretKey}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  });
  const payload = await response.json() as {
    error?: { message?: string; type?: string };
    url?: string;
  };

  if (!response.ok || !payload.url) {
    const message = payload.error?.message
      ?? 'Stripe did not return a billing portal session URL.';

    throw Object.assign(new Error(message), {
      name: payload.error?.type ?? 'StripePortalSessionError',
      statusCode: response.status,
    });
  }

  return CreateStripePortalSessionResponseSchema.parse({
    url: payload.url,
  });
}

export async function getBilling({
  auth0Sub,
  repository,
}: BillingServiceInput): Promise<GetBillingResult> {
  const resolved = await resolveBillingContext({ auth0Sub, repository });

  if (!resolved.ok) {
    return resolved;
  }

  const invoices = await listClientInvoices({
    clientId: resolved.clientId,
    repository,
  });

  return {
    ok: true,
    response: BillingResponseSchema.parse({
      invoices: invoices.map(invoiceSummary),
    }),
  };
}

export async function createStripePortalSession({
  auth0Sub,
  body,
  createStripePortalSession = createStripeBillingPortalSession,
  repository,
  stripeSecretKey,
}: CreateStripePortalSessionInput): Promise<StripePortalSessionResult> {
  const parsed = validateWithSchema<CreateStripePortalSessionRequest>(
    CreateStripePortalSessionRequestSchema,
    body,
  );

  if (!parsed.ok) {
    return validationFailure(parsed.issues);
  }

  const resolved = await resolveBillingContext({ auth0Sub, repository });

  if (!resolved.ok) {
    return resolved;
  }

  if (!stripeSecretKey?.trim()) {
    return stripeNotConfiguredFailure();
  }

  const invoices = await listClientInvoices({
    clientId: resolved.clientId,
    repository,
  });
  const stripeCustomerId = invoices.find((invoice) => (
    invoice.stripeCustomerId && invoice.stripeCustomerId.trim().length > 0
  ))?.stripeCustomerId;

  if (!stripeCustomerId) {
    return {
      ok: false,
      statusCode: 409,
      error: 'stripe_customer_missing',
      message: 'No Stripe customer ID is available for this client.',
    };
  }

  try {
    const response = await createStripePortalSession({
      customerId: stripeCustomerId,
      returnUrl: parsed.data.returnUrl,
      stripeSecretKey,
    });

    return {
      ok: true,
      response,
    };
  } catch (error) {
    return {
      ok: false,
      statusCode: 502,
      error: 'stripe_portal_session_failed',
      message: 'Stripe could not create a billing portal session.',
      details: {
        errorName: (error as { name?: string }).name ?? 'UnknownError',
      },
    };
  }
}
