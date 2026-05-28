import { DashboardResponseSchema, type DashboardResponse } from '@apopto/shared';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { bootstrapPortalContext } from '../api/portalBootstrap';
import { useApiClient } from '../api/useApiClient';
import { useApoptoAuth } from '../authContext.jsx';
import { resolvePostLoginReturnTo } from '../authToken';
import ErrorState from '../components/app/ErrorState';
import LoadingState from '../components/app/LoadingState';
import DashboardLifecycleModules from '../components/dashboard/DashboardLifecycleModules';
import ClientProfileCard from '../components/dashboard/ClientProfileCard';
import DashboardNextSteps from '../components/dashboard/DashboardNextSteps';
import { formatPortalChoice } from '../components/dashboard/dashboardFormatters';
import IntakeSummaryCard from '../components/dashboard/IntakeSummaryCard';

function enabledFeatureLabels(featureFlags: DashboardResponse['featureFlags']) {
  return [
    featureFlags.canEditIntake ? 'Intake editing' : null,
    featureFlags.canSendMessages ? 'Messages' : null,
    featureFlags.canUploadFiles ? 'File uploads' : null,
    featureFlags.canViewBilling ? 'Billing' : null,
    featureFlags.canViewProjects ? 'Projects' : null,
    featureFlags.canAccessAdmin ? 'Admin access' : null,
  ].filter((label): label is string => Boolean(label));
}

export default function Dashboard() {
  const apiClient = useApiClient();
  const { getAccessToken } = useApoptoAuth() as { getAccessToken: () => Promise<string | undefined> };
  const landingQuery = useQuery({
    queryKey: ['postLoginLanding', 'dashboard'],
    queryFn: async () => resolvePostLoginReturnTo('/dashboard', await getAccessToken()),
    staleTime: 30_000,
  });
  const dashboardQuery = useQuery({
    enabled: landingQuery.isSuccess && landingQuery.data === '/dashboard',
    queryKey: ['dashboard'],
    queryFn: async () => {
      await bootstrapPortalContext(apiClient);

      return DashboardResponseSchema.parse(await apiClient.get('/api/dashboard'));
    },
  });

  if (landingQuery.isSuccess && landingQuery.data !== '/dashboard') {
    return <Navigate replace to={landingQuery.data} />;
  }

  if (landingQuery.isLoading || dashboardQuery.isLoading) {
    return (
      <LoadingState
        message="Loading your client portal context."
        title="Opening your dashboard."
      />
    );
  }

  if (landingQuery.isError) {
    return (
      <ErrorState
        error={landingQuery.error}
        title="Dashboard could not load."
      />
    );
  }

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        error={dashboardQuery.error}
        title="Dashboard could not load."
      />
    );
  }

  const dashboard = dashboardQuery.data;

  if (!dashboard) {
    return (
      <ErrorState
        message="The dashboard response was empty. Please refresh and try again."
        title="Dashboard could not load."
      />
    );
  }

  const enabledFeatures = enabledFeatureLabels(dashboard.featureFlags);

  return (
    <section className="account-page dashboard-page" aria-labelledby="dashboard-title">
      <div className="account-card dashboard-shell portal-page-shell portal-dashboard-shell">
        <div className="portal-page-header dashboard-heading">
          <div>
            <p className="account-eyebrow">Client portal</p>
            <h1 id="dashboard-title">Dashboard</h1>
          </div>
          <span className="dashboard-status-pill">{formatPortalChoice(dashboard.client.status)}</span>
        </div>

        <div className="portal-dashboard-layout">
          <div className="portal-workspace-panel-stack portal-workspace-scroll">
            <DashboardNextSteps
              nextSteps={dashboard.nextSteps}
              status={dashboard.client.status}
            />

            <DashboardLifecycleModules dashboard={dashboard} />

            <section className="account-status-panel dashboard-summary-panel">
              <span className="dashboard-panel-label">Available now</span>
              {enabledFeatures.length > 0 ? (
                <ul className="dashboard-feature-list">
                  {enabledFeatures.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              ) : (
                <p>Your portal is active. More tools will appear here as your project moves forward.</p>
              )}
              {dashboard.featureFlags.canAccessAdmin ? (
                <Link className="account-secondary-action dashboard-card-link" to="/admin/clients">
                  Open admin clients
                </Link>
              ) : null}
            </section>
          </div>

          <aside className="portal-workspace-panel-stack portal-workspace-scroll">
            <div className="dashboard-summary-grid">
              <section className="account-status-panel dashboard-summary-panel">
                <span className="dashboard-panel-label">Signed in as</span>
                <h2>{dashboard.user.name ?? 'Customer account'}</h2>
                <p>{dashboard.user.email ?? dashboard.user.auth0Sub}</p>
              </section>

              <section className="account-status-panel dashboard-summary-panel">
                <span className="dashboard-panel-label">Client</span>
                <h2>{dashboard.client.businessName || 'New Client'}</h2>
                <p>{formatPortalChoice(dashboard.membership.role)} · {formatPortalChoice(dashboard.membership.status)}</p>
              </section>
            </div>

            <ClientProfileCard
              client={dashboard.client}
              intake={dashboard.intake}
            />

            <IntakeSummaryCard
              intake={dashboard.intake}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}
