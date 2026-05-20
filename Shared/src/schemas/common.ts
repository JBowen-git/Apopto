import { z } from 'zod';

export const nonEmptyString = z.string().trim().min(1);

export const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

export const optionalUrl = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().url().optional(),
);

export const isoDateTimeString = z.string().datetime({ offset: true });
