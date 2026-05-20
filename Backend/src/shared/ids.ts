export function newId(prefix = 'id') {
  const timestamp = Date.now().toString(36);
  const entropy = Math.random().toString(36).slice(2, 10);

  return `${prefix}_${timestamp}_${entropy}`;
}
