import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import {
  buildClientProfileItem,
  buildMembershipItem,
  buildMessageItem,
  buildThreadItem,
  buildUserProfileItem,
  createMessagesHandler,
  pk,
  type ClientProfileItem,
  type MembershipItem,
  type MessageItem,
  type MessagesRepository,
  type PortalTableItem,
  type ThreadItem,
  type TransactWriteItem,
  type UserProfileItem,
} from '../src/index.js';

const auth0Sub = 'auth0|messages';
const clientId = 'client_messages';
const otherClientId = 'client_other';
const createdAt = '2026-05-22T16:00:00.000Z';
const now = '2026-05-22T16:30:00.000Z';
const requestId = 'request-messages-phase-38';

function itemKey(key: { PK: string; SK: string }) {
  return `${key.PK}|${key.SK}`;
}

function userItem(overrides: Partial<UserProfileItem> = {}) {
  return buildUserProfileItem({
    auth0Sub,
    createdAt,
    email: 'owner@example.com',
    lastLoginAt: now,
    name: 'Message Owner',
    ...overrides,
  });
}

function clientItem(overrides: Partial<ClientProfileItem> = {}) {
  return buildClientProfileItem({
    businessName: 'North Star Remodeling',
    clientId,
    createdAt,
    primaryContactUserId: auth0Sub,
    status: 'active',
    updatedAt: now,
    ...overrides,
  });
}

function membershipItem(overrides: Partial<MembershipItem> = {}) {
  return buildMembershipItem({
    auth0Sub,
    clientId,
    createdAt,
    role: 'client_owner',
    status: 'active',
    updatedAt: createdAt,
    ...overrides,
  });
}

function threadItem(overrides: Partial<ThreadItem> = {}) {
  const resolvedClientId = overrides.clientId ?? clientId;
  const resolvedThreadId = overrides.threadId ?? 'thread_existing';
  const updatedAt = overrides.updatedAt ?? '2026-05-22T16:10:00.000Z';

  return buildThreadItem({
    clientId: resolvedClientId,
    createdAt,
    createdBy: auth0Sub,
    lastMessageAt: updatedAt,
    lastMessagePreview: 'Initial thread message',
    subject: 'Launch timing',
    threadId: resolvedThreadId,
    updatedAt,
    ...overrides,
  });
}

function messageItem(overrides: Partial<MessageItem> = {}) {
  const resolvedClientId = overrides.clientId ?? clientId;
  const resolvedThreadId = overrides.threadId ?? 'thread_existing';
  const resolvedMessageId = overrides.messageId ?? 'message_existing';
  const messageCreatedAt = overrides.createdAt ?? '2026-05-22T16:11:00.000Z';

  return buildMessageItem({
    body: 'Initial thread message',
    clientId: resolvedClientId,
    createdAt: messageCreatedAt,
    emailNotificationStatus: 'not_sent',
    messageId: resolvedMessageId,
    senderRole: 'client',
    senderUserId: auth0Sub,
    threadId: resolvedThreadId,
    visibility: 'client_and_admin',
    ...overrides,
  });
}

function applyUpdate(item: PortalTableItem, entry: Extract<TransactWriteItem, { action: 'update' }>) {
  return {
    ...item,
    lastMessageAt: entry.expressionAttributeValues?.[':lastMessageAt'] ?? (item as ThreadItem).lastMessageAt,
    lastMessagePreview: entry.expressionAttributeValues?.[':lastMessagePreview'] ?? (item as ThreadItem).lastMessagePreview,
    updatedAt: entry.expressionAttributeValues?.[':updatedAt'] ?? (item as ThreadItem).updatedAt,
  } as PortalTableItem;
}

