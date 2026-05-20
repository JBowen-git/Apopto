import { z } from 'zod';
import { ClientSummarySchema } from './core.js';
import { isoDateTimeString, nonEmptyString, optionalTrimmedString, optionalUrl } from './common.js';

export const dataSensitivityLevels = [
  'none',
  'basic_contact_info',
  'payments',
  'health',
  'financial',
  'confidential_documents',
  'other',
] as const;

export const projectTypes = [
  'business_website',
  'landing_page',
  'ecommerce',
  'portfolio',
  'custom_web_app',
  'portal_dashboard',
  'smart_forms',
  'automation',
  'seo_performance',
  'maintenance',
  'other',
] as const;

export const contentReadinessStates = [
  'ready',
  'partial',
  'needs_copywriting',
  'not_started',
] as const;

export const maintenanceInterestLevels = [
  'yes',
  'no',
  'not_sure',
] as const;

export const DataSensitivitySchema = z.enum(dataSensitivityLevels);
export const ProjectTypeSchema = z.enum(projectTypes);
export const ContentReadinessSchema = z.enum(contentReadinessStates);
export const MaintenanceInterestSchema = z.enum(maintenanceInterestLevels);

export const ReferenceSiteSchema = z.object({
  url: z.string().trim().url(),
  whatTheyLike: nonEmptyString,
  notes: optionalTrimmedString,
});

export const IntakeFormDataSchema = z.object({
  businessName: nonEmptyString,
  contactName: nonEmptyString,
  contactEmail: z.string().trim().email(),
  phone: optionalTrimmedString,
  website: optionalUrl,
  industry: nonEmptyString,
  businessDescription: nonEmptyString,
  projectType: ProjectTypeSchema,
  goals: z.array(nonEmptyString).min(1),
  targetAudience: nonEmptyString,
  desiredFeatures: z.array(nonEmptyString).default([]),
  referenceSites: z.array(ReferenceSiteSchema).default([]),
  designPreferences: nonEmptyString,
  contentReadiness: ContentReadinessSchema,
  hasLogo: z.boolean(),
  hasBrandGuide: z.boolean(),
  needsCopywriting: z.boolean(),
  currentHostingProvider: optionalTrimmedString,
  domainRegistrar: optionalTrimmedString,
  emailProvider: optionalTrimmedString,
  analyticsTools: optionalTrimmedString,
  integrationsNeeded: z.array(nonEmptyString).default([]),
  dataSensitivity: DataSensitivitySchema,
  budgetRange: nonEmptyString,
  desiredTimeline: nonEmptyString,
  mustHaveFeatures: nonEmptyString,
  niceToHaveFeatures: optionalTrimmedString,
  maintenanceInterest: MaintenanceInterestSchema,
  additionalNotes: optionalTrimmedString,
  acceptedNoSecretsWarning: z.literal(true),
  acceptedTerms: z.literal(true),
});

export const UpdateIntakeRequestSchema = z.object({
  formData: IntakeFormDataSchema,
});

export const IntakeRecordSchema = z.object({
  clientId: z.string().min(1),
  formData: IntakeFormDataSchema,
  version: z.number().int().positive(),
  createdAt: isoDateTimeString,
  updatedAt: isoDateTimeString,
  updatedBy: z.string().min(1),
});

export const GetIntakeResponseSchema = z.object({
  intake: IntakeRecordSchema.nullable(),
  client: ClientSummarySchema.optional(),
});

export const UpdateIntakeResponseSchema = z.object({
  intake: IntakeRecordSchema,
  client: ClientSummarySchema,
});

export const UpdateClientProfileRequestSchema = z.object({
  businessName: optionalTrimmedString,
  contactName: optionalTrimmedString,
  contactEmail: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().email().optional(),
  ),
  phone: optionalTrimmedString,
  website: optionalUrl,
  industry: optionalTrimmedString,
}).refine(
  (value) => Object.values(value).some((fieldValue) => fieldValue !== undefined),
  { message: 'At least one editable profile field is required.' },
);

export const UpdateClientProfileResponseSchema = z.object({
  client: ClientSummarySchema,
});

export type DataSensitivity = z.infer<typeof DataSensitivitySchema>;
export type ProjectType = z.infer<typeof ProjectTypeSchema>;
export type ContentReadiness = z.infer<typeof ContentReadinessSchema>;
export type MaintenanceInterest = z.infer<typeof MaintenanceInterestSchema>;
export type ReferenceSite = z.infer<typeof ReferenceSiteSchema>;
export type IntakeFormData = z.infer<typeof IntakeFormDataSchema>;
export type UpdateIntakeRequest = z.infer<typeof UpdateIntakeRequestSchema>;
export type IntakeRecord = z.infer<typeof IntakeRecordSchema>;
export type GetIntakeResponse = z.infer<typeof GetIntakeResponseSchema>;
export type UpdateIntakeResponse = z.infer<typeof UpdateIntakeResponseSchema>;
export type UpdateClientProfileRequest = z.infer<typeof UpdateClientProfileRequestSchema>;
export type UpdateClientProfileResponse = z.infer<typeof UpdateClientProfileResponseSchema>;
