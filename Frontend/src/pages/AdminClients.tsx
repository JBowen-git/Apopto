import {
  clientStatuses,
  type AdminClientSummary,
  type ClientStatus,
} from '@apopto/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { isApiClientError } from '../api/client';
import { listAdminClients, parseClientStatus } from '../api/admin';
import { useAdminApiClient } from '../api/useAdminApiClient';
import AdminClientList from '../components/admin/AdminClientList';
import AdminStatusBadge from '../components/admin/AdminStatusBadge';
import AdminStatusFilter from '../components/admin/AdminStatusFilter';
import { formatAdminChoice, formatAdminDateTime } from '../components/admin/adminFormatters';
import ErrorState from '../components/app/ErrorState';
import LoadingState from '../components/app/LoadingState';

const pipelineStatuses: ClientStatus[] = ['lead', 'intake_submitted', 'qualified'];
const proposalStatuses: ClientStatus[] = ['proposal_sent', 'contract_sent'];
const deliveryStatuses: ClientStatus[] = ['active', 'maintenance'];

function clientName(client: AdminClientSummary) {
  return client.businessName || client.contactName || 'New Client';
}

function clientContact(client: AdminClientSummary) {
  return client.contactEmail ?? client.contactName ?? client.clientId;
}

function clientInitials(client: AdminClientSummary) {
  const source = clientName(client)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return source || 'NC';
}

function statusPath(status?: ClientStatus) {
  return status ? `/admin/clients?status=${encodeURIComponent(status)}` : '/admin/clients';
}

function countForStatuses(clients: AdminClientSummary[], statuses: ClientStatus[]) {
  return clients.filter((client) => statuses.includes(client.status)).length;
}

function clientsForStatus(clients: AdminClientSummary[], status: ClientStatus) {
  return clients.filter((client) => client.status === status);
}

