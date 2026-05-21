import type { IntakeRecord } from '@apopto/shared';
import { Link } from 'react-router-dom';
import { isApiClientError } from '../../api/client';
import { formatDateTime, formatPortalChoice } from './dashboardFormatters';

type IntakeSummaryCardProps = {
  error?: unknown;
  intake?: IntakeRecord | null;
  isLoading?: boolean;
};

function errorMessage(error: unknown) {
  if (isApiClientError(error)) {
    return error.requestId
      ? `${error.message} Request ID: ${error.requestId}`
      : error.message;
  }

  return error instanceof Error
    ? error.message
    : 'The intake summary could not be loaded.';
}

export default function IntakeSummaryCard({
  error,
  intake,
  isLoading = false,
}: IntakeSummaryCardProps) {
  const updatedAt = formatDateTime(intake?.updatedAt);
  const formData = intake?.formData;

  return (
    <section className="account-status-panel dashboard-summary-panel dashboard-intake-card">
      <div className="dashboard-section-heading">
        <span className="dashboard-panel-label">Intake summary</span>
        <h2>{formData ? formData.businessName : 'No intake submitted yet'}</h2>
      </div>

      {isLoading ? (
        <p>Loading your intake summary.</p>
      ) : null}

      {!isLoading && error ? (
        <p>{errorMessage(error)}</p>
      ) : null}

      {!isLoading && !error && !formData ? (
        <>
          <p>
            The intake form is ready. Add the business context, goals, technical
            details, and planning notes when you are ready to start shaping the project.
          </p>
          <Link className="account-secondary-action dashboard-card-link" to="/intake">
            Start intake
          </Link>
        </>
      ) : null}

      {!isLoading && !error && formData ? (
        <>
          <dl className="dashboard-detail-list">
            <div>
              <dt>Project type</dt>
              <dd>{formatPortalChoice(formData.projectType)}</dd>
            </div>
            <div>
              <dt>Audience</dt>
              <dd>{formData.targetAudience}</dd>
            </div>
            <div>
              <dt>Timeline</dt>
              <dd>{formData.desiredTimeline}</dd>
            </div>
            <div>
              <dt>Budget</dt>
              <dd>{formData.budgetRange}</dd>
            </div>
          </dl>

          <div className="dashboard-chip-block">
            <span className="dashboard-panel-label">Goals</span>
            <ul className="dashboard-chip-list">
              {formData.goals.slice(0, 4).map((goal) => (
                <li key={goal}>{goal}</li>
              ))}
            </ul>
          </div>

          <p>
            Version {intake.version}
            {updatedAt ? ` · Updated ${updatedAt}` : ''}
          </p>
          <Link className="account-secondary-action dashboard-card-link" to="/intake">
            Edit intake
          </Link>
        </>
      ) : null}
    </section>
  );
}
