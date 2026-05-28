import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { describe, expect, it, vi } from 'vitest';

import {
  buildContactNotificationEmail,
  createContactHandler,
} from '../src/index.js';

const requestId = 'request-contact';

function parseBody(response: { body?: string }) {
  return JSON.parse(response.body ?? '{}') as Record<string, unknown>;
}

function apiEvent(body: unknown): APIGatewayProxyEventV2 {
  return {
    body: JSON.stringify(body),
    headers: {},
    isBase64Encoded: false,
    rawPath: '/api/contact',
    routeKey: 'POST /api/contact',
    requestContext: {
      requestId,
      http: {
        method: 'POST',
        path: '/api/contact',
      },
    },
  } as APIGatewayProxyEventV2;
}

function context(): Context {
  return {
    awsRequestId: requestId,
  } as Context;
}

const validSubmission = {
  bestTime: 'Morning',
  company: 'North Star Remodeling',
  email: 'owner@example.com',
  message: 'Can we talk about replacing my current website?',
  name: 'Avery Client',
  phone: '555-0100',
  preferredContact: 'Email',
};

describe('contact handler', () => {
  it('sends contact form submissions to the configured notification email', async () => {
    const sendEmail = vi.fn(async () => undefined);
    const handler = createContactHandler({
      environment: {
        SES_FROM_EMAIL: 'contact@apopto.test',
        SES_NOTIFICATION_TO_EMAIL: 'jake@apopto.test',
      },
      sendEmail,
    });

    const response = await handler(apiEvent(validSubmission), context());

    expect(response.statusCode).toBe(202);
    expect(parseBody(response)).toMatchObject({
      ok: true,
      requestId,
    });
    expect(sendEmail).toHaveBeenCalledWith({
      fromEmail: 'contact@apopto.test',
      replyToEmail: 'owner@example.com',
      subject: 'New Apopto contact form message: North Star Remodeling',
      textBody: expect.stringContaining('Can we talk about replacing my current website?'),
      toEmail: 'jake@apopto.test',
    });
  });

  it('rejects invalid submissions before sending email', async () => {
    const sendEmail = vi.fn(async () => undefined);
    const handler = createContactHandler({
      environment: {
        SES_FROM_EMAIL: 'contact@apopto.test',
        SES_NOTIFICATION_TO_EMAIL: 'jake@apopto.test',
      },
      sendEmail,
    });

    const response = await handler(apiEvent({
      ...validSubmission,
      email: 'not-an-email',
      name: '',
    }), context());

    expect(response.statusCode).toBe(400);
    expect(parseBody(response)).toMatchObject({
      error: 'validation_error',
      details: {
        email: 'A valid email address is required.',
        name: 'This field is required.',
      },
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('returns a clear configuration error when SES sender is missing', async () => {
    const sendEmail = vi.fn(async () => undefined);
    const handler = createContactHandler({
      environment: {},
      sendEmail,
    });

    const response = await handler(apiEvent(validSubmission), context());

    expect(response.statusCode).toBe(503);
    expect(parseBody(response)).toMatchObject({
      error: 'contact_email_not_configured',
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('builds a plain text email with reply instructions', () => {
    expect(buildContactNotificationEmail(validSubmission)).toEqual({
      subject: 'New Apopto contact form message: North Star Remodeling',
      textBody: expect.stringContaining('Reply to this email from your inbox'),
    });
  });
});
