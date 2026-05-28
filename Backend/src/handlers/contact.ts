import {
  SendEmailCommand,
  SESClient,
  type SendEmailCommandInput,
} from '@aws-sdk/client-ses';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';

import {
  errorResponse,
  jsonResponse,
  requestMetadata,
  type ApiGatewayLikeResponse,
} from '../shared/response.js';

export type ContactHandlerEnvironment = {
  CONTACT_NOTIFICATION_TO_EMAIL?: string;
  SES_FROM_EMAIL?: string;
  SES_NOTIFICATION_TO_EMAIL?: string;
  SES_REGION?: string;
  SES_TO_EMAIL?: string;
};

export type ContactEmailInput = {
  fromEmail: string;
  replyToEmail: string;
  subject: string;
  textBody: string;
  toEmail: string;
};

export type SendContactEmail = (input: ContactEmailInput) => Promise<void>;

export type ContactHandlerDependencies = {
  environment?: ContactHandlerEnvironment;
  sendEmail?: SendContactEmail;
};

type ContactFormValues = {
  bestTime: string;
  company: string;
  email: string;
  message: string;
  name: string;
  phone: string;
  preferredContact: string;
};

const requiredFields = [
  'name',
  'email',
  'company',
  'preferredContact',
  'bestTime',
] as const;

const fieldLimits: Record<keyof ContactFormValues, number> = {
  bestTime: 80,
  company: 160,
  email: 254,
  message: 4000,
  name: 120,
  phone: 80,
  preferredContact: 80,
};

function cleanValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function truncate(value: string, maxLength: number) {
  const compact = value.replace(/\s+/g, ' ').trim();

  return compact.length > maxLength
    ? `${compact.slice(0, maxLength - 3)}...`
    : compact;
}

function parseJsonBody(event: APIGatewayProxyEventV2) {
  if (!event.body) {
    return {};
  }

  const body = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;

  return JSON.parse(body) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateContactForm(body: unknown):
  | { ok: true; values: ContactFormValues }
  | { details: Record<string, string>; ok: false } {
  if (!isRecord(body)) {
    return {
      details: {
        body: 'The request body must be a JSON object.',
      },
      ok: false,
    };
  }

  const values = {
    bestTime: cleanValue(body.bestTime),
    company: cleanValue(body.company),
    email: cleanValue(body.email),
    message: cleanValue(body.message),
    name: cleanValue(body.name),
    phone: cleanValue(body.phone),
    preferredContact: cleanValue(body.preferredContact),
  };
  const details: Record<string, string> = {};

  for (const field of requiredFields) {
    if (!values[field]) {
      details[field] = 'This field is required.';
    }
  }

  if (values.email && !isEmail(values.email)) {
    details.email = 'A valid email address is required.';
  }

  for (const [field, maxLength] of Object.entries(fieldLimits) as [keyof ContactFormValues, number][]) {
    if (values[field].length > maxLength) {
      details[field] = `Must be ${maxLength} characters or fewer.`;
    }
  }

  if (Object.keys(details).length > 0) {
    return {
      details,
      ok: false,
    };
  }

  return {
    ok: true,
    values,
  };
}

function resolveContactConfig(environment: ContactHandlerEnvironment) {
  const fromEmail = cleanValue(environment.SES_FROM_EMAIL);
  const toEmail = (
    cleanValue(environment.CONTACT_NOTIFICATION_TO_EMAIL)
    || cleanValue(environment.SES_NOTIFICATION_TO_EMAIL)
    || cleanValue(environment.SES_TO_EMAIL)
    || fromEmail
  );

  return {
    fromEmail,
    toEmail,
  };
}

export function buildContactNotificationEmail(values: ContactFormValues) {
  const subjectName = truncate(values.company || values.name, 72);

  return {
    subject: truncate(`New Apopto contact form message: ${subjectName}`, 140),
    textBody: [
      'New contact form submission from apopto.net.',
      '',
      `Name: ${values.name}`,
      `Email: ${values.email}`,
      `Company / Brand: ${values.company}`,
      `Phone: ${values.phone || 'Not provided'}`,
      `Preferred contact method: ${values.preferredContact}`,
      `Best time to reach out: ${values.bestTime}`,
      '',
      'Message:',
      values.message || 'No message provided.',
      '',
      'Reply to this email from your inbox to respond directly to the sender.',
    ].join('\n'),
  };
}

export function createSesContactEmailSender(): SendContactEmail {
  const sesClient = new SESClient({
    region: cleanValue(process.env.SES_REGION) || undefined,
  });

  return async ({ fromEmail, replyToEmail, subject, textBody, toEmail }) => {
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
      ReplyToAddresses: [replyToEmail],
    };

    await sesClient.send(new SendEmailCommand(commandInput));
  };
}

export function createContactHandler(dependencies: ContactHandlerDependencies = {}) {
  return async (
    event: APIGatewayProxyEventV2,
    context: Context,
  ): Promise<ApiGatewayLikeResponse> => {
    const responseContext = requestMetadata(event, context);
    const routeKey = event.routeKey && event.routeKey !== '$default'
      ? event.routeKey
      : `${event.requestContext.http.method} ${event.rawPath}`;

    if (routeKey !== 'POST /api/contact') {
      return errorResponse(
        404,
        'not_found',
        'The requested contact route was not found.',
        undefined,
        responseContext,
      );
    }

    try {
      const validation = validateContactForm(parseJsonBody(event));

      if (!validation.ok) {
        return errorResponse(
          400,
          'validation_error',
          'The contact form has missing or invalid fields.',
          validation.details,
          responseContext,
        );
      }

      const config = resolveContactConfig(dependencies.environment ?? process.env);

      if (!config.fromEmail || !config.toEmail) {
        return errorResponse(
          503,
          'contact_email_not_configured',
          'Contact email delivery is not configured yet.',
          undefined,
          responseContext,
        );
      }

      const email = buildContactNotificationEmail(validation.values);
      const sendEmail = dependencies.sendEmail ?? createSesContactEmailSender();

      await sendEmail({
        fromEmail: config.fromEmail,
        replyToEmail: validation.values.email,
        subject: email.subject,
        textBody: email.textBody,
        toEmail: config.toEmail,
      });

      return jsonResponse(202, {
        ok: true,
      }, responseContext);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return errorResponse(
          400,
          'invalid_json',
          'The request body must be valid JSON.',
          undefined,
          responseContext,
        );
      }

      return errorResponse(
        502,
        'contact_email_failed',
        'The contact message could not be sent.',
        {
          errorName: (error as { name?: string }).name ?? 'UnknownError',
        },
        responseContext,
      );
    }
  };
}

export const handler = createContactHandler();
