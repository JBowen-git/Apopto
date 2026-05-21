import { type DashboardProjectSummary } from '@apopto/shared';
import { formatAdminDate, formatAdminDateTime, formatAdminChoice } from './adminFormatters';

type AdminProjectListProps = {
  projects: DashboardProjectSummary[];
};

export default function AdminProjectList({ projects }: AdminProjectListProps) {
  return (
    <section className="account-status-panel dashboard-summary-panel">
      <div className="dashboard-section-heading">
        <span className="dashboard-panel-label">Projects</span>
        <h2>{projects.length > 0 ? `${projects.length} project records` : 'No project records yet.'}</h2>
      </div>
      {projects.length > 0 ? (
        <ul className="admin-record-list">
          {projects.map((project) => (
            <li key={project.projectId}>
              <div>
                <strong>{project.name}</strong>
                <span>{project.description ?? `Target launch: ${formatAdminDate(project.targetLaunchDate)}`}</span>
                <small>Updated {formatAdminDateTime(project.updatedAt)}</small>
              </div>
              <span className="admin-project-status">{formatAdminChoice(project.status)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>Basic project records will appear here after they are created by the backend workflow.</p>
      )}
    </section>
  );
}
