import { FeatureFlagsSchema } from '@apopto/shared'

const leadFeatureFlags = {
  canAccessAdmin: false,
  canEditIntake: true,
  canSendMessages: false,
  canUploadFiles: false,
  canViewBilling: false,
  canViewProjects: false,
}

export function verifySharedPackageImport() {
  return FeatureFlagsSchema.safeParse(leadFeatureFlags).success
}
