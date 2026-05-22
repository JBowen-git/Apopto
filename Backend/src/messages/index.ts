import {
  CreateMessageRequestSchema,
  CreateThreadRequestSchema,
  ListThreadsResponseSchema,
  MessageSummarySchema,
  ThreadMessagesResponseSchema,
  ThreadSummarySchema,
  type CreateMessageRequest,
  type CreateThreadRequest,
  type ListThreadsResponse,
  type MessageSummary,
  type ThreadMessagesResponse,
  type ThreadSummary,
} from '@apopto/shared';

import {
  buildAuditEventItem,
  buildMessageItem,
  buildThreadItem,
  pk,
  threadByIdGsiKey,
  type AuditEventItem,
  type MessageItem,
  type PortalTableItem,
  type ThreadItem,
  type TransactWriteItem,
} from '../dynamodb/index.js';
import { newId } from '../shared/ids.js';
import { validateWithSchema } from '../shared/validation.js';
import {
  resolveClientContext,
  type ResolvedClientContext,
  type TenantResolverRepository,
} from '../tenant/index.js';

export const messageSliceLimits = {
  messages: 100,
  threads: 50,
} as const;

const MAX_SUBJECT_LENGTH = 160;
const MAX_BODY_LENGTH = 10_000;
const MAX_PREVIEW_LENGTH = 160;
const CONTROL_CHARACTERS_EXCEPT_NEWLINES_AND_TABS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const HTML_TAG = /<[^>\n]{1,200}>/g;

export type MessagesRepository = TenantResolverRepository & {
  queryByPartition<TItem extends PortalTableItem = PortalTableItem>(
    options: {
      pk: string;
      skBeginsWith?: string;
      limit?: number;
      scanIndexForward?: boolean;
      consistentRead?: boolean;
    },
  ): Promise<TItem[]>;
  transactWriteItems<TItem extends PortalTableItem>(
    items: TransactWriteItem<TItem>[],
  ): Promise<void>;
};

export type MessagesApiFailure = {
  ok: false;
  statusCode: 400 | 401 | 403 | 404 | 409 | 500;
  error: string;
  message: string;
  details?: unknown;
};

export type ListThreadsResult =
  | { ok: true; response: ListThreadsResponse }
  | MessagesApiFailure;

export type ThreadMessagesResult =
  | { ok: true; response: ThreadMessagesResponse }
  | MessagesApiFailure;

export type MessageServiceInput = {
  auth0Sub: string;
  repository: MessagesRepository;
  newAuditId?: () => string;
  newMessageId?: () => string;
  newThreadId?: () => string;
  now?: () => string;
};

function isThreadItem(item: PortalTableItem): item is ThreadItem {
  return item.type === 'THREAD';
}

function isMessageItem(item: PortalTableItem): item is MessageItem {
  return item.type === 'MESSAGE';
}

function failureFromTenantResolution(
  result: Awaited<ReturnType<typeof resolveClientContext>>,
): MessagesApiFailure {
  if (result.ok) {
    throw new Error('Resolved tenant context cannot be converted to a failure.');
  }

  if (result.reason === 'user_not_found') {
    return {
      ok: false,
      statusCode: 401,
      error: 'user_not_found',
      message: 'The authenticated user has not been initialized in the client portal.',
    };
  }

  if (result.reason === 'no_active_membership') {
    return {
      ok: false,
      statusCode: 403,
      error: 'no_active_membership',
      message: 'The authenticated user does not have an active client membership.',
      details: {
        memberships: result.memberships,
      },
    };
  }

  if (result.reason === 'multiple_active_memberships') {
    return {
      ok: false,
      statusCode: 409,
      error: 'tenant_context_not_ready',
      message: 'The authenticated user could not be mapped to exactly one active client.',
      details: {
        memberships: result.memberships,
      },
    };
  }

  return {
    ok: false,
    statusCode: 500,
    error: 'client_profile_missing',
    message: 'The active client membership points to a missing client profile.',
    details: {
      clientId: result.membership.clientId,
    },
  };
}

async function resolveMessageContext({
  auth0Sub,
  repository,
}: Pick<MessageServiceInput, 'auth0Sub' | 'repository'>): Promise<
  | { ok: true; context: ResolvedClientContext }
  | MessagesApiFailure
