import { clientStatuses, type ClientStatus } from '@apopto/shared';
import { formatAdminChoice } from './adminFormatters';

type AdminStatusFilterProps = {
  selectedStatus?: ClientStatus;
  onStatusChange: (status?: ClientStatus) => void;
};

export default function AdminStatusFilter({
  selectedStatus,
  onStatusChange,
}: AdminStatusFilterProps) {
  return (
    <div className="admin-status-filter" aria-label="Client status filters">
      <button
        className={!selectedStatus ? 'active' : undefined}
        onClick={() => onStatusChange(undefined)}
        type="button"
      >
        All work
      </button>
      {clientStatuses.map((status) => (
        <button
          className={selectedStatus === status ? 'active' : undefined}
          key={status}
          onClick={() => onStatusChange(status)}
          type="button"
        >
          {formatAdminChoice(status)}
        </button>
      ))}
    </div>
  );
}