function fakeRepository(initialItems: PortalTableItem[] = [
  userItem(),
  clientItem(),
  membershipItem(),
]) {
  const itemsByKey = new Map<string, PortalTableItem>();

  for (const item of initialItems) {
    itemsByKey.set(itemKey(item), item);
  }

  const repository = {
    getItem: vi.fn(async (key: { PK: string; SK: string }) => (
      itemsByKey.get(itemKey(key)) ?? null
    )),
    queryByIndex: vi.fn(async (options: {
      indexName: 'GSI1' | 'GSI2';
      pk: string;
      skBeginsWith?: string;
    }) => {
      if (options.indexName === 'GSI1') {
        return [...itemsByKey.values()].filter((item): item is MembershipItem => (
          item.type === 'MEMBERSHIP'
          && item.GSI1PK === options.pk
          && (!options.skBeginsWith || item.GSI1SK.startsWith(options.skBeginsWith))
        ));
      }

      return [...itemsByKey.values()].filter((item): item is ThreadItem => (
        item.type === 'THREAD'
        && item.GSI2PK === options.pk
        && item.GSI2SK.startsWith(options.skBeginsWith ?? '')
      ));
    }),
    queryByPartition: vi.fn(async (options: {
      pk: string;
      skBeginsWith?: string;
      limit?: number;
      scanIndexForward?: boolean;
    }) => {
      const items = [...itemsByKey.values()]
        .filter((item) => (
          item.PK === options.pk
          && (!options.skBeginsWith || item.SK.startsWith(options.skBeginsWith))
        ))
        .sort((left, right) => left.SK.localeCompare(right.SK));
      const orderedItems = options.scanIndexForward === false ? items.reverse() : items;

      return orderedItems.slice(0, options.limit ?? orderedItems.length);
    }),
    transactWriteItems: vi.fn(async (entries: TransactWriteItem<PortalTableItem>[]) => {
      for (const entry of entries) {
        if (entry.action === 'delete') {
          itemsByKey.delete(itemKey(entry.key));
        } else if (entry.action === 'update') {
          const current = itemsByKey.get(itemKey(entry.key));

          if (current) {
            itemsByKey.set(itemKey(entry.key), applyUpdate(current, entry));
          }
        } else {
          itemsByKey.set(itemKey(entry.item), entry.item);
        }
      }
    }),
    updateItem: vi.fn(async <TItem extends PortalTableItem = PortalTableItem>(key: {
      PK: string;
      SK: string;
    }, options: {
      expressionAttributeValues?: Record<string, unknown>;
    }): Promise<TItem | null> => {
      const current = itemsByKey.get(itemKey(key));

      if (!current) {
        return null;
      }

      const emailNotificationStatus = options.expressionAttributeValues?.[
        ':emailNotificationStatus'
      ];

      const updated = typeof emailNotificationStatus === 'string'
        ? {
          ...current,
          emailNotificationStatus,
        } as PortalTableItem
        : current;

      itemsByKey.set(itemKey(key), updated);

      return updated as TItem;
    }),
    itemsByKey,
  } satisfies MessagesRepository & {
    itemsByKey: Map<string, PortalTableItem>;
  };

  return repository;
}

function apiEvent({
  body,
  pathParameters,
  rawPath,
  routeKey,
  scopes,
}: {
  body?: unknown;
  pathParameters?: Record<string, string>;
  rawPath?: string;
  routeKey: string;
  scopes?: string[];
}) {
  const [method, routePath] = routeKey.split(' ');
  const resolvedScopes = scopes ?? (method === 'GET' ? ['read:messages'] : ['write:messages']);

  return {
    body: body === undefined ? undefined : JSON.stringify(body),
    rawPath: rawPath ?? routePath,
    routeKey,
    pathParameters,
    requestContext: {
      requestId,
      http: {
        method,
        path: rawPath ?? routePath,
      },
      authorizer: {
        jwt: {
          claims: {
            sub: auth0Sub,
            scope: resolvedScopes.join(' '),
          },
          scopes: resolvedScopes,
        },
      },
    },
  } as unknown as APIGatewayProxyEventV2;
}

const context = {
  awsRequestId: 'lambda-request-id',
} as Context;

