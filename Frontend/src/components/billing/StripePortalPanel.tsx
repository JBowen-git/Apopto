import { Alert, Button as MuiButton } from '@mui/material';

type StripePortalPanelProps = {
  errorMessage?: string;
  onOpenPortal: () => void;
  opening?: boolean;
  stripeUnconfigured?: boolean;
};

export default function StripePortalPanel({
  errorMessage,
  onOpenPortal,
  opening = false,
  stripeUnconfigured = false,
}: StripePortalPanelProps) {
  return (
    <section className="account-status-panel billing-portal-panel" aria-labelledby="billing-portal-title">
      <div className="dashboard-section-heading">
        <span className="dashboard-panel-label">Stripe portal</span>
        <h2 id="billing-portal-title">Open billing portal</h2>
      </div>
      <p>
        Use the Stripe-hosted portal for billing actions once it is configured.
        Apopto does not collect or store payment card details in this app.
      </p>

      {stripeUnconfigured ? (
        <Alert severity="info">
          Stripe billing portal access is not configured for this environment yet.
        </Alert>
      ) : null}

      {errorMessage && !stripeUnconfigured ? (
        <Alert severity="error">{errorMessage}</Alert>
      ) : null}

      <MuiButton
        className="billing-action-button"
        disabled={opening}
        onClick={onOpenPortal}
        type="button"
        variant="contained"
      >
        {opening ? 'Opening portal' : 'Open Stripe portal'}
      </MuiButton>
    </section>
  );
}
