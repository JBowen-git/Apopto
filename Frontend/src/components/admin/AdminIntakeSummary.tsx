import { type IntakeRecord } from '@apopto/shared';
import AdminDetailList from './AdminDetailList';
import { formatAdminChoice, formatAdminDateTime } from './adminFormatters';

type AdminIntakeSummaryProps = {
  intake?: IntakeRecord | null;
};

function joined(values?: string[]) {
  return values && values.length > 0 ? values.join(', ') : undefined;
}

export default function AdminIntakeSummary({ intake }: AdminIntakeSummaryProps) {
  const formData = intake?.formData;

  if (!formData) {
    return (
      <section className="account-status-panel dashboard-summary-panel">
        <span className="dashboard-panel-label">Intake</span>
        <h2>No intake submitted yet.</h2>
        <p>The client can complete the protected intake before project planning moves forward.</p>
      </section>
    );
  }

  return (
    <section className="account-status-panel dashboard-summary-panel">
      <div className="dashboard-section-heading">
        <span className="dashboard-panel-label">Intake</span>
        <h2>{formData.projectType}</h2>
      </div>
      <AdminDetailList
        items={[
          { label: 'Business', value: formData.businessName },
          { label: 'Audience', value: formData.targetAudience },
          { label: 'Goals', value: joined(formData.goals) },
          { label: 'Features', value: joined(formData.desiredFeatures) },
          { label: 'Timeline', value: formData.desiredTimeline },
          { label: 'Budget', value: formData.budgetRange },
          { label: 'Content readiness', value: formatAdminChoice(formData.contentReadiness) },
          { label: 'Updated', value: formatAdminDateTime(intake.updatedAt) },
        ]}
      />
      <div className="admin-long-copy">
        <span className="dashboard-panel-label">Business description</span>
        <p>{formData.businessDescription}</p>
      </div>
      {formData.additionalNotes ? (
        <div className="admin-long-copy">
          <span className="dashboard-panel-label">Additional notes</span>
          <p>{formData.additionalNotes}</p>
        </div>
      ) : null}
    </section>
  );
}
