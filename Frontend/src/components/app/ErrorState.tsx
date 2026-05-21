import { isApiClientError } from '../../api/client';

type ErrorStateProps = {
  error?: unknown;
  message?: string;
  title?: string;
};

function messageFromError(error: unknown) {
  if (isApiClientError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return undefined;
}

function requestIdFromError(error: unknown) {
  return isApiClientError(error) ? error.requestId : undefined;
}

export default function ErrorState({
  error,
  message,
  title = 'Something needs attention.',
}: ErrorStateProps) {
  const displayMessage = message ?? messageFromError(error) ?? 'Please refresh and try again.';
  const requestId = requestIdFromError(error);

  return (
    <section className="account-page" aria-labelledby="error-state-title">
      <div className="account-card">
        <p className="account-eyebrow">Customer accounts</p>
        <div className="account-status-panel account-status-panel-error">
          <h1 id="error-state-title">{title}</h1>
          <p>{displayMessage}</p>
          {requestId ? <code>Request ID: {requestId}</code> : null}
        </div>
      </div>
    </section>
  );
}
