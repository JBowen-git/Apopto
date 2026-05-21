type LoadingStateProps = {
  message?: string;
  title?: string;
};

export default function LoadingState({
  message = 'Loading secure customer access.',
  title = 'Loading',
}: LoadingStateProps) {
  return (
    <section className="account-page" aria-labelledby="loading-state-title">
      <div className="account-card">
        <p className="account-eyebrow">Customer accounts</p>
        <div className="account-status-panel">
          <h1 id="loading-state-title">{title}</h1>
          <p>{message}</p>
        </div>
      </div>
    </section>
  );
}
