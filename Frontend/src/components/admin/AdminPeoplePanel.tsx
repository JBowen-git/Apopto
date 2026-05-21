import {
  type AdminMembershipSummary,
  type AdminUserSummary,
} from '@apopto/shared';
import { formatAdminChoice, formatAdminDateTime } from './adminFormatters';

type AdminPeoplePanelProps = {
  memberships: AdminMembershipSummary[];
  users: AdminUserSummary[];
};

function userFor(users: AdminUserSummary[], auth0Sub: string) {
  return users.find((user) => user.auth0Sub === auth0Sub);
}

export default function AdminPeoplePanel({
  memberships,
  users,
}: AdminPeoplePanelProps) {
  return (
    <section className="account-status-panel dashboard-summary-panel">
      <div className="dashboard-section-heading">
        <span className="dashboard-panel-label">People</span>
        <h2>{memberships.length > 0 ? `${memberships.length} linked account records` : 'No linked users.'}</h2>
      </div>
      {memberships.length > 0 ? (
        <ul className="admin-record-list">
          {memberships.map((membership) => {
            const user = userFor(users, membership.auth0Sub);

            return (
              <li key={membership.auth0Sub}>
                <div>
                  <strong>{user?.name ?? user?.email ?? membership.auth0Sub}</strong>
                  <span>{user?.email ?? membership.auth0Sub}</span>
                  <small>Last login {formatAdminDateTime(user?.lastLoginAt)}</small>
                </div>
                <span className="admin-project-status">
                  {formatAdminChoice(membership.role)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No active membership records were returned in the bounded admin detail slice.</p>
      )}
    </section>
  );
}
