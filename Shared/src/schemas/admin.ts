import { z } from 'zod';
import { ClientStatusSchema, ProjectStatusSchema } from './core.js';
import { nonEmptyString, optionalTrimmedString } from './common.js';

export const AdminUpdateClientStatusRequestSchema = z.object({
  status: ClientStatusSchema,
});

export const AdminClientListQuerySchema = z.object({
  status: ClientStatusSchema.optional(),
  limit: z.number().int().positive().max(100).optional(),
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

export type AdminUpdateClientStatusRequest = z.infer<typeof AdminUpdateClientStatusRequestSchema>;
export type AdminClientListQuery = z.infer<typeof AdminClientListQuerySchema>;
export type AdminCreateProjectRequest = z.infer<typeof AdminCreateProjectRequestSchema>;
