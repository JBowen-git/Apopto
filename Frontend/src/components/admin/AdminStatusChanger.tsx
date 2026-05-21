import { clientStatuses, type ClientStatus } from '@apopto/shared';
import { useEffect, useState } from 'react';
import { formatAdminChoice } from './adminFormatters';

type AdminStatusChangerProps = {
  disabled?: boolean;
  error?: string;
  onChangeStatus: (status: ClientStatus) => Promise<void>;
  saving?: boolean;
  status: ClientStatus;
};

export default function AdminStatusChanger({
  disabled = false,
  error,
  onChangeStatus,
  saving = false,
  status,
}: AdminStatusChangerProps) {
  const [selectedStatus, setSelectedStatus] = useState<ClientStatus>(status);

  useEffect(() => {
    setSelectedStatus(status);
  }, [status]);

  const hasChange = selectedStatus !== status;

  return (
    <form
      className="admin-status-form"
      onSubmit={(event) => {
        event.preventDefault();

        if (hasChange && !saving) {
          void onChangeStatus(selectedStatus);
        }
      }}
    >
      <label htmlFor="admin-client-status">Lifecycle status</label>
      <select
        disabled={disabled || saving}
        id="admin-client-status"
        onChange={(event) => setSelectedStatus(event.target.value as ClientStatus)}
        value={selectedStatus}
      >
        {clientStatuses.map((clientStatus) => (
          <option key={clientStatus} value={clientStatus}>
            {formatAdminChoice(clientStatus)}
          </option>
        ))}
      </select>
      <button
        className="account-primary-action admin-status-save"
        disabled={disabled || saving || !hasChange}
        type="submit"
      >
        {saving ? 'Saving' : 'Update status'}
      </button>
      {error ? <p className="admin-form-error">{error}</p> : null}
    </form>
  );
}