> {
  const result = await resolveClientContext({ auth0Sub, repository });

  if (!result.ok) {
    return failureFromTenantResolution(result);
  }

  if (!result.context.featureFlags.canSendMessages) {
    return {
      ok: false,
      statusCode: 403,
      error: 'messages_not_available',
      message: 'Messages are not available for this client status.',
      details: {
        clientStatus: result.context.client.status,
      },
    };
  }

  return {
    ok: true,
    context: result.context,
  };
}

function validationFailure(issues: unknown[]): MessagesApiFailure {
  return {
    ok: false,
    statusCode: 400,
    error: 'validation_failed',
    message: 'The request body did not match the expected schema.',
    details: {
      issues,
    },
  };
}

function textValidationFailure(error: string, message: string): MessagesApiFailure {
  return {
    ok: false,
    statusCode: 400,
    error,
    message,
  };
}

function writeFailure(error: unknown): MessagesApiFailure {
  const errorName = (error as { name?: string }).name ?? 'UnknownError';

  if (
    errorName === 'ConditionalCheckFailedException'
    || errorName === 'TransactionCanceledException'
  ) {
    return {
      ok: false,
      statusCode: 409,
      error: 'write_conflict',
      message: 'The message thread changed while this request was being saved. Please try again.',
    };
  }

  return {
    ok: false,
    statusCode: 500,
    error: 'message_write_failed',
    message: 'The message request could not be saved.',
    details: {
      errorName,
    },
  };
}

function threadNotFoundFailure(): MessagesApiFailure {
  return {
    ok: false,
    statusCode: 404,
    error: 'thread_not_found',
    message: 'The requested message thread was not found for this client.',
  };
}

export function sanitizeMessageBody(body: string) {
  return body
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARACTERS_EXCEPT_NEWLINES_AND_TABS, '')
    .replace(HTML_TAG, '')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

export function sanitizeThreadSubject(subject: string) {
  return sanitizeMessageBody(subject)
    .replace(/\s+/g, ' ')
    .slice(0, MAX_SUBJECT_LENGTH)
    .trim();
}

function validateSanitizedBody(body: string): MessagesApiFailure | null {
  if (body.length === 0) {
    return textValidationFailure(
      'message_body_required',
      'Message body must contain plain text after sanitization.',
    );
  }

  if (body.length > MAX_BODY_LENGTH) {
    return textValidationFailure(
      'message_body_too_large',
      `Message body must be ${MAX_BODY_LENGTH} characters or fewer.`,
    );
  }

  return null;
}

function validateSanitizedSubject(subject: string): MessagesApiFailure | null {
  if (subject.length === 0) {
    return textValidationFailure(
      'thread_subject_required',
      'Thread subject must contain plain text after sanitization.',
    );
  }

  return null;
}

function messagePreview(body: string) {
  const compact = body.replace(/\s+/g, ' ').trim();

  return compact.length > MAX_PREVIEW_LENGTH
    ? `${compact.slice(0, MAX_PREVIEW_LENGTH - 1)}...`
    : compact;
}

function threadSummary(thread: ThreadItem): ThreadSummary {
  return ThreadSummarySchema.parse({
    createdAt: thread.createdAt,
    lastMessageAt: thread.lastMessageAt,
    lastMessagePreview: thread.lastMessagePreview,
    subject: thread.subject,
    threadId: thread.threadId,
    updatedAt: thread.updatedAt,
  });
}

function messageSummary(message: MessageItem): MessageSummary {
  return MessageSummarySchema.parse({
    body: message.body,
    createdAt: message.createdAt,
    emailNotificationStatus: message.emailNotificationStatus,
    messageId: message.messageId,
    senderRole: message.senderRole,
    senderUserId: message.senderUserId,
    threadId: message.threadId,
    visibility: message.visibility,
  });
}

function auditPut({
  action,
  actorUserId,
  clientId,
  createdAt,
  entityId,
  metadata,
  newAuditId,
}: {
  action: string;
  actorUserId: string;
  clientId: string;
  createdAt: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  newAuditId: () => string;
}): TransactWriteItem<AuditEventItem> {
  return {
    item: buildAuditEventItem({
      action,
      actorUserId,
      clientId,
      createdAt,
      entityId,
      entityType: 'MESSAGE',
      eventId: newAuditId(),
      ...(metadata ? { metadata } : {}),
    }),
    conditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
  };
}

async function getThreadForClient({
  clientId,
  repository,
  threadId,
}: {
  clientId: string;
  repository: MessagesRepository;
  threadId: string;
}) {
  const key = threadByIdGsiKey(threadId, clientId);
  const threads = await repository.queryByIndex<ThreadItem>({
    indexName: 'GSI2',
    limit: 1,
    pk: key.GSI2PK,
    skBeginsWith: key.GSI2SK,
  });

  return threads.find((thread) => (
    isThreadItem(thread)
    && thread.clientId === clientId
    && thread.threadId === threadId
  )) ?? null;
}

