import { describe, expect, it, vi } from 'vitest';

import {
  buildClientProfileItem,
  buildMessageItem,
  buildMessageNotificationEmail,
  buildThreadItem,
  buildUserProfileItem,
  portalThreadUrl,
  resolveMessageNotificationConfig,
  sendMessageNotification,
} from '../src/index.js';

const createdAt = '2026-05-22T18:00:00.000Z';

const client = buildClientProfileItem({
  businessName: 'North Star Remodeling',
  clientId: 'client_messages',
  createdAt,
  primaryContactUserId: 'auth0|messages',
  status: 'active',
  updatedAt: createdAt,
});

const sender = buildUserProfileItem({
  auth0Sub: 'auth0|messages',
  createdAt,
  email: 'owner@example.com',
  lastLoginAt: createdAt,
  name: 'Message Owner',
});

const thread = buildThreadItem({
  clientId: client.clientId,
  createdAt,
  createdBy: sender.auth0Sub,
  lastMessageAt: createdAt,
  lastMessagePreview: 'Can we talk launch?',
  subject: 'Launch timing',
  threadId: 'thread_new',
  updatedAt: createdAt,
});

const message = buildMessageItem({
  body: 'Can we talk launch?',
  clientId: client.clientId,
  createdAt,
  emailNotificationStatus: 'not_sent',
  messageId: 'message_new',
  senderRole: 'client',
  senderUserId: sender.auth0Sub,
  threadId: thread.threadId,
  visibility: 'client_and_admin',
});

describe('message notification service', () => {
  it('keeps notification status not_sent when SES_FROM_EMAIL is absent', async () => {
    const sendEmail = vi.fn();

    const result = await sendMessageNotification({
      client,
      config: resolveMessageNotificationConfig({
        PORTAL_BASE_URL: 'https://portal.apopto.test',
      }),
      message,
      sendEmail,
      sender,
      thread,
    });

    expect(result).toEqual({
      reason: 'ses_from_email_missing',
      status: 'not_sent',
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('builds a portal thread link and sends a simple text email when configured', async () => {
    const sendEmail = vi.fn(async () => undefined);

    const result = await sendMessageNotification({
      client,
      config: resolveMessageNotificationConfig({
        PORTAL_BASE_URL: 'https://portal.apopto.test/',
        SES_FROM_EMAIL: 'portal@example.com',
        SES_NOTIFICATION_TO_EMAIL: 'jake@example.com',
      }),
      message,
      sendEmail,
      sender,
      thread,
    });

    expect(result).toEqual({
      status: 'sent',
    });
    expect(sendEmail).toHaveBeenCalledWith({
      fromEmail: 'portal@example.com',
      subject: 'New portal message: Launch timing',
      textBody: expect.stringContaining('https://portal.apopto.test/messages/thread_new'),
      toEmail: 'jake@example.com',
    });
  });

  it('reports failed when SES rejects the message', async () => {
    const sendEmail = vi.fn(async () => {
      throw Object.assign(new Error('Rejected'), {
        name: 'MessageRejected',
      });
    });

    const result = await sendMessageNotification({
      client,
      config: resolveMessageNotificationConfig({
        SES_FROM_EMAIL: 'portal@example.com',
      }),
      message,
      sendEmail,
      sender,
      thread,
    });

    expect(result).toEqual({
      errorName: 'MessageRejected',
      status: 'failed',
    });
  });

  it('uses the sender address as the default sandbox-friendly recipient', () => {
    expect(resolveMessageNotificationConfig({
      SES_FROM_EMAIL: 'portal@example.com',
    })).toEqual({
      fromEmail: 'portal@example.com',
      notificationToEmail: 'portal@example.com',
      portalBaseUrl: undefined,
    });
  });

  it('creates relative links when no portal base URL is configured', () => {
    expect(portalThreadUrl(undefined, 'thread/new')).toBe('/messages/thread%2Fnew');
    expect(buildMessageNotificationEmail({
      client,
      config: {},
      message,
      sender,
      thread,
    }).textBody).toContain('/messages/thread_new');
  });
});
