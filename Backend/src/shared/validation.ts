export type SafeParseSchema<T> = {
  safeParse(value: unknown):
    | { success: true; data: T }
    | { success: false; error: { issues: unknown[] } };
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; issues: unknown[] };

export function validateWithSchema<T>(
  schema: SafeParseSchema<T>,
  value: unknown,
): ValidationResult<T> {
  const result = schema.safeParse(value);

  if (result.success) {
    return {
      ok: true,
      data: result.data,
    };
  }

  return {
    ok: false,
    issues: result.error.issues,
  };
}