function threadMetadataWrites({
  nextThread,
  previousThread,
}: {
  nextThread: ThreadItem;
  previousThread: ThreadItem;
}): TransactWriteItem<ThreadItem>[] {
  if (previousThread.PK === nextThread.PK && previousThread.SK === nextThread.SK) {
    return [{
      action: 'update',
      key: {
        PK: previousThread.PK,
        SK: previousThread.SK,
      },
      conditionExpression: '#type = :type AND #clientId = :clientId AND #threadId = :threadId',
      expressionAttributeNames: {
        '#clientId': 'clientId',
        '#lastMessageAt': 'lastMessageAt',
        '#lastMessagePreview': 'lastMessagePreview',
        '#threadId': 'threadId',
        '#type': 'type',
        '#updatedAt': 'updatedAt',
      },
      expressionAttributeValues: {
        ':clientId': nextThread.clientId,
        ':lastMessageAt': nextThread.lastMessageAt,
        ':lastMessagePreview': nextThread.lastMessagePreview,
        ':threadId': nextThread.threadId,
        ':type': 'THREAD',
        ':updatedAt': nextThread.updatedAt,
      },
      updateExpression: [
        'SET #lastMessageAt = :lastMessageAt',
        '#lastMessagePreview = :lastMessagePreview',
        '#updatedAt = :updatedAt',
      ].join(', '),
    }];
  }

  return [
    {
      action: 'delete',
      key: {
        PK: previousThread.PK,
        SK: previousThread.SK,
      },
      conditionExpression: '#type = :type AND #clientId = :clientId AND #threadId = :threadId',
      expressionAttributeNames: {
        '#clientId': 'clientId',
        '#threadId': 'threadId',
        '#type': 'type',
      },
      expressionAttributeValues: {
        ':clientId': nextThread.clientId,
        ':threadId': nextThread.threadId,
        ':type': 'THREAD',
      },
    },
    {
      item: nextThread,
      conditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    },
  ];
}

export async function listThreads({
  auth0Sub,
  repository,
}: Pick<MessageServiceInput, 'auth0Sub' | 'repository'>): Promise<ListThreadsResult> {
  const resolved = await resolveMessageContext({ auth0Sub, repository });

  if (!resolved.ok) {
    return resolved;
  }

  const threads = await repository.queryByPartition<ThreadItem>({
    limit: messageSliceLimits.threads,
    pk: pk.client(resolved.context.client.clientId),
    scanIndexForward: false,
    skBeginsWith: 'THREAD#',
  });

  return {
    ok: true,
    response: ListThreadsResponseSchema.parse({
      threads: threads
        .filter(isThreadItem)
        .map(threadSummary),
    }),
  };
}

export async function createThread({
  auth0Sub,
  body,
  newAuditId = () => newId('audit'),
  newMessageId = () => newId('message'),
  newThreadId = () => newId('thread'),
  now = () => new Date().toISOString(),
  repository,
}: MessageServiceInput & {
  body: unknown;
}): Promise<ThreadMessagesResult> {
  const parsed = validateWithSchema<CreateThreadRequest>(CreateThreadRequestSchema, body);

  if (!parsed.ok) {
    return validationFailure(parsed.issues);
  }

  const subject = sanitizeThreadSubject(parsed.data.subject);
  const messageBody = sanitizeMessageBody(parsed.data.body);
  const subjectFailure = validateSanitizedSubject(subject);
  const bodyFailure = validateSanitizedBody(messageBody);

  if (subjectFailure) {
    return subjectFailure;
  }

  if (bodyFailure) {
    return bodyFailure;
  }

  const resolved = await resolveMessageContext({ auth0Sub, repository });

  if (!resolved.ok) {
    return resolved;
  }

  const { client, user } = resolved.context;
  const timestamp = now();
  const threadId = newThreadId();
  const messageId = newMessageId();
  const thread = buildThreadItem({
    clientId: client.clientId,
    createdAt: timestamp,
    createdBy: user.auth0Sub,
    lastMessageAt: timestamp,
    lastMessagePreview: messagePreview(messageBody),
    subject,
    threadId,
    updatedAt: timestamp,
  });
  const message = buildMessageItem({
    body: messageBody,
    clientId: client.clientId,
    createdAt: timestamp,
    emailNotificationStatus: 'not_sent',
    messageId,
    senderRole: 'client',
    senderUserId: user.auth0Sub,
    threadId,
    visibility: 'client_and_admin',
  });

  try {
    await repository.transactWriteItems<PortalTableItem>([
      {
        item: thread,
        conditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      },
      {
        item: message,
        conditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      },
      auditPut({
        action: 'thread.created',
        actorUserId: user.auth0Sub,
        clientId: client.clientId,
        createdAt: timestamp,
        entityId: threadId,
        metadata: {
          messageId,
          subject,
        },
        newAuditId,
      }),
    ]);
  } catch (error) {
    return writeFailure(error);
  }

  return {
    ok: true,
    response: ThreadMessagesResponseSchema.parse({
      messages: [messageSummary(message)],
      thread: threadSummary(thread),
    }),
  };
}

