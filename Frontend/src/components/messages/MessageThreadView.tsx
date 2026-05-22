import type { MessageSummary, ThreadSummary } from '@apopto/shared';
import { Alert } from '@mui/material';
import MessageBody from './MessageBody';
import ReplyComposer from './ReplyComposer';
import { formatMessageTimestamp } from './messageText';

type MessageThreadViewProps = {
  errorMessage?: string;
  loading?: boolean;
  messages: MessageSummary[];
  onReply: (input: { body: string }) => Promise<unknown>;
  replying?: boolean;
  thread?: ThreadSummary;
};

export default function MessageThreadView({
  errorMessage,
  loading = false,
  messages,
  onReply,
  replying = false,
  thread,
}: MessageThreadViewProps) {
  return (
    <section className="account-status-panel messages-thread-panel" aria-labelledby="messages-thread-title">
      {errorMessage ? (
        <Alert severity="error">{errorMessage}</Alert>
      ) : null}

      {loading ? (
        <div className="dashboard-empty-module">Loading conversation.</div>
      ) : !thread ? (
        <div className="dashboard-empty-module">Choose a thread to read messages.</div>
      ) : (
        <>
          <div className="dashboard-section-heading">
            <span className="dashboard-panel-label">Conversation</span>
            <h2 id="messages-thread-title">{thread.subject}</h2>
          </div>
          <div className="messages-message-list">
            {messages.length === 0 ? (
              <div className="dashboard-empty-module">No messages in this thread yet.</div>
            ) : messages.map((message) => (
              <article
                className={`messages-message-card messages-message-card-${message.senderRole}`}
                key={message.messageId}
              >
                <div className="messages-message-meta">
                  <strong>{message.senderRole === 'admin' ? 'Apopto' : 'Client'}</strong>
                  <span>{formatMessageTimestamp(message.createdAt)}</span>
                </div>
                <MessageBody body={message.body} />
              </article>
            ))}
          </div>
          <ReplyComposer
            onReply={onReply}
            saving={replying}
          />
        </>
      )}
    </section>
  );
}
