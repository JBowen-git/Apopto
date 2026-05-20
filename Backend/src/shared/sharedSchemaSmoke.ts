import { FeatureFlagsSchema, type FeatureFlags } from '@apopto/shared';

const scaffoldFeatureFlags: FeatureFlags = {
  canEditIntake: true,
  canUploadFiles: false,
  canViewBilling: false,
  canSendMessages: false,
  canViewProjects: false,
  canAccessAdmin: false,
};

export function verifySharedSchemasAvailable(): FeatureFlags {
  return FeatureFlagsSchema.parse(scaffoldFeatureFlags);
}
