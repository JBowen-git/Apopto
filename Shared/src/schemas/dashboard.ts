import { z } from 'zod';
import {
  ClientStatusSchema,
  FeatureFlagsSchema,
  MembershipSummarySchema,
  PortalUserSummarySchema,
  ProjectStatusSchema,
} from './core.js';
import { FileMetadataSummarySchema } from './files.js';
import { IntakeRecordSchema } from './intake.js';
import { ThreadSummarySchema } from './messages.js';
import { InvoiceSummarySchema } from './billing.js';
import { isoDateTimeString, nonEmptyString, optionalTrimmedString, optionalUrl } from './common.js';

export const DashboardClientProfileSchema = z.object({
  clientId: nonEmptyString,
  businessName: z.string(),
  status: ClientStatusSchema,
  contactEmail: z.string().email().optional(),
  contactName: optionalTrimmedString,
  createdAt: isoDateTimeString,
  industry: optionalTrimmedString,
  phone: optionalTrimmedString,
  updatedAt: isoDateTimeString,
  website: optionalUrl,
});

export const DashboardProjectSummarySchema = z.object({
  projectId: nonEmptyString,
  name: nonEmptyString,
  status: ProjectStatusSchema,
  description: optionalTrimmedString,
  targetLaunchDate: z.string().date().optional(),
  createdAt: isoDateTimeString,
  updatedAt: isoDateTimeString,
});

export const DashboardNextStepSchema = z.object({
  id: nonEmptyString,
  label: nonEmptyString,
  description: nonEmptyString,
  href: optionalTrimmedString,
});

export const DashboardSliceLimitsSchema = z.object({
  projects: z.number().int().positive(),
  files: z.number().int().positive(),
  threads: z.number().int().positive(),
  invoices: z.number().int().positive(),
});

export const DashboardResponseSchema = z.object({
  user: PortalUserSummarySchema,
  client: DashboardClientProfileSchema,
  membership: MembershipSummarySchema,
  featureFlags: FeatureFlagsSchema,
  nextSteps: z.array(DashboardNextStepSchema),
  intake: IntakeRecordSchema.nullable(),
  projects: z.array(DashboardProjectSummarySchema),
  recentFiles: z.array(FileMetadataSummarySchema),
  recentThreads: z.array(ThreadSummarySchema),
  invoices: z.array(InvoiceSummarySchema),
  sliceLimits: DashboardSliceLimitsSchema,
});

export type DashboardClientProfile = z.infer<typeof DashboardClientProfileSchema>;
export type DashboardProjectSummary = z.infer<typeof DashboardProjectSummarySchema>;
export type DashboardNextStep = z.infer<typeof DashboardNextStepSchema>;
export type DashboardSliceLimits = z.infer<typeof DashboardSliceLimitsSchema>;
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
