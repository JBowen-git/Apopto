import { Link } from 'react-router-dom';
import type { ClientStatus, DashboardNextStep } from '@apopto/shared';
import { formatPortalChoice } from './dashboardFormatters';

type DashboardNextStepsProps = {
  nextSteps: DashboardNextStep[];
  status: ClientStatus;
};

export default function DashboardNextSteps({
  nextSteps,
  status,
}: DashboardNextStepsProps) {
  const primaryStep = nextSteps.find((step) => step.href);

  return (
    <section className="account-status-panel dashboard-next-steps">
      <div className="dashboard-section-heading">
        <span className="dashboard-panel-label">Next steps</span>
        <h2>{status === 'lead' ? 'Start with the intake.' : formatPortalChoice(status)}</h2>
      </div>
      <ol className="dashboard-next-step-list">
        {nextSteps.map((step) => (
          <li key={step.id}>
            <strong>{step.label}</strong>
            <span>{step.description}</span>
          </li>
        ))}
      </ol>
      {primaryStep?.href ? (
        <Link
          className="account-primary-action dashboard-card-link"
          to={primaryStep.href}
        >
          {status === 'lead' ? 'Open intake' : 'Open next step'}
          <span aria-hidden="true">-&gt;</span>
        </Link>
      ) : null}
    </section>
  );
}
