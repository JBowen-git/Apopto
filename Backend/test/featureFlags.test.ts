import type { ClientStatus, FeatureFlags } from '@apopto/shared';
import { describe, expect, it } from 'vitest';

import { featureFlagsForClientStatus } from '../src/tenant/index.js';

const expectedFlagsByStatus: Record<ClientStatus, FeatureFlags> = {
  lead: {
    canAccessAdmin: false,
    canEditIntake: true,
    canSendMessages: false,
    canUploadFiles: false,
    canViewBilling: false,
    canViewProjects: false,
  },
  intake_submitted: {
    canAccessAdmin: false,
    canEditIntake: true,
    canSendMessages: true,
    canUploadFiles: false,
    canViewBilling: false,
    canViewProjects: false,
  },
  qualified: {
    canAccessAdmin: false,
    canEditIntake: true,
    canSendMessages: true,
    canUploadFiles: false,
    canViewBilling: false,
    canViewProjects: false,
  },
  proposal_sent: {
    canAccessAdmin: false,
    canEditIntake: true,
    canSendMessages: true,
    canUploadFiles: false,
    canViewBilling: false,
    canViewProjects: false,
  },
  contract_sent: {
    canAccessAdmin: false,
    canEditIntake: true,
    canSendMessages: true,
    canUploadFiles: false,
    canViewBilling: false,
    canViewProjects: false,
  },
  active: {
    canAccessAdmin: false,
    canEditIntake: false,
    canSendMessages: true,
    canUploadFiles: true,
    canViewBilling: true,
    canViewProjects: true,
  },
  maintenance: {
    canAccessAdmin: false,
    canEditIntake: false,
    canSendMessages: true,
    canUploadFiles: true,
    canViewBilling: true,
    canViewProjects: true,
  },
  archived: {
    canAccessAdmin: false,
    canEditIntake: false,
    canSendMessages: false,
    canUploadFiles: false,
    canViewBilling: true,
    canViewProjects: true,
  },
};

describe('feature flag engine', () => {
  it('generates lifecycle flags for every client status', () => {
    for (const [status, expectedFlags] of Object.entries(expectedFlagsByStatus)) {
      expect(featureFlagsForClientStatus(status as ClientStatus)).toEqual(expectedFlags);
    }
  });

  it('sets admin access only when the caller has an active internal admin record', () => {
    expect(featureFlagsForClientStatus('active', {
      isInternalAdmin: false,
    }).canAccessAdmin).toBe(false);

    expect(featureFlagsForClientStatus('active', {
      isInternalAdmin: true,
    })).toMatchObject({
      canAccessAdmin: true,
      canUploadFiles: true,
      canViewBilling: true,
      canViewProjects: true,
    });
  });
});
