import { type AdminClientSummary } from '@apopto/shared';
import { Link } from 'react-router-dom';
import AdminStatusBadge from './AdminStatusBadge';
import { formatAdminDateTime } from './adminFormatters';

type AdminClientListProps = {
  clients: AdminClientSummary[];
};

function clientName(client: AdminClientSummary) {
  return client.businessName || client.contactName || 'New Client';
}

function clientInitials(client: AdminClientSummary) {
  const initials = clientName(client)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return initials || 'NC';
}

function clientContact(client: AdminClientSummary) {
  return client.contactEmail ?? client.phone ?? client.primaryContactUserId;
}

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
        <span>Profile</span>
        <span>Lifecycle</span>
        <span>Contact</span>
        <span>Updated</span>
      </div>
      {clients.map((client) => (
        <Link
          className="admin-client-row"
          key={client.clientId}
          to={`/admin/clients/${encodeURIComponent(client.clientId)}`}
        >
          <span className="admin-client-profile">
            <span className="admin-client-avatar" aria-hidden="true">
              {clientInitials(client)}
            </span>
            <span className="admin-client-primary">
              <strong>{clientName(client)}</strong>
              <small>{client.industry ?? 'Industry not set'} / {client.clientId}</small>
            </span>
          </span>
          <span className="admin-client-stage">
            <AdminStatusBadge status={client.status} />
            <small>Primary user {client.primaryContactUserId}</small>
          </span>
          <span className="admin-client-contact">
            <strong>{client.contactName ?? 'Contact not set'}</strong>
            <small>{clientContact(client)}</small>
          </span>
          <span className="admin-client-updated">{formatAdminDateTime(client.updatedAt)}</span>
        </Link>
      ))}
    </section>
  );
}
