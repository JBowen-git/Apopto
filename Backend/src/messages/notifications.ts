import {
  SendEmailCommand,
  SESClient,
  type SendEmailCommandInput,
} from '@aws-sdk/client-ses';
import type { EmailNotificationStatus } from '@apopto/shared';

import type { ClientProfileItem, MessageItem, ThreadItem, UserProfileItem } from '../dynamodb/index.js';

export type MessageNotificationEnvironment = {
  PORTAL_BASE_URL?: string;
  SES_FROM_EMAIL?: string;
  SES_NOTIFICATION_TO_EMAIL?: string;
  SES_REGION?: string;
  SES_TO_EMAIL?: string;
};

export type MessageNotificationConfig = {
  fromEmail?: string;
  notificationToEmail?: string;
  portalBaseUrl?: string;
};

export type MessageEmailInput = {
  fromEmail: string;
  subject: string;
  textBody: string;
  toEmail: string;
};

export type SendMessageEmail = (input: MessageEmailInput) => Promise<void>;

export type MessageNotificationInput = {
  client: ClientProfileItem;
  config: MessageNotificationConfig;
  message: MessageItem;
  sendEmail?: SendMessageEmail;
  sender: UserProfileItem;
  thread: ThreadItem;
};

export type MessageNotificationResult = {
  errorName?: string;
  reason?: string;
  status: EmailNotificationStatus;
};

function cleanValue(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizePortalBaseUrl(value: string | undefined) {
  return cleanValue(value)?.replace(/\/+$/, '');
}

export function resolveMessageNotificationConfig(
  environment: MessageNotificationEnvironment,
): MessageNotificationConfig {
  const fromEmail = cleanValue(environment.SES_FROM_EMAIL);

  return {
    fromEmail,
    notificationToEmail: (
      cleanValue(environment.SES_NOTIFICATION_TO_EMAIL)
      ?? cleanValue(environment.SES_TO_EMAIL)
      ?? fromEmail
    ),
    portalBaseUrl: normalizePortalBaseUrl(environment.PORTAL_BASE_URL),
  };
}

export function portalThreadUrl(portalBaseUrl: string | undefined, threadId: string) {
  const encodedThreadId = encodeURIComponent(threadId);
  const normalizedBaseUrl = normalizePortalBaseUrl(portalBaseUrl);

  return normalizedBaseUrl
    ? `${normalizedBaseUrl}/messages/${encodedThreadId}`
    : `/messages/${encodedThreadId}`;
}

function truncateForEmail(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, ' ').trim();

  return compact.length > maxLength
    ? `${compact.slice(0, maxLength - 1)}...`
    : compact;
}

export function buildMessageNotificationEmail({
  client,
  config,
  message,
  sender,
  thread,
}: Pick<MessageNotificationInput, 'client' | 'config' | 'message' | 'sender' | 'thread'>): {
  subject: string;
  textBody: string;
} {
  const threadUrl = portalThreadUrl(config.portalBaseUrl, thread.threadId);
  const businessName = client.businessName || 'A client';
  const senderName = sender.name || sender.email || 'A portal user';
  const preview = truncateForEmail(message.body, 500);

  return {
    subject: truncateForEmail(`New portal message: ${thread.subject}`, 140),
    textBody: [
      `${senderName} sent a new portal message for ${businessName}.`,
      '',
      `Thread: ${thread.subject}`,
      `Open the thread: ${threadUrl}`,
      '',
      'Message preview:',
      preview,
      '',
      'Reply from the portal. Reply-by-email is not enabled.',
    ].join('\n'),
  };
}

export function createSesMessageEmailSender(): SendMessageEmail {
  const sesClient = new SESClient({
    region: cleanValue(process.env.SES_REGION) || undefined,
  });

  return async ({ fromEmail, subject, textBody, toEmail }) => {
    const commandInput: SendEmailCommandInput = {
      Source: fromEmail,
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Subject: {
          Charset: 'UTF-8',
          Data: subject,
        },
        Body: {
          Text: {
            Charset: 'UTF-8',
            Data: textBody,
          },
        },
      },
    };

    await sesClient.send(new SendEmailCommand(commandInput));
  };
}

export async function sendMessageNotification({
  client,
  config,
  message,
  sendEmail,
  sender,
  thread,
}: MessageNotificationInput): Promise<MessageNotificationResult> {
  if (!config.fromEmail) {
    return {
      reason: 'ses_from_email_missing',
      status: 'not_sent',
    };
  }

  if (!config.notificationToEmail) {
    return {
      reason: 'notification_recipient_missing',
      status: 'not_sent',
    };
  }

  const email = buildMessageNotificationEmail({
    client,
    config,
    message,
    sender,
    thread,
  });

  try {
    const resolvedSendEmail = sendEmail ?? createSesMessageEmailSender();

    await resolvedSendEmail({
      fromEmail: config.fromEmail,
      subject: email.subject,
      textBody: email.textBody,
      toEmail: config.notificationToEmail,
    });

    return {
      status: 'sent',
    };
  } catch (error) {
    return {
      errorName: (error as { name?: string }).name ?? 'UnknownError',
      status: 'failed',
    };
  }
}
