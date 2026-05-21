import {
  FeatureFlagsSchema,
  type ClientStatus,
  type FeatureFlags,
} from '@apopto/shared';

type FeatureFlagOptions = {
  isInternalAdmin?: boolean;
};

const disabledFeatureFlags: FeatureFlags = {
  canAccessAdmin: false,
  canEditIntake: false,
  canSendMessages: false,
  canUploadFiles: false,
  canViewBilling: false,
  canViewProjects: false,
};

const intakeStatuses = new Set<ClientStatus>([
  'lead',
  'intake_submitted',
  'qualified',
  'proposal_sent',
  'contract_sent',
]);

const messageStatuses = new Set<ClientStatus>([
  'intake_submitted',
  'qualified',
  'proposal_sent',
  'contract_sent',
  'active',
  'maintenance',
]);

const uploadStatuses = new Set<ClientStatus>([
  'active',
  'maintenance',
]);

const billingStatuses = new Set<ClientStatus>([
  'active',
  'maintenance',
  'archived',
]);

const projectStatuses = new Set<ClientStatus>([
  'active',
  'maintenance',
  'archived',
]);

export function featureFlagsForClientStatus(
  status: ClientStatus,
  options: FeatureFlagOptions = {},
): FeatureFlags {
  return FeatureFlagsSchema.parse({
    ...disabledFeatureFlags,
    canAccessAdmin: options.isInternalAdmin === true,
    canEditIntake: intakeStatuses.has(status),
    canSendMessages: messageStatuses.has(status),
    canUploadFiles: uploadStatuses.has(status),
    canViewBilling: billingStatuses.has(status),
    canViewProjects: projectStatuses.has(status),
  });
}
