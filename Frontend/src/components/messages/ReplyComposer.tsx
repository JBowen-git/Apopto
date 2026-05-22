import { Alert, Button as MuiButton, TextField } from '@mui/material';
import { useState, type FormEvent } from 'react';
import { sanitizeMessageText } from './messageText';

type ReplyComposerProps = {
  errorMessage?: string;
  onReply: (input: { body: string }) => Promise<unknown>;
  saving?: boolean;
};

export default function ReplyComposer({
  errorMessage,
  onReply,
  saving = false,
}: ReplyComposerProps) {
  const [body, setBody] = useState('');
  const [localError, setLocalError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const sanitizedBody = sanitizeMessageText(body);

    if (!sanitizedBody) {
      setLocalError('Add a reply using plain text.');
      return;
    }

    setLocalError('');
    await onReply({ body: sanitizedBody });
    setBody('');
  }

  return (
    <form className="messages-reply-form" onSubmit={handleSubmit}>
      <TextField
        fullWidth
        label="Reply"
        minRows={4}
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
        {saving ? 'Sending' : 'Send reply'}
      </MuiButton>
    </form>
  );
}
