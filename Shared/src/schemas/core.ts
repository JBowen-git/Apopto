import { z } from 'zod';

export const clientStatuses = [
  'lead',
  'intake_submitted',
  'qualified',
  'proposal_sent',
  'contract_sent',
  'active',
  'maintenance',
  'archived',
] as const;

export const projectStatuses = [
  'planning',
  'active',
  'paused',
  'launched',
  'maintenance',
  'archived',
] as const;

export const membershipRoles = [
  'client_owner',
  'client_member',
] as const;

export const fileCategories = [
  'logo',
  'brand_guidelines',
  'website_copy',
  'images',
  'video',
  'contracts',
  'technical_documents',
  'analytics_exports',
  'screenshots',
  'other',
] as const;

export const uploadStatuses = [
  'pending',
  'uploaded',
  'available',
  'blocked',
  'pending_review',
  'clean',
  'quarantined',
  'deleted',
] as const;

export const fileScanStatuses = [
  'pending',
  'clean',
  'infected',
  'failed',
  'skipped',
  'unsupported',
  'unknown',
] as const;

export const fileStoragePrefixes = [
  'quarantine',
  'clean',
  'infected',
] as const;

export const invoiceStatuses = [
  'draft',
  'open',
  'paid',
  'void',
  'uncollectible',
  'past_due',
] as const;

export const ClientStatusSchema = z.enum(clientStatuses);
export const ProjectStatusSchema = z.enum(projectStatuses);
export const MembershipRoleSchema = z.enum(membershipRoles);
export const FileCategorySchema = z.enum(fileCategories);
export const UploadStatusSchema = z.enum(uploadStatuses);
export const FileScanStatusSchema = z.enum(fileScanStatuses);
export const FileStoragePrefixSchema = z.enum(fileStoragePrefixes);
export const InvoiceStatusSchema = z.enum(invoiceStatuses);

export const ApiErrorResponseSchema = z.object({
  error: z.string().min(1),
  message: z.string().min(1).optional(),
  requestId: z.string().min(1).optional(),
  details: z.unknown().optional(),
});

export const ApiSuccessEnvelopeSchema = z.object({
  ok: z.literal(true),
  requestId: z.string().min(1).optional(),
});

export const FeatureFlagsSchema = z.object({
  canEditIntake: z.boolean(),
  canUploadFiles: z.boolean(),
  canViewBilling: z.boolean(),
  canSendMessages: z.boolean(),
  canViewProjects: z.boolean(),
  canAccessAdmin: z.boolean(),
});

export const PortalUserSummarySchema = z.object({
  auth0Sub: z.string().min(1),
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
});

export const ClientSummarySchema = z.object({
  clientId: z.string().min(1),
  businessName: z.string(),
  status: ClientStatusSchema,
});

export const MembershipSummarySchema = z.object({
  role: MembershipRoleSchema,
  status: z.enum(['active', 'invited', 'removed']),
});

export const MeResponseSchema = z.object({
  user: PortalUserSummarySchema,
  client: ClientSummarySchema,
  membership: MembershipSummarySchema,
  featureFlags: FeatureFlagsSchema,
});

export type ClientStatus = z.infer<typeof ClientStatusSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type MembershipRole = z.infer<typeof MembershipRoleSchema>;
export type FileCategory = z.infer<typeof FileCategorySchema>;
export type UploadStatus = z.infer<typeof UploadStatusSchema>;
export type FileScanStatus = z.infer<typeof FileScanStatusSchema>;
export type FileStoragePrefix = z.infer<typeof FileStoragePrefixSchema>;
export type InvoiceStatus = z.infer<typeof InvoiceStatusSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type ApiSuccessEnvelope = z.infer<typeof ApiSuccessEnvelopeSchema>;
export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;
export type PortalUserSummary = z.infer<typeof PortalUserSummarySchema>;
export type ClientSummary = z.infer<typeof ClientSummarySchema>;
export type MembershipSummary = z.infer<typeof MembershipSummarySchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
