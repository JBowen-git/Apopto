import { type AdminAuditSummary } from '@apopto/shared';
import { formatAdminChoice, formatAdminDateTime } from './adminFormatters';

type AdminRecentActivityProps = {
  auditEvents: AdminAuditSummary[];
};

export default function AdminRecentActivity({ auditEvents }: AdminRecentActivityProps) {
  return (
    <section className="account-status-panel dashboard-summary-panel">
      <div className="dashboard-section-heading">
        <span className="dashboard-panel-label">Recent activity</span>
        <h2>{auditEvents.length > 0 ? 'Latest audit events' : 'No audit events yet.'}</h2>
      </div>
      {auditEvents.length > 0 ? (
        <ol className="admin-activity-list">
          {auditEvents.map((event) => (
            <li key={event.eventId}>
              <span>{formatAdminDateTime(event.createdAt)}</span>
              <strong>{formatAdminChoice(event.action.replaceAll('.', '_'))}</strong>
              <small>
                {event.entityType} · {event.entityId}
              </small>
            </li>
          ))}
        </ol>
      ) : (
        <p>Status changes and sensitive admin actions will be recorded here.</p>
      )}
    </section>
  );
}
