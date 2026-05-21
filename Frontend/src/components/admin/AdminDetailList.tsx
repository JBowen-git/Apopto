import { type ReactNode } from 'react';

export type AdminDetailItem = {
  label: string;
  value?: ReactNode;
};

type AdminDetailListProps = {
  items: AdminDetailItem[];
};

export default function AdminDetailList({ items }: AdminDetailListProps) {
  return (
    <dl className="dashboard-detail-list admin-detail-list">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value ?? 'Not set'}</dd>
        </div>
      ))}
    </dl>
  );
}
