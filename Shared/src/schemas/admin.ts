import { z } from 'zod';
import {
  ClientStatusSchema,
  MembershipRoleSchema,
  ProjectStatusSchema,
} from './core.js';
import { InvoiceSummarySchema } from './billing.js';
import { isoDateTimeString, nonEmptyString, optionalTrimmedString } from './common.js';
import { DashboardProjectSummarySchema } from './dashboard.js';
import { FileMetadataSummarySchema } from './files.js';
import { IntakeRecordSchema } from './intake.js';
import { ThreadSummarySchema } from './messages.js';

export const AdminUpdateClientStatusRequestSchema = z.object({
  status: ClientStatusSchema,
});

export const AdminClientListQuerySchema = z.object({
  status: ClientStatusSchema.optional(),
  limit: z.preprocess(
    (value) => {
      if (typeof value === 'string' && value.trim() !== '') {
        return Number(value);
      }

      return value;
    },
    z.number().int().positive().max(100).optional(),
  ),
});

export const AdminClientSummarySchema = z.object({
  businessName: z.string(),
  clientId: z.string().min(1),
  contactEmail: z.string().email().optional(),
  contactName: z.string().min(1).optional(),
  createdAt: z.string().datetime(),
  industry: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  primaryContactUserId: z.string().min(1),
  status: ClientStatusSchema,
  updatedAt: z.string().datetime(),
  website: z.string().url().optional(),
});

export const AdminClientListResponseSchema = z.object({
  clients: z.array(AdminClientSummarySchema),
  count: z.number().int().nonnegative(),
  filters: z.object({
    status: ClientStatusSchema.optional(),
    limit: z.number().int().positive().max(100),
  }),
});

export const AdminCreateProjectRequestSchema = z.object({
  name: nonEmptyString,
  status: ProjectStatusSchema.default('planning'),
  description: optionalTrimmedString,
  targetLaunchDate: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().date().optional(),
  ),
});

export const AdminUserSummarySchema = z.object({
  auth0Sub: nonEmptyString,
  email: z.string().email().optional(),
  name: optionalTrimmedString,
  createdAt: isoDateTimeString,
  lastLoginAt: isoDateTimeString,
});

export const AdminMembershipSummarySchema = z.object({
  auth0Sub: nonEmptyString,
  clientId: nonEmptyString,
  role: MembershipRoleSchema,
  status: z.enum(['active', 'invited', 'removed']),
  createdAt: isoDateTimeString,
  updatedAt: isoDateTimeString,
});

export const AdminAuditSummarySchema = z.object({
  eventId: nonEmptyString,
  actorUserId: nonEmptyString,
  action: nonEmptyString,
  entityType: nonEmptyString,
  entityId: nonEmptyString,
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: isoDateTimeString,
});

export const AdminDetailSliceLimitsSchema = z.object({
  users: z.number().int().positive(),
  projects: z.number().int().positive(),
  files: z.number().int().positive(),
  threads: z.number().int().positive(),
  invoices: z.number().int().positive(),
  auditEvents: z.number().int().positive(),
});

export const AdminClientDetailResponseSchema = z.object({
  client: AdminClientSummarySchema,
  intake: IntakeRecordSchema.nullable(),
  memberships: z.array(AdminMembershipSummarySchema),
  users: z.array(AdminUserSummarySchema),
  projects: z.array(DashboardProjectSummarySchema),
  files: z.array(FileMetadataSummarySchema),
  threads: z.array(ThreadSummarySchema),
  invoices: z.array(InvoiceSummarySchema),
  auditEvents: z.array(AdminAuditSummarySchema),
  sliceLimits: AdminDetailSliceLimitsSchema,
});

export const AdminUpdateClientStatusResponseSchema = z.object({
  client: AdminClientSummarySchema,
  previousStatus: ClientStatusSchema,
  nextStatus: ClientStatusSchema,
});

export const AdminCreateProjectResponseSchema = z.object({
  project: DashboardProjectSummarySchema,
});

export type AdminUpdateClientStatusRequest = z.infer<typeof AdminUpdateClientStatusRequestSchema>;
export type AdminClientListQuery = z.infer<typeof AdminClientListQuerySchema>;
export type AdminClientSummary = z.infer<typeof AdminClientSummarySchema>;
export type AdminClientListResponse = z.infer<typeof AdminClientListResponseSchema>;
export type AdminCreateProjectRequest = z.infer<typeof AdminCreateProjectRequestSchema>;
export type AdminUserSummary = z.infer<typeof AdminUserSummarySchema>;
export type AdminMembershipSummary = z.infer<typeof AdminMembershipSummarySchema>;
export type AdminAuditSummary = z.infer<typeof AdminAuditSummarySchema>;
export type AdminDetailSliceLimits = z.infer<typeof AdminDetailSliceLimitsSchema>;
export type AdminClientDetailResponse = z.infer<typeof AdminClientDetailResponseSchema>;
export type AdminUpdateClientStatusResponse = z.infer<typeof AdminUpdateClientStatusResponseSchema>;
export type AdminCreateProjectResponse = z.infer<typeof AdminCreateProjectResponseSchema>;
