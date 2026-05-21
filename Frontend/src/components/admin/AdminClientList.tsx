import { type AdminClientSummary } from '@apopto/shared';
import { Link } from 'react-router-dom';
import AdminStatusBadge from './AdminStatusBadge';
import { formatAdminDateTime } from './adminFormatters';

type AdminClientListProps = {
  clients: AdminClientSummary[];
};

export default function AdminClientList({ clients }: AdminClientListProps) {
  if (clients.length === 0) {
    return (
      <section className="account-status-panel admin-empty-state">
        <span className="dashboard-panel-label">No matching clients</span>
        <h2>No client records found.</h2>
        <p>Try another lifecycle filter or wait for new portal signups to appear.</p>
      </section>
    );
  }

  return (
    <section className="admin-client-list" aria-label="Admin client list">
      <div className="admin-list-heading" aria-hidden="true">
        <span>Client</span>
        <span>Status</span>
        <span>Updated</span>
      </div>
      {clients.map((client) => (
        <Link
          className="admin-client-row"
          key={client.clientId}
          to={`/admin/clients/${encodeURIComponent(client.clientId)}`}
        >
          <span className="admin-client-primary">
            <strong>{client.businessName || 'New Client'}</strong>
            <small>{client.contactEmail ?? client.contactName ?? client.clientId}</small>
          </span>
          <AdminStatusBadge status={client.status} />
          <span className="admin-client-updated">{formatAdminDateTime(client.updatedAt)}</span>
        </Link>
      ))}
    </section>
  );
}
