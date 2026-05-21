import { FeatureFlagsSchema, type FeatureFlags } from '@apopto/shared';

const leadFeatureFlags: FeatureFlags = {
  canAccessAdmin: false,
  canEditIntake: true,
  canSendMessages: false,
  canUploadFiles: false,
  canViewBilling: false,
  canViewProjects: false,
};

export function verifySharedPackageImport() {
  return FeatureFlagsSchema.safeParse(leadFeatureFlags).success;
}
