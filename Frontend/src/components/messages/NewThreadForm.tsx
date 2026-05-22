import { Alert, Button as MuiButton, TextField } from '@mui/material';
import { useState, type FormEvent } from 'react';
import { sanitizeMessageText, sanitizeThreadSubject } from './messageText';

type NewThreadFormProps = {
  errorMessage?: string;
  onCreate: (input: { body: string; subject: string }) => Promise<unknown>;
  saving?: boolean;
};

export default function NewThreadForm({
  errorMessage,
  onCreate,
  saving = false,
}: NewThreadFormProps) {
  const [body, setBody] = useState('');
  const [localError, setLocalError] = useState('');
  const [subject, setSubject] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const sanitizedSubject = sanitizeThreadSubject(subject);
    const sanitizedBody = sanitizeMessageText(body);

    if (!sanitizedSubject || !sanitizedBody) {
      setLocalError('Add a subject and message using plain text.');
      return;
    }

    setLocalError('');
    await onCreate({
      body: sanitizedBody,
      subject: sanitizedSubject,
    });
    setBody('');
    setSubject('');
  }

  return (
    <section className="account-status-panel messages-new-thread-panel" aria-labelledby="messages-new-thread-title">
      <div className="dashboard-section-heading">
        <span className="dashboard-panel-label">New thread</span>
        <h2 id="messages-new-thread-title">Start a conversation</h2>
      </div>
      <p>
        Send project questions, updates, or decisions as plain text. I’ll keep the thread
        tied to your client record.
      </p>
      <form className="messages-compose-form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Subject"
          onChange={(event) => setSubject(event.target.value)}
          required
          value={subject}
        />
        <TextField
          fullWidth
          label="Message"
          minRows={7}
          multiline
          onChange={(event) => setBody(event.target.value)}
          required
          value={body}
        />
        {localError || errorMessage ? (
          <Alert severity="error">{localError || errorMessage}</Alert>
        ) : null}
        <MuiButton
          className="messages-action-button"
          disabled={saving}
          type="submit"
          variant="contained"
        >
          {saving ? 'Sending' : 'Create thread'}
        </MuiButton>
      </form>
    </section>
  );
}
