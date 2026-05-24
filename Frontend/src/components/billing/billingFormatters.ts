import type { InvoiceStatus } from '@apopto/shared';
import { formatPortalChoice } from '../dashboard/dashboardFormatters';

export function formatInvoiceMoney(amountDue: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    currency: currency.toUpperCase(),
    style: 'currency',
  }).format(amountDue / 100);
}

export function formatInvoiceDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`));
}

export function invoiceStatusTone(status: InvoiceStatus) {
  if (status === 'paid') {
    return 'paid';
  }

  if (status === 'past_due' || status === 'uncollectible') {
    return 'attention';
  }

  if (status === 'void') {
    return 'muted';
  }

  return 'open';
}

export function formatInvoiceStatus(status: InvoiceStatus) {
  return formatPortalChoice(status);
}
