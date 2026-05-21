import { type ClientStatus } from '@apopto/shared';

export function formatAdminChoice(value: string) {
  return value
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

export function formatAdminDateTime(value?: string) {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatAdminDate(value?: string) {
  if (!value) {
    return 'Not set';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(value));
}

export function statusTone(status: ClientStatus) {
  if (status === 'active' || status === 'maintenance') {
    return 'live';
  }

  if (status === 'archived') {
    return 'muted';
  }

  if (status === 'proposal_sent' || status === 'contract_sent') {
    return 'sales';
  }

  return 'planning';
}