function latestUpdatedAt(clients: AdminClientSummary[]) {
  return clients.reduce<string | undefined>((latest, client) => {
    if (!latest) {
      return client.updatedAt;
    }

    return new Date(client.updatedAt).getTime() > new Date(latest).getTime()
      ? client.updatedAt
      : latest;
  }, undefined);
}

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
    queryKey: ['adminClients', 'all'],
    queryFn: () => listAdminClients(apiClient),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  if (clientsQuery.isLoading && !clientsQuery.data) {
    return (
      <LoadingState
        message="Loading client records."
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

  const allClients = response.clients;
  const visibleClients = selectedStatus
    ? allClients.filter((client) => client.status === selectedStatus)
    : allClients;
  const commandMetrics = [
    {
      detail: 'Across lifecycle',
      label: 'Total records',
      value: allClients.length,
    },
    {
      detail: 'Lead through qualified',
      label: 'Pipeline',
      value: countForStatuses(allClients, pipelineStatuses),
    },
    {
      detail: 'Proposal and contract',
      label: 'Sales desk',
      value: countForStatuses(allClients, proposalStatuses),
    },
    {
      detail: 'Active and maintenance',
      label: 'Delivery',
      value: countForStatuses(allClients, deliveryStatuses),
    },
  ];
  const quickActions = [
    {
      detail: 'Full client roster',
      label: 'All profiles',
      to: statusPath(),
    },
    {
      detail: `${clientsForStatus(allClients, 'lead').length} open`,
      label: 'New leads',
      to: statusPath('lead'),
    },
    {
      detail: `${countForStatuses(allClients, proposalStatuses)} pending`,
      label: 'Proposal desk',
      to: statusPath('proposal_sent'),
    },
    {
      detail: `${clientsForStatus(allClients, 'contract_sent').length} awaiting signature`,
      label: 'Contracts',
      to: statusPath('contract_sent'),
    },
    {
      detail: `${countForStatuses(allClients, deliveryStatuses)} in motion`,
      label: 'Delivery',
      to: statusPath('active'),
    },
  ];
  const stageLabel = selectedStatus ? formatAdminChoice(selectedStatus) : 'All lifecycle stages';
  const latestProfileUpdate = latestUpdatedAt(allClients);

  return (
    <section className="account-page admin-page" aria-labelledby="admin-clients-title">
      <div className="account-card dashboard-shell admin-shell portal-page-shell portal-admin-clients-shell">
        <section className="admin-command-hero" aria-label="Admin command summary">
          <div className="admin-command-copy">
            <p className="account-eyebrow">Internal admin</p>
            <h1 id="admin-clients-title">Client command center</h1>
            <p className="admin-hero-copy">
              Track prospects, proposals, active delivery, and maintenance from one high-signal
              operations view.
            </p>
          </div>
          <div className="admin-command-metrics" aria-label="Client lifecycle metrics">
            {commandMetrics.map((metric) => (
              <div className="admin-command-metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small>{metric.detail}</small>
              </div>
            ))}
          </div>
        </section>

        <div className="portal-admin-clients-grid">
          <div className="portal-workspace-panel-stack portal-workspace-scroll">
            <nav className="admin-quick-actions" aria-label="Admin quick actions">
              {quickActions.map((action) => (
                <Link className="admin-quick-action" key={action.label} to={action.to}>
                  <span>{action.label}</span>
                  <small>{action.detail}</small>
                </Link>
              ))}
              <Link className="admin-quick-action admin-quick-action-muted" to="/dashboard">
                <span>Client portal</span>
                <small>Return to portal dashboard</small>
              </Link>
            </nav>

            <section className="account-status-panel admin-toolbar">
              <div className="dashboard-section-heading">
                <span className="dashboard-panel-label">Status filters</span>
                <h2>{visibleClients.length} client records</h2>
                <p>{stageLabel}</p>
              </div>
              <AdminStatusFilter
                selectedStatus={selectedStatus}
                onStatusChange={(status) => {
                  setSearchParams(status ? { status } : {});
                }}
              />
              {clientsQuery.isFetching ? (
                <span className="dashboard-panel-label">Refreshing records</span>
              ) : null}
            </section>

            <section className="admin-stage-board" aria-labelledby="admin-stage-title">
              <div className="admin-section-title">
                <span className="dashboard-panel-label">Stage lanes</span>
                <h2 id="admin-stage-title">Clients by lifecycle stage</h2>
              </div>
              <div className="admin-stage-grid">
                {clientStatuses.map((status) => {
                  const stageClients = clientsForStatus(allClients, status);

                  return (
                    <article className="admin-stage-lane" key={status}>
                      <div className="admin-stage-lane-header">
                        <AdminStatusBadge status={status} />
                        <strong>{stageClients.length}</strong>
                      </div>
                      {stageClients.length > 0 ? (
                        <ul className="admin-stage-client-list">
                          {stageClients.map((client) => (
                            <li key={client.clientId}>
                              <Link to={`/admin/clients/${encodeURIComponent(client.clientId)}`}>
                                <span className="admin-client-avatar" aria-hidden="true">
                                  {clientInitials(client)}
                                </span>
                                <span>
                                  <strong>{clientName(client)}</strong>
                                  <small>{clientContact(client)}</small>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="admin-stage-empty">No clients in {formatAdminChoice(status)}.</p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="admin-client-profiles portal-workspace-scroll" aria-labelledby="admin-profiles-title">
            <div className="admin-section-title">
              <span className="dashboard-panel-label">Client profiles</span>
              <h2 id="admin-profiles-title">Profile intelligence</h2>
              <p>
                Showing {visibleClients.length} of {allClients.length} profiles. Latest update:{' '}
                {latestProfileUpdate ? formatAdminDateTime(latestProfileUpdate) : 'No records yet'}.
              </p>
            </div>
            <AdminClientList clients={visibleClients} />
          </div>
        </div>
      </div>
    </section>
  );
}
