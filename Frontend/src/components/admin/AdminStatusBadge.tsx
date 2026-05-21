import { type ClientStatus } from '@apopto/shared';
import { formatAdminChoice, statusTone } from './adminFormatters';

type AdminStatusBadgeProps = {
  status: ClientStatus;
};

export default function AdminStatusBadge({ status }: AdminStatusBadgeProps) {
  return (
    <span className="admin-status-badge" data-tone={statusTone(status)}>
      {formatAdminChoice(status)}
    </span>
  );
}
