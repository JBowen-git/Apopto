import { MeResponseSchema, type MeResponse } from '@apopto/shared';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../api/useApiClient';
import ErrorState from '../components/app/ErrorState';
import LoadingState from '../components/app/LoadingState';

function formatStatus(status: string) {
  return status
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function enabledFeatureLabels(featureFlags: MeResponse['featureFlags']) {
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
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => MeResponseSchema.parse(await apiClient.get('/api/me')),
  });

  if (meQuery.isLoading) {
    return (
      <LoadingState
        message="Loading your client portal context."
        title="Opening your dashboard."
      />
    );
  }

  if (meQuery.isError) {
    return (
      <ErrorState
        error={meQuery.error}
        title="Dashboard could not load."
      />
    );
  }

  const me = meQuery.data;

  if (!me) {
    return (
      <ErrorState
        message="The dashboard response was empty. Please refresh and try again."
        title="Dashboard could not load."
      />
    );
  }

  const enabledFeatures = enabledFeatureLabels(me.featureFlags);

  return (
    <section className="account-page dashboard-page" aria-labelledby="dashboard-title">
      <div className="account-card dashboard-shell">
        <p className="account-eyebrow">Client portal</p>
        <div className="dashboard-heading">
          <h1 id="dashboard-title">Dashboard</h1>
          <span className="dashboard-status-pill">{formatStatus(me.client.status)}</span>
        </div>

        <div className="dashboard-summary-grid">
          <section className="account-status-panel dashboard-summary-panel">
            <span className="dashboard-panel-label">Signed in as</span>
            <h2>{me.user.name ?? 'Customer account'}</h2>
            <p>{me.user.email ?? me.user.auth0Sub}</p>
          </section>

          <section className="account-status-panel dashboard-summary-panel">
            <span className="dashboard-panel-label">Client</span>
            <h2>{me.client.businessName || 'New Client'}</h2>
            <p>{formatStatus(me.membership.role)} · {formatStatus(me.membership.status)}</p>
          </section>
        </div>

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
        </section>
      </div>
    </section>
  );
}
