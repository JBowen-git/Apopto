export type PortalTableKey = {
  PK: string;
  SK: string;
};

export type PortalGsi1Key = {
  GSI1PK: string;
  GSI1SK: string;
};

export type PortalGsi2Key = {
  GSI2PK: string;
  GSI2SK: string;
};

export type PortalIndexName = 'GSI1' | 'GSI2';

function requireKeyPart(name: string, value: string) {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new Error(`${name} is required for a DynamoDB key.`);
  }

  return trimmed;
}

export const pk = {
  client: (clientId: string) => `CLIENT#${requireKeyPart('clientId', clientId)}`,
  user: (auth0Sub: string) => `USER#${requireKeyPart('auth0Sub', auth0Sub)}`,
  thread: (threadId: string) => `THREAD#${requireKeyPart('threadId', threadId)}`,
  admin: (auth0Sub: string) => `ADMIN#${requireKeyPart('auth0Sub', auth0Sub)}`,
  project: (projectId: string) => `PROJECT#${requireKeyPart('projectId', projectId)}`,
  file: (fileId: string) => `FILE#${requireKeyPart('fileId', fileId)}`,
} as const;

export const sk = {
  profile: () => 'PROFILE#',
  user: (auth0Sub: string) => `USER#${requireKeyPart('auth0Sub', auth0Sub)}`,
  client: (clientId: string) => `CLIENT#${requireKeyPart('clientId', clientId)}`,
  currentIntake: () => 'INTAKE#CURRENT',
  project: (projectId: string) => `PROJECT#${requireKeyPart('projectId', projectId)}`,
  file: (createdAt: string, fileId: string) => (
    `FILE#${requireKeyPart('createdAt', createdAt)}#${requireKeyPart('fileId', fileId)}`
  ),
  thread: (updatedAt: string, threadId: string) => (
    `THREAD#${requireKeyPart('updatedAt', updatedAt)}#${requireKeyPart('threadId', threadId)}`
  ),
  message: (createdAt: string, messageId: string) => (
    `MESSAGE#${requireKeyPart('createdAt', createdAt)}#${requireKeyPart('messageId', messageId)}`
  ),
  invoice: (dueDate: string, invoiceId: string) => (
    `INVOICE#${requireKeyPart('dueDate', dueDate)}#${requireKeyPart('invoiceId', invoiceId)}`
  ),
  audit: (createdAt: string, eventId: string) => (
    `AUDIT#${requireKeyPart('createdAt', createdAt)}#${requireKeyPart('eventId', eventId)}`
  ),
} as const;

export function clientProfileKey(clientId: string): PortalTableKey {
  return {
    PK: pk.client(clientId),
    SK: sk.profile(),
  };
}

export function userProfileKey(auth0Sub: string): PortalTableKey {
  return {
    PK: pk.user(auth0Sub),
    SK: sk.profile(),
  };
}

export function adminProfileKey(auth0Sub: string): PortalTableKey {
  return {
    PK: pk.admin(auth0Sub),
    SK: sk.profile(),
  };
}

export function membershipKey(clientId: string, auth0Sub: string): PortalTableKey {
  return {
    PK: pk.client(clientId),
    SK: sk.user(auth0Sub),
  };
}

export function membershipByUserGsiKey(auth0Sub: string, clientId: string): PortalGsi1Key {
  return {
    GSI1PK: pk.user(auth0Sub),
    GSI1SK: sk.client(clientId),
  };
}

export function currentIntakeKey(clientId: string): PortalTableKey {
  return {
    PK: pk.client(clientId),
    SK: sk.currentIntake(),
  };
}

export function projectKey(clientId: string, projectId: string): PortalTableKey {
  return {
    PK: pk.client(clientId),
    SK: sk.project(projectId),
  };
}

export function fileKey(clientId: string, createdAt: string, fileId: string): PortalTableKey {
  return {
    PK: pk.client(clientId),
    SK: sk.file(createdAt, fileId),
  };
}

export function fileByProjectGsiKey(projectId: string, createdAt: string, fileId: string): PortalGsi1Key {
  return {
    GSI1PK: pk.project(projectId),
    GSI1SK: sk.file(createdAt, fileId),
  };
}

export function fileByIdGsiKey(fileId: string, clientId: string): PortalGsi2Key {
  return {
    GSI2PK: pk.file(fileId),
    GSI2SK: pk.client(clientId),
  };
}

export function threadKey(clientId: string, updatedAt: string, threadId: string): PortalTableKey {
  return {
    PK: pk.client(clientId),
    SK: sk.thread(updatedAt, threadId),
  };
}

export function messageKey(threadId: string, createdAt: string, messageId: string): PortalTableKey {
  return {
    PK: pk.thread(threadId),
    SK: sk.message(createdAt, messageId),
  };
}

export function messageByClientGsiKey(clientId: string, createdAt: string, messageId: string): PortalGsi1Key {
  return {
    GSI1PK: pk.client(clientId),
    GSI1SK: sk.message(createdAt, messageId),
  };
}

export function invoiceKey(clientId: string, dueDate: string, invoiceId: string): PortalTableKey {
  return {
    PK: pk.client(clientId),
    SK: sk.invoice(dueDate, invoiceId),
  };
}

export function auditKey(clientId: string, createdAt: string, eventId: string): PortalTableKey {
  return {
    PK: pk.client(clientId),
    SK: sk.audit(createdAt, eventId),
  };
}
