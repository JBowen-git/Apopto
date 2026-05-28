import { type ClientStatus } from '@apopto/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  getAdminClientDetail,
  updateAdminClientStatus,
} from '../api/admin';
import { isApiClientError } from '../api/client';
import { useAdminApiClient } from '../api/useAdminApiClient';
import AdminClientOverview from '../components/admin/AdminClientOverview';
import AdminIntakeSummary from '../components/admin/AdminIntakeSummary';
import AdminPeoplePanel from '../components/admin/AdminPeoplePanel';
import AdminProjectList from '../components/admin/AdminProjectList';
import AdminRecentActivity from '../components/admin/AdminRecentActivity';
import AdminStatusBadge from '../components/admin/AdminStatusBadge';
import AdminStatusChanger from '../components/admin/AdminStatusChanger';
import { formatAdminDateTime } from '../components/admin/adminFormatters';
import ErrorState from '../components/app/ErrorState';
import LoadingState from '../components/app/LoadingState';

function adminErrorTitle(error: unknown) {
  if (isApiClientError(error) && error.status === 403) {
    return 'Admin access is not available.';
  }

  if (isApiClientError(error) && error.status === 404) {
    return 'Client record was not found.';
  }

  return 'Admin client detail could not load.';
}

function saveErrorMessage(error: unknown) {
  if (isApiClientError(error)) {
    return error.requestId
      ? `${error.message} Request ID: ${error.requestId}`
      : error.message;
  }

  return error instanceof Error
    ? error.message
    : 'The client status could not be updated.';
}

export default function AdminClientDetail() {
  const apiClient = useAdminApiClient();
  const queryClient = useQueryClient();
  const { clientId } = useParams();
  const detailQuery = useQuery({
    enabled: Boolean(clientId),
    queryKey: ['adminClient', clientId],
    queryFn: () => getAdminClientDetail(apiClient, clientId ?? ''),
    staleTime: 60_000,
  });
  const statusMutation = useMutation({
    mutationFn: (status: ClientStatus) => {
      if (!clientId) {
        throw new Error('A clientId route parameter is required.');
      }

      return updateAdminClientStatus(apiClient, clientId, status);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['adminClient', clientId] });
      void queryClient.invalidateQueries({ queryKey: ['adminClients'] });
    },
  });

  if (!clientId) {
    return (
      <ErrorState
        message="The admin client route is missing a clientId."
        title="Client record was not found."
      />
    );
  }

  if (detailQuery.isLoading) {
    return (
      <LoadingState
        message="Loading client detail."
        title="Opening client detail."
      />
    );
  }

  if (detailQuery.isError) {
    return (
      <ErrorState
        error={detailQuery.error}
        title={adminErrorTitle(detailQuery.error)}
      />
    );
  }

  const detail = detailQuery.data;

  if (!detail) {
    return (
      <ErrorState
        message="The admin client detail response was empty. Please refresh and try again."
        title="Admin client detail could not load."
      />
    );
  }

  const stageQueuePath = `/admin/clients?status=${encodeURIComponent(detail.client.status)}`;
  const contactLabel = detail.client.contactEmail ?? detail.client.contactName ?? 'No contact set';

  return (
    <section className="account-page admin-page" aria-labelledby="admin-client-title">
      <div className="account-card dashboard-shell admin-shell portal-page-shell portal-admin-detail-shell">
        <div className="admin-page-header portal-page-header">
          <div>
            <p className="account-eyebrow">Internal admin</p>
            <h1 id="admin-client-title">{detail.client.businessName || 'New Client'}</h1>
            <p className="admin-hero-copy">{contactLabel}</p>
          </div>
          <Link className="account-secondary-action dashboard-card-link" to="/admin/clients">
            Command center
          </Link>
        </div>

        <div className="portal-admin-detail-grid">
          <div className="portal-workspace-panel-stack portal-workspace-scroll">
            <nav className="admin-quick-actions admin-detail-quick-actions" aria-label="Client quick actions">
              <Link className="admin-quick-action" to="/admin/clients">
                <span>All profiles</span>
                <small>Return to lifecycle command</small>
              </Link>
              <Link className="admin-quick-action" to={stageQueuePath}>
                <span>Stage queue</span>
                <small>View matching clients</small>
              </Link>
              {detail.client.contactEmail ? (
                <a className="admin-quick-action" href={`mailto:${detail.client.contactEmail}`}>
                  <span>Email contact</span>
                  <small>{detail.client.contactEmail}</small>
                </a>
              ) : null}
              <Link className="admin-quick-action admin-quick-action-muted" to="/messages">
                <span>Messages</span>
                <small>Open portal threads</small>
              </Link>
            </nav>

            <section className="account-status-panel admin-detail-hero">
              <div className="dashboard-section-heading">
                <span className="dashboard-panel-label">Lifecycle management</span>
                <h2>Current status</h2>
                <p>Last updated {formatAdminDateTime(detail.client.updatedAt)}</p>
              </div>
              <AdminStatusBadge status={detail.client.status} />
              <AdminStatusChanger
                error={statusMutation.isError ? saveErrorMessage(statusMutation.error) : undefined}
                onChangeStatus={(status) => statusMutation.mutateAsync(status).then(() => undefined)}
                saving={statusMutation.isPending}
                status={detail.client.status}
              />
            </section>

            <AdminClientOverview detail={detail} />
            <AdminIntakeSummary intake={detail.intake} />
          </div>

          <div className="portal-workspace-panel-stack portal-workspace-scroll">
            <div className="admin-detail-grid">
              <AdminProjectList projects={detail.projects} />
              <AdminPeoplePanel memberships={detail.memberships} users={detail.users} />
            </div>

            <AdminRecentActivity auditEvents={detail.auditEvents} />
          </div>
        </div>
      </div>
    </section>
  );
}
