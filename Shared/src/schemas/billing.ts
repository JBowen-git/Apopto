import { z } from 'zod';
import { InvoiceStatusSchema } from './core.js';
import { isoDateTimeString, nonEmptyString, optionalUrl } from './common.js';

export const InvoiceSummarySchema = z.object({
  invoiceId: nonEmptyString,
  provider: z.literal('stripe'),
  status: InvoiceStatusSchema,
  amountDue: z.number().int().nonnegative(),
  currency: z.string().trim().length(3),
  dueDate: z.string().date(),
  createdAt: isoDateTimeString,
  updatedAt: isoDateTimeString,
});

export const BillingResponseSchema = z.object({
  invoices: z.array(InvoiceSummarySchema),
});

export const CreateStripePortalSessionRequestSchema = z.object({
  returnUrl: optionalUrl,
});

export const CreateStripePortalSessionResponseSchema = z.object({
  url: z.string().url(),
});

export type InvoiceSummary = z.infer<typeof InvoiceSummarySchema>;
export type BillingResponse = z.infer<typeof BillingResponseSchema>;
export type CreateStripePortalSessionRequest = z.infer<typeof CreateStripePortalSessionRequestSchema>;
export type CreateStripePortalSessionResponse = z.infer<typeof CreateStripePortalSessionResponseSchema>;
