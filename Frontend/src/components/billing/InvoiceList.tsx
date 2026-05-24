import type { InvoiceSummary } from '@apopto/shared';
import { Alert } from '@mui/material';
import {
  formatInvoiceDate,
  formatInvoiceMoney,
  formatInvoiceStatus,
  invoiceStatusTone,
} from './billingFormatters';

type InvoiceListProps = {
  errorMessage?: string;
  invoices: InvoiceSummary[];
  loading?: boolean;
};

export default function InvoiceList({
  errorMessage,
  invoices,
  loading = false,
}: InvoiceListProps) {
  return (
    <section className="account-status-panel billing-invoice-panel" aria-labelledby="billing-invoice-title">
      <div className="dashboard-section-heading dashboard-section-heading-row">
        <div>
          <span className="dashboard-panel-label">{invoices.length} invoices</span>
          <h2 id="billing-invoice-title">Invoice history</h2>
        </div>
      </div>
      <p>
        This view shows invoice metadata only. Payment details and card data stay with Stripe.
      </p>

      {errorMessage ? (
        <Alert severity="error">{errorMessage}</Alert>
      ) : null}

      {loading ? (
        <div className="dashboard-empty-module">Loading invoices.</div>
      ) : invoices.length === 0 ? (
        <div className="dashboard-empty-module">No invoices are available yet.</div>
      ) : (
        <div className="billing-invoice-list">
          {invoices.map((invoice) => (
            <article className="billing-invoice-card" key={invoice.invoiceId}>
              <div className="billing-invoice-main">
                <span className={`billing-status-pill billing-status-pill-${invoiceStatusTone(invoice.status)}`}>
                  {formatInvoiceStatus(invoice.status)}
                </span>
                <h3>{formatInvoiceMoney(invoice.amountDue, invoice.currency)}</h3>
                <div className="billing-invoice-meta">
                  <span>Due {formatInvoiceDate(invoice.dueDate)}</span>
                  <span>{invoice.provider.toUpperCase()}</span>
                  <span>{invoice.invoiceId}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
