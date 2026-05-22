import type { ThreadSummary } from '@apopto/shared';
import { Alert } from '@mui/material';
import { Link } from 'react-router-dom';
import { formatMessageTimestamp } from './messageText';

type MessageThreadListProps = {
  activeThreadId?: string;
  errorMessage?: string;
  loading?: boolean;
  threads: ThreadSummary[];
};

export default function MessageThreadList({
  activeThreadId,
  errorMessage,
  loading = false,
  threads,
}: MessageThreadListProps) {
  return (
    <section className="account-status-panel messages-thread-list-panel" aria-labelledby="messages-thread-list-title">
      <div className="dashboard-section-heading">
        <span className="dashboard-panel-label">{threads.length} threads</span>
        <h2 id="messages-thread-list-title">Conversations</h2>
      </div>

      {errorMessage ? (
        <Alert severity="error">{errorMessage}</Alert>
      ) : null}

      {loading ? (
        <div className="dashboard-empty-module">Loading message threads.</div>
      ) : threads.length === 0 ? (
        <div className="dashboard-empty-module">No message threads yet.</div>
      ) : (
        <nav className="messages-thread-list" aria-label="Message threads">
          {threads.map((thread) => (
            <Link
              className={`messages-thread-link${thread.threadId === activeThreadId ? ' active' : ''}`}
              key={thread.threadId}
              to={`/messages/${encodeURIComponent(thread.threadId)}`}
            >
              <strong>{thread.subject}</strong>
              <span>{thread.lastMessagePreview || 'No preview available.'}</span>
              <small>{formatMessageTimestamp(thread.lastMessageAt)}</small>
            </Link>
          ))}
        </nav>
      )}
    </section>
  );
}
