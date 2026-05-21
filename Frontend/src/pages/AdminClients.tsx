import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { isApiClientError } from '../api/client';
import { listAdminClients, parseClientStatus } from '../api/admin';
import { useAdminApiClient } from '../api/useAdminApiClient';
import AdminClientList from '../components/admin/AdminClientList';
import AdminStatusFilter from '../components/admin/AdminStatusFilter';
import ErrorState from '../components/app/ErrorState';
import LoadingState from '../components/app/LoadingState';

function adminErrorTitle(error: unknown) {
  if (isApiClientError(error) && error.status === 403) {
    return 'Admin access is not available.';
  }

  return 'Admin clients could not load.';
}

export default function AdminClients() {
  const apiClient = useAdminApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedStatus = parseClientStatus(searchParams.get('status'));
  const clientsQuery = useQuery({
    queryKey: ['adminClients', selectedStatus ?? 'all'],
    queryFn: () => listAdminClients(apiClient, { status: selectedStatus }),
  });

  if (clientsQuery.isLoading) {
    return (
      <LoadingState
        message="Checking admin permissions and loading client records."
        title="Opening admin clients."
      />
    );
  }

  if (clientsQuery.isError) {
    return (
      <ErrorState
        error={clientsQuery.error}
        title={adminErrorTitle(clientsQuery.error)}
      />
    );
  }

  const response = clientsQuery.data;

  if (!response) {
    return (
      <ErrorState
        message="The admin client response was empty. Please refresh and try again."
        title="Admin clients could not load."
      />
    );
  }

  return (
    <section className="account-page admin-page" aria-labelledby="admin-clients-title">
      <div className="account-card dashboard-shell admin-shell">
        <div className="admin-page-header">
          <div>
            <p className="account-eyebrow">Internal admin</p>
            <h1 id="admin-clients-title">Client lifecycle</h1>
          </div>
          <Link className="account-secondary-action dashboard-card-link" to="/dashboard">
            Dashboard
          </Link>
        </div>

        <section className="account-status-panel admin-toolbar">
          <div className="dashboard-section-heading">
            <span className="dashboard-panel-label">Status filters</span>
            <h2>{response.count} client records</h2>
          </div>
          <AdminStatusFilter
            selectedStatus={selectedStatus}
            onStatusChange={(status) => {
              setSearchParams(status ? { status } : {});
            }}
          />
        </section>

        <AdminClientList clients={response.clients} />
      </div>
    </section>
  );
}
