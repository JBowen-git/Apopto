import { type AdminClientDetailResponse } from '@apopto/shared';
import AdminDetailList from './AdminDetailList';
import { formatAdminDateTime } from './adminFormatters';

type AdminClientOverviewProps = {
  detail: AdminClientDetailResponse;
};

export default function AdminClientOverview({ detail }: AdminClientOverviewProps) {
  const { client, intake } = detail;
  const intakeData = intake?.formData;

  return (
    <section className="account-status-panel dashboard-summary-panel">
      <div className="dashboard-section-heading">
        <span className="dashboard-panel-label">Client profile</span>
        <h2>{client.businessName || intakeData?.businessName || 'New Client'}</h2>
      </div>
      <AdminDetailList
        items={[
          { label: 'Contact', value: client.contactName ?? intakeData?.contactName },
          { label: 'Email', value: client.contactEmail ?? intakeData?.contactEmail },
          { label: 'Phone', value: client.phone ?? intakeData?.phone },
          { label: 'Website', value: client.website ?? intakeData?.website },
          { label: 'Industry', value: client.industry ?? intakeData?.industry },
          { label: 'Created', value: formatAdminDateTime(client.createdAt) },
          { label: 'Updated', value: formatAdminDateTime(client.updatedAt) },
          { label: 'Primary user', value: client.primaryContactUserId },
        ]}
      />
    </section>
  );
}