export async function listThreadMessages({
  auth0Sub,
  repository,
  threadId,
}: Pick<MessageServiceInput, 'auth0Sub' | 'repository'> & {
  threadId: string;
}): Promise<ThreadMessagesResult> {
  const resolved = await resolveMessageContext({ auth0Sub, repository });

  if (!resolved.ok) {
    return resolved;
  }

  const thread = await getThreadForClient({
    clientId: resolved.context.client.clientId,
    repository,
    threadId,
  });

  if (!thread) {
    return threadNotFoundFailure();
  }

  const messages = await repository.queryByPartition<MessageItem>({
    limit: messageSliceLimits.messages,
    pk: pk.thread(thread.threadId),
    scanIndexForward: true,
    skBeginsWith: 'MESSAGE#',
  });

  return {
    ok: true,
    response: ThreadMessagesResponseSchema.parse({
      messages: messages
        .filter((message) => (
          isMessageItem(message)
          && message.clientId === resolved.context.client.clientId
          && message.threadId === thread.threadId
          && message.visibility === 'client_and_admin'
        ))
        .map(messageSummary),
      thread: threadSummary(thread),
    }),
  };
}

export async function createMessage({
  auth0Sub,
  body,
  newAuditId = () => newId('audit'),
  newMessageId = () => newId('message'),
  now = () => new Date().toISOString(),
  repository,
  threadId,
}: MessageServiceInput & {
  body: unknown;
  threadId: string;
}): Promise<ThreadMessagesResult> {
  const parsed = validateWithSchema<CreateMessageRequest>(CreateMessageRequestSchema, body);

  if (!parsed.ok) {
    return validationFailure(parsed.issues);
  }

  const messageBody = sanitizeMessageBody(parsed.data.body);
  const bodyFailure = validateSanitizedBody(messageBody);

  if (bodyFailure) {
    return bodyFailure;
  }

  const resolved = await resolveMessageContext({ auth0Sub, repository });

  if (!resolved.ok) {
    return resolved;
  }

  const { client, user } = resolved.context;
  const existingThread = await getThreadForClient({
    clientId: client.clientId,
    repository,
    threadId,
  });

  if (!existingThread) {
    return threadNotFoundFailure();
  }

  const timestamp = now();
  const messageId = newMessageId();
  const message = buildMessageItem({
    body: messageBody,
    clientId: client.clientId,
    createdAt: timestamp,
    emailNotificationStatus: 'not_sent',
    messageId,
    senderRole: 'client',
    senderUserId: user.auth0Sub,
    threadId,
    visibility: 'client_and_admin',
  });
  const nextThread = buildThreadItem({
    clientId: existingThread.clientId,
    createdAt: existingThread.createdAt,
    createdBy: existingThread.createdBy,
    lastMessageAt: timestamp,
    lastMessagePreview: messagePreview(messageBody),
    subject: existingThread.subject,
    threadId: existingThread.threadId,
    updatedAt: timestamp,
  });

  try {
    await repository.transactWriteItems<PortalTableItem>([
      {
        item: message,
        conditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
      },
      ...threadMetadataWrites({
        nextThread,
        previousThread: existingThread,
      }),
      auditPut({
        action: 'message.created',
        actorUserId: user.auth0Sub,
        clientId: client.clientId,
        createdAt: timestamp,
        entityId: messageId,
        metadata: {
          threadId,
        },
        newAuditId,
      }),
    ]);
  } catch (error) {
    return writeFailure(error);
  }

  return {
    ok: true,
    response: ThreadMessagesResponseSchema.parse({
      messages: [messageSummary(message)],
      thread: threadSummary(nextThread),
    }),
  };
}