function responseBody(response: { body?: string }) {
  return JSON.parse(response.body ?? '{}') as Record<string, unknown>;
}

describe('messages handler routes', () => {
  it('creates a thread, first plain-text message, and audit event under the resolved client', async () => {
    const repository = fakeRepository();
    const handler = createMessagesHandler({
      newAuditId: () => 'audit_thread_created',
      newMessageId: () => 'message_first',
      newThreadId: () => 'thread_new',
      now: () => now,
      repository,
    });

    const response = await handler(apiEvent({
      body: {
        body: 'Hello <strong>team</strong>.\u0000\nCan we talk launch?',
        subject: '<em>Launch</em> timing',
      },
      routeKey: 'POST /api/threads',
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(201);
    expect(body).toMatchObject({
      messages: [{
        body: 'Hello team.\nCan we talk launch?',
        emailNotificationStatus: 'not_sent',
        messageId: 'message_first',
        senderRole: 'client',
        threadId: 'thread_new',
        visibility: 'client_and_admin',
      }],
      thread: {
        lastMessagePreview: 'Hello team. Can we talk launch?',
        subject: 'Launch timing',
        threadId: 'thread_new',
      },
    });
    expect(repository.transactWriteItems).toHaveBeenCalledWith([
      expect.objectContaining({
        item: expect.objectContaining({
          GSI2PK: 'THREAD#thread_new',
          GSI2SK: 'CLIENT#client_messages',
          PK: 'CLIENT#client_messages',
          SK: `THREAD#${now}#thread_new`,
          type: 'THREAD',
        }),
      }),
      expect.objectContaining({
        item: expect.objectContaining({
          PK: 'THREAD#thread_new',
          SK: `MESSAGE#${now}#message_first`,
          clientId,
          emailNotificationStatus: 'not_sent',
          type: 'MESSAGE',
        }),
      }),
      expect.objectContaining({
        item: expect.objectContaining({
          action: 'thread.created',
          actorUserId: auth0Sub,
          clientId,
          entityId: 'thread_new',
          type: 'AUDIT',
        }),
      }),
    ]);
  });

  it('lists bounded thread metadata from the client partition without scanning', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      threadItem({ threadId: 'thread_old', updatedAt: '2026-05-22T16:01:00.000Z' }),
      threadItem({ threadId: 'thread_new', updatedAt: '2026-05-22T16:20:00.000Z' }),
      threadItem({ clientId: otherClientId, threadId: 'thread_other' }),
    ]);
    const handler = createMessagesHandler({ repository });

    const response = await handler(apiEvent({
      routeKey: 'GET /api/threads',
    }), context);
    const body = responseBody(response) as {
      threads?: Array<{ threadId: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.threads?.map((thread) => thread.threadId)).toEqual(['thread_new', 'thread_old']);
    expect(repository.queryByPartition).toHaveBeenCalledWith({
      limit: 50,
      pk: 'CLIENT#client_messages',
      scanIndexForward: false,
      skBeginsWith: 'THREAD#',
    });
  });

  it('lists client-visible messages after verifying the thread belongs to the tenant', async () => {
    const thread = threadItem({ threadId: 'thread_existing' });
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      thread,
      messageItem({ messageId: 'message_1', threadId: thread.threadId }),
      messageItem({
        messageId: 'message_internal',
        threadId: thread.threadId,
        visibility: 'internal_only',
      }),
    ]);
    const handler = createMessagesHandler({ repository });

    const response = await handler(apiEvent({
      pathParameters: {
        threadId: thread.threadId,
      },
      rawPath: `/api/threads/${thread.threadId}/messages`,
      routeKey: 'GET /api/threads/{threadId}/messages',
    }), context);
    const body = responseBody(response) as {
      messages?: Array<{ messageId: string }>;
    };

    expect(response.statusCode).toBe(200);
    expect(body.messages?.map((message) => message.messageId)).toEqual(['message_1']);
    expect(repository.queryByIndex).toHaveBeenCalledWith({
      indexName: 'GSI2',
      limit: 1,
      pk: 'THREAD#thread_existing',
      skBeginsWith: 'CLIENT#client_messages',
    });
    expect(repository.queryByPartition).toHaveBeenCalledWith({
      limit: 100,
      pk: 'THREAD#thread_existing',
      scanIndexForward: true,
      skBeginsWith: 'MESSAGE#',
    });
  });

  it('creates a reply, moves thread metadata forward, and leaves email notification not sent', async () => {
    const thread = threadItem({
      threadId: 'thread_existing',
      updatedAt: '2026-05-22T16:05:00.000Z',
    });
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      thread,
    ]);
    const handler = createMessagesHandler({
      newAuditId: () => 'audit_message_created',
      newMessageId: () => 'message_reply',
      now: () => now,
      repository,
    });

    const response = await handler(apiEvent({
      body: {
        body: 'Reply with **markdown-style emphasis** only.',
      },
      pathParameters: {
        threadId: thread.threadId,
      },
      rawPath: `/api/threads/${thread.threadId}/messages`,
      routeKey: 'POST /api/threads/{threadId}/messages',
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(201);
    expect(body).toMatchObject({
      messages: [{
        emailNotificationStatus: 'not_sent',
        messageId: 'message_reply',
        threadId: 'thread_existing',
      }],
      thread: {
        lastMessagePreview: 'Reply with **markdown-style emphasis** only.',
        threadId: 'thread_existing',
        updatedAt: now,
      },
    });
    expect(repository.transactWriteItems).toHaveBeenCalledWith([
      expect.objectContaining({
        item: expect.objectContaining({
          PK: 'THREAD#thread_existing',
          SK: `MESSAGE#${now}#message_reply`,
          emailNotificationStatus: 'not_sent',
        }),
      }),
      expect.objectContaining({
        action: 'delete',
        key: {
          PK: thread.PK,
          SK: thread.SK,
        },
      }),
      expect.objectContaining({
        item: expect.objectContaining({
          PK: 'CLIENT#client_messages',
          SK: `THREAD#${now}#thread_existing`,
          lastMessagePreview: 'Reply with **markdown-style emphasis** only.',
        }),
      }),
      expect.objectContaining({
        item: expect.objectContaining({
          action: 'message.created',
          entityId: 'message_reply',
          entityType: 'MESSAGE',
        }),
      }),
    ]);
  });

  it('sends and marks a new-thread email notification when SES is configured', async () => {
    const repository = fakeRepository();
    const sendMessageNotification = vi.fn(async () => ({
      status: 'sent' as const,
    }));
    const handler = createMessagesHandler({
      environment: {
        PORTAL_BASE_URL: 'https://portal.apopto.test',
        SES_FROM_EMAIL: 'portal@example.com',
        SES_NOTIFICATION_TO_EMAIL: 'jake@example.com',
      },
      newAuditId: () => 'audit_thread_created',
      newMessageId: () => 'message_first',
      newThreadId: () => 'thread_new',
      now: () => now,
      repository,
      sendMessageNotification,
    });

    const response = await handler(apiEvent({
      body: {
        body: 'Can we talk launch?',
        subject: 'Launch timing',
      },
      routeKey: 'POST /api/threads',
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(201);
    expect(sendMessageNotification).toHaveBeenCalledWith(expect.objectContaining({
      config: {
        fromEmail: 'portal@example.com',
        notificationToEmail: 'jake@example.com',
        portalBaseUrl: 'https://portal.apopto.test',
      },
      message: expect.objectContaining({
        messageId: 'message_first',
      }),
      thread: expect.objectContaining({
        threadId: 'thread_new',
      }),
    }));
    expect(repository.updateItem).toHaveBeenCalledWith(
      {
        PK: 'THREAD#thread_new',
        SK: `MESSAGE#${now}#message_first`,
      },
      expect.objectContaining({
        expressionAttributeValues: expect.objectContaining({
          ':emailNotificationStatus': 'sent',
        }),
      }),
    );
    expect(body).toMatchObject({
      messages: [{
        emailNotificationStatus: 'sent',
        messageId: 'message_first',
      }],
    });
  });

  it('marks a reply notification failed when the optional SES send fails', async () => {
    const thread = threadItem({
      threadId: 'thread_existing',
      updatedAt: '2026-05-22T16:05:00.000Z',
    });
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      thread,
    ]);
    const handler = createMessagesHandler({
      environment: {
        PORTAL_BASE_URL: 'https://portal.apopto.test',
        SES_FROM_EMAIL: 'portal@example.com',
      },
      newAuditId: () => 'audit_message_created',
      newMessageId: () => 'message_reply',
      now: () => now,
      repository,
      sendMessageNotification: vi.fn(async () => ({
        errorName: 'MessageRejected',
        status: 'failed' as const,
      })),
    });

    const response = await handler(apiEvent({
      body: {
        body: 'This one should record a failed notification.',
      },
      pathParameters: {
        threadId: thread.threadId,
      },
      rawPath: `/api/threads/${thread.threadId}/messages`,
      routeKey: 'POST /api/threads/{threadId}/messages',
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(201);
    expect(repository.updateItem).toHaveBeenCalledWith(
      {
        PK: 'THREAD#thread_existing',
        SK: `MESSAGE#${now}#message_reply`,
      },
      expect.objectContaining({
        expressionAttributeValues: expect.objectContaining({
          ':emailNotificationStatus': 'failed',
        }),
      }),
    );
    expect(body).toMatchObject({
      messages: [{
        emailNotificationStatus: 'failed',
        messageId: 'message_reply',
      }],
    });
  });

  it('does not expose or write messages for a thread owned by another client', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem(),
      membershipItem(),
      threadItem({
        clientId: otherClientId,
        threadId: 'thread_cross_client',
      }),
    ]);
    const handler = createMessagesHandler({ repository });

    const response = await handler(apiEvent({
      pathParameters: {
        threadId: 'thread_cross_client',
      },
      rawPath: '/api/threads/thread_cross_client/messages',
      routeKey: 'POST /api/threads/{threadId}/messages',
      body: {
        body: 'Cross-client write should not work.',
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(404);
    expect(body).toMatchObject({
      error: 'thread_not_found',
    });
    expect(repository.queryByIndex).toHaveBeenCalledWith({
      indexName: 'GSI2',
      limit: 1,
      pk: 'THREAD#thread_cross_client',
      skBeginsWith: 'CLIENT#client_messages',
    });
    expect(repository.transactWriteItems).not.toHaveBeenCalled();
  });

  it('rejects messages when the client lifecycle does not allow messaging', async () => {
    const repository = fakeRepository([
      userItem(),
      clientItem({ status: 'lead' }),
      membershipItem(),
    ]);
    const handler = createMessagesHandler({ repository });

    const response = await handler(apiEvent({
      routeKey: 'GET /api/threads',
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(403);
    expect(body).toMatchObject({
      error: 'messages_not_available',
      details: {
        clientStatus: 'lead',
      },
    });
  });

  it('requires route-specific message scopes', async () => {
    const repository = fakeRepository();
    const handler = createMessagesHandler({ repository });

    const response = await handler(apiEvent({
      routeKey: 'POST /api/threads',
      scopes: ['read:messages'],
      body: {
        body: 'Missing write scope.',
        subject: 'Scope check',
      },
    }), context);
    const body = responseBody(response);

    expect(response.statusCode).toBe(403);
    expect(body).toMatchObject({
      error: 'insufficient_scope',
      details: {
        missingScopes: ['write:messages'],
      },
    });
    expect(repository.transactWriteItems).not.toHaveBeenCalled();
  });
});
