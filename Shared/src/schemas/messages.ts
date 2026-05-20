import { z } from 'zod';
import { isoDateTimeString, nonEmptyString } from './common.js';

export const messageVisibilities = [
  'client_and_admin',
  'internal_only',
] as const;

export const emailNotificationStatuses = [
  'not_sent',
  'sent',
  'failed',
] as const;

export const MessageVisibilitySchema = z.enum(messageVisibilities);
export const EmailNotificationStatusSchema = z.enum(emailNotificationStatuses);

export const CreateThreadRequestSchema = z.object({
  subject: nonEmptyString,
  body: nonEmptyString,
});

export const CreateMessageRequestSchema = z.object({
  body: nonEmptyString,
});

export const ThreadSummarySchema = z.object({
  threadId: nonEmptyString,
  subject: nonEmptyString,
  lastMessageAt: isoDateTimeString,
  lastMessagePreview: z.string(),
  createdAt: isoDateTimeString,
  updatedAt: isoDateTimeString,
});

export const MessageSummarySchema = z.object({
  messageId: nonEmptyString,
  threadId: nonEmptyString,
  body: nonEmptyString,
  senderUserId: nonEmptyString,
  senderRole: z.enum(['client', 'admin']),
  visibility: MessageVisibilitySchema,
  emailNotificationStatus: EmailNotificationStatusSchema,
  createdAt: isoDateTimeString,
});

export const ListThreadsResponseSchema = z.object({
  threads: z.array(ThreadSummarySchema),
});

export const ThreadMessagesResponseSchema = z.object({
  thread: ThreadSummarySchema,
  messages: z.array(MessageSummarySchema),
});

export type MessageVisibility = z.infer<typeof MessageVisibilitySchema>;
export type EmailNotificationStatus = z.infer<typeof EmailNotificationStatusSchema>;
export type CreateThreadRequest = z.infer<typeof CreateThreadRequestSchema>;
export type CreateMessageRequest = z.infer<typeof CreateMessageRequestSchema>;
export type ThreadSummary = z.infer<typeof ThreadSummarySchema>;
export type MessageSummary = z.infer<typeof MessageSummarySchema>;
export type ListThreadsResponse = z.infer<typeof ListThreadsResponseSchema>;
export type ThreadMessagesResponse = z.infer<typeof ThreadMessagesResponseSchema>;
