import type { DashboardResponse } from '@apopto/shared';
import { Link } from 'react-router-dom';
import { formatDateTime, formatPortalChoice } from './dashboardFormatters';

type DashboardLifecycleModulesProps = {
  dashboard: DashboardResponse;
};

function moduleCountLabel(count: number, noun: string) {
  if (count === 0) {
    return `No ${noun} yet`;
  }

  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export default function DashboardLifecycleModules({
  dashboard,
}: DashboardLifecycleModulesProps) {
  const {
    featureFlags,
    invoices,
    projects,
    recentFiles,
    recentThreads,
    sliceLimits,
  } = dashboard;

  const modules = [
    featureFlags.canViewProjects ? {
      copy: 'Project timeline and details will live here once the project module is implemented.',
      count: moduleCountLabel(projects.length, 'project'),
      id: 'projects',
      items: projects.map((project) => ({
        label: project.name,
        meta: formatPortalChoice(project.status),
      })),
      limit: sliceLimits.projects,
      title: 'Projects',
    } : null,
    featureFlags.canUploadFiles ? {
      badge: 'Available',
      copy: 'Upload project assets directly to private S3 storage and review files that are ready for download.',
      count: moduleCountLabel(recentFiles.length, 'file'),
      href: '/files',
      id: 'files',
      items: recentFiles.map((file) => ({
        label: file.originalFilename,
        meta: formatPortalChoice(file.uploadStatus),
      })),
      limit: sliceLimits.files,
      title: 'Files',
    } : null,
    featureFlags.canSendMessages ? {
      badge: 'Available',
      copy: 'Open protected project conversations and keep decisions tied to this client record.',
      count: moduleCountLabel(recentThreads.length, 'thread'),
      href: '/messages',
      id: 'messages',
      items: recentThreads.map((thread) => ({
        label: thread.subject,
        meta: formatDateTime(thread.lastMessageAt) ?? 'No recent message',
      })),
      limit: sliceLimits.threads,
      title: 'Messages',
    } : null,
    featureFlags.canViewBilling ? {
      copy: 'Billing links and invoice details will appear here when the billing module comes online.',
      count: moduleCountLabel(invoices.length, 'invoice'),
      id: 'billing',
      items: invoices.map((invoice) => ({
        label: `${invoice.currency.toUpperCase()} ${(invoice.amountDue / 100).toLocaleString(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 2,
        })}`,
        meta: formatPortalChoice(invoice.status),
      })),
      limit: sliceLimits.invoices,
      title: 'Billing',
    } : null,
  ].filter((module): module is NonNullable<typeof module> => Boolean(module));

  if (modules.length === 0) {
    return (
      <section className="account-status-panel dashboard-placeholder-card">
        <span className="dashboard-panel-label">Lifecycle modules</span>
        <h2>Intake comes first.</h2>
        <p>
          Project, files, messages, and billing modules will appear as the client status
          moves forward and those features are implemented.
        </p>
      </section>
    );
  }

  return (
    <section className="dashboard-module-grid" aria-label="Dashboard modules">
      {modules.map((module) => (
        <article className="account-status-panel dashboard-module-card" key={module.id}>
          <div className="dashboard-section-heading dashboard-section-heading-row">
            <div>
              <span className="dashboard-panel-label">{module.count}</span>
              <h2>{module.title}</h2>
            </div>
            <span className="dashboard-module-pill">{module.badge ?? 'Next phase'}</span>
          </div>
          <p>{module.copy}</p>
          {module.items.length > 0 ? (
            <ul className="dashboard-module-list">
              {module.items.slice(0, module.limit).map((item) => (
                <li key={`${item.label}-${item.meta}`}>
                  <strong>{item.label}</strong>
                  <span>{item.meta}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="dashboard-empty-module">No records in this slice yet.</div>
          )}
          {module.href ? (
            <Link className="account-secondary-action dashboard-card-link" to={module.href}>
              Open {module.title.toLowerCase()}
            </Link>
          ) : null}
        </article>
      ))}
    </section>
  );
}
