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
        message="Checking admin permissions and loading the bounded client detail."
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

  return (
    <section className="account-page admin-page" aria-labelledby="admin-client-title">
      <div className="account-card dashboard-shell admin-shell">
        <div className="admin-page-header">
          <div>
            <p className="account-eyebrow">Internal admin</p>
            <h1 id="admin-client-title">{detail.client.businessName || 'New Client'}</h1>
          </div>
          <Link className="account-secondary-action dashboard-card-link" to="/admin/clients">
            Client list
          </Link>
        </div>

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

        <div className="admin-detail-grid">
          <AdminProjectList projects={detail.projects} />
          <AdminPeoplePanel memberships={detail.memberships} users={detail.users} />
        </div>

        <AdminRecentActivity auditEvents={detail.auditEvents} />
      </div>
    </section>
  );
}
