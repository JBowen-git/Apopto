import { describe, expect, it } from 'vitest';

import {
  adminProfileKey,
  auditKey,
  clientProfileKey,
  currentIntakeKey,
  fileByIdGsiKey,
  fileByProjectGsiKey,
  fileKey,
  invoiceKey,
  membershipByUserGsiKey,
  membershipKey,
  messageByClientGsiKey,
  messageKey,
  projectKey,
  threadKey,
  userProfileKey,
} from '../src/dynamodb/index.js';

const createdAt = '2026-05-21T10:15:30.000Z';

describe('DynamoDB key builders', () => {
  it('builds profile and membership keys', () => {
    expect(clientProfileKey('client_123')).toEqual({
      PK: 'CLIENT#client_123',
      SK: 'PROFILE#',
    });

    expect(userProfileKey('auth0|abc')).toEqual({
      PK: 'USER#auth0|abc',
      SK: 'PROFILE#',
    });

    expect(adminProfileKey('auth0|admin')).toEqual({
      PK: 'ADMIN#auth0|admin',
      SK: 'PROFILE#',
    });

    expect(membershipKey('client_123', 'auth0|abc')).toEqual({
      PK: 'CLIENT#client_123',
      SK: 'USER#auth0|abc',
    });

    expect(membershipByUserGsiKey('auth0|abc', 'client_123')).toEqual({
      GSI1PK: 'USER#auth0|abc',
      GSI1SK: 'CLIENT#client_123',
    });
  });

  it('builds client-owned entity keys', () => {
    expect(currentIntakeKey('client_123')).toEqual({
      PK: 'CLIENT#client_123',
      SK: 'INTAKE#CURRENT',
    });

    expect(projectKey('client_123', 'project_123')).toEqual({
      PK: 'CLIENT#client_123',
      SK: 'PROJECT#project_123',
    });

    expect(fileKey('client_123', createdAt, 'file_123')).toEqual({
      PK: 'CLIENT#client_123',
      SK: `FILE#${createdAt}#file_123`,
    });

    expect(threadKey('client_123', createdAt, 'thread_123')).toEqual({
      PK: 'CLIENT#client_123',
      SK: `THREAD#${createdAt}#thread_123`,
    });

    expect(invoiceKey('client_123', '2026-06-01', 'invoice_123')).toEqual({
      PK: 'CLIENT#client_123',
      SK: 'INVOICE#2026-06-01#invoice_123',
    });

    expect(auditKey('client_123', createdAt, 'audit_123')).toEqual({
      PK: 'CLIENT#client_123',
      SK: `AUDIT#${createdAt}#audit_123`,
    });
  });

  it('builds cross-partition lookup keys', () => {
    expect(fileByProjectGsiKey('project_123', createdAt, 'file_123')).toEqual({
      GSI1PK: 'PROJECT#project_123',
      GSI1SK: `FILE#${createdAt}#file_123`,
    });

    expect(fileByIdGsiKey('file_123', 'client_123')).toEqual({
      GSI2PK: 'FILE#file_123',
      GSI2SK: 'CLIENT#client_123',
    });

    expect(messageKey('thread_123', createdAt, 'message_123')).toEqual({
      PK: 'THREAD#thread_123',
      SK: `MESSAGE#${createdAt}#message_123`,
    });

    expect(messageByClientGsiKey('client_123', createdAt, 'message_123')).toEqual({
      GSI1PK: 'CLIENT#client_123',
      GSI1SK: `MESSAGE#${createdAt}#message_123`,
    });
  });

  it('rejects blank key parts', () => {
    expect(() => clientProfileKey('')).toThrow('clientId is required');
    expect(() => projectKey('client_123', '   ')).toThrow('projectId is required');
  });
});
