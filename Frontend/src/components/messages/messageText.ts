const CONTROL_CHARACTERS_EXCEPT_NEWLINES_AND_TABS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const HTML_TAG = /<[^>\n]{1,200}>/g;

export function sanitizeMessageText(value: string) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARACTERS_EXCEPT_NEWLINES_AND_TABS, '')
    .replace(HTML_TAG, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

export function sanitizeThreadSubject(value: string) {
  return sanitizeMessageText(value)
    .replace(/\s+/g, ' ')
    .slice(0, 160)
    .trim();
}

export function formatMessageTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
