import { DashboardResponseSchema, type DashboardResponse } from '@apopto/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  billingPortalScopes,
  createStripePortalSession,
  getBilling,
} from '../api/billing';
import { isApiClientError } from '../api/client';
import { bootstrapPortalContext } from '../api/portalBootstrap';
import { useApiClient } from '../api/useApiClient';
import ErrorState from '../components/app/ErrorState';
import LoadingState from '../components/app/LoadingState';
import InvoiceList from '../components/billing/InvoiceList';
import StripePortalPanel from '../components/billing/StripePortalPanel';
import { formatPortalChoice } from '../components/dashboard/dashboardFormatters';

function errorMessage(error: unknown) {
  if (isApiClientError(error)) {
    return error.message;
  }

  return error instanceof Error ? error.message : undefined;
}

function isStripeUnconfigured(error: unknown) {
  return isApiClientError(error)
    && error.status === 501
    && error.error === 'stripe_not_configured';
}

function unavailableMessage(dashboard: DashboardResponse) {
  if (dashboard.client.status === 'lead' || dashboard.client.status === 'intake_submitted') {
    return 'Billing opens once the project is active or moves into maintenance.';
  }

  return 'Billing is not available for this client status.';
}

export default function Billing() {
  const apiClient = useApiClient({ scopes: billingPortalScopes });
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      await bootstrapPortalContext(apiClient);

      return DashboardResponseSchema.parse(await apiClient.get('/api/dashboard'));
    },
  });
  const billingQuery = useQuery({
    enabled: dashboardQuery.data?.featureFlags.canViewBilling === true,
    queryKey: ['billing'],
    queryFn: () => getBilling(apiClient),
  });
  const portalMutation = useMutation({
    mutationFn: async () => {
      const returnUrl = window.location.href;
      const response = await createStripePortalSession(apiClient, returnUrl);

      window.location.assign(response.url);
    },
  });

  if (dashboardQuery.isLoading) {
    return (
      <LoadingState
        message="Checking your client status before opening billing."
        title="Loading billing."
      />
    );
  }

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        error={dashboardQuery.error}
        title="Billing could not load."
      />
    );
  }

  const dashboard = dashboardQuery.data;

  if (!dashboard) {
    return (
      <ErrorState
        message="The dashboard response was empty. Please refresh and try again."
        title="Billing could not load."
      />
    );
  }

  const canViewBilling = dashboard.featureFlags.canViewBilling;
  const stripeUnconfigured = isStripeUnconfigured(portalMutation.error);

  return (
    <section className="account-page billing-page" aria-labelledby="billing-title">
      <div className="account-card dashboard-shell billing-shell portal-page-shell">
        <div className="portal-page-header dashboard-heading">
          <div>
            <p className="account-eyebrow">Client portal</p>
            <h1 id="billing-title">Billing</h1>
            <p className="billing-page-lede">
              Review invoice metadata and open Stripe-hosted billing tools when available.
            </p>
          </div>
          <span className="dashboard-status-pill">{formatPortalChoice(dashboard.client.status)}</span>
        </div>

        {!canViewBilling ? (
          <section className="account-status-panel billing-unavailable-panel">
            <span className="dashboard-panel-label">Billing access</span>
            <h2>Billing is not open yet.</h2>
            <p>{unavailableMessage(dashboard)}</p>
            <Link className="account-secondary-action dashboard-card-link" to="/dashboard">
              Back to dashboard
            </Link>
          </section>
        ) : (
          <div className="portal-workspace-two-column billing-layout">
            <div className="portal-workspace-scroll">
              <InvoiceList
                errorMessage={errorMessage(billingQuery.error)}
                invoices={billingQuery.data?.invoices ?? []}
                loading={billingQuery.isLoading}
              />
            </div>
            <div className="portal-workspace-scroll">
              <StripePortalPanel
                errorMessage={errorMessage(portalMutation.error)}
                onOpenPortal={() => portalMutation.mutate()}
                opening={portalMutation.isPending}
                stripeUnconfigured={stripeUnconfigured}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
