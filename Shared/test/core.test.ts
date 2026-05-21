import { describe, expect, it } from 'vitest';
import {
  AdminClientListQuerySchema,
  AdminClientListResponseSchema,
  ApiErrorResponseSchema,
  ClientStatusSchema,
  FeatureFlagsSchema,
  FileCategorySchema,
  InvoiceStatusSchema,
  MeResponseSchema,
  MembershipRoleSchema,
  ProjectStatusSchema,
  UploadStatusSchema,
  clientStatuses,
  fileCategories,
  invoiceStatuses,
  membershipRoles,
  projectStatuses,
  uploadStatuses,
} from '../src/index.js';

describe('core status schemas', () => {
  it('accepts every configured enum value', () => {
    for (const status of clientStatuses) {
      expect(ClientStatusSchema.parse(status)).toBe(status);
    }

    for (const status of projectStatuses) {
      expect(ProjectStatusSchema.parse(status)).toBe(status);
    }

    for (const role of membershipRoles) {
      expect(MembershipRoleSchema.parse(role)).toBe(role);
    }

    for (const category of fileCategories) {
      expect(FileCategorySchema.parse(category)).toBe(category);
    }

    for (const status of uploadStatuses) {
      expect(UploadStatusSchema.parse(status)).toBe(status);
    }

    for (const status of invoiceStatuses) {
      expect(InvoiceStatusSchema.parse(status)).toBe(status);
    }
  });

  it('rejects values outside the shared enums', () => {
    expect(ClientStatusSchema.safeParse('new')).toMatchObject({ success: false });
    expect(ProjectStatusSchema.safeParse('complete')).toMatchObject({ success: false });
    expect(MembershipRoleSchema.safeParse('owner')).toMatchObject({ success: false });
    expect(MembershipRoleSchema.safeParse('internal_admin')).toMatchObject({ success: false });
    expect(FileCategorySchema.safeParse('passwords')).toMatchObject({ success: false });
    expect(UploadStatusSchema.safeParse('processing')).toMatchObject({ success: false });
    expect(InvoiceStatusSchema.safeParse('refunded')).toMatchObject({ success: false });
  });
});

describe('feature flags and response schemas', () => {
  const featureFlags = {
    canAccessAdmin: false,
    canEditIntake: true,
    canSendMessages: false,
    canUploadFiles: false,
    canViewBilling: false,
    canViewProjects: false,
  };

  it('validates a complete feature flag shape', () => {
    expect(FeatureFlagsSchema.parse(featureFlags)).toEqual(featureFlags);
    expect(FeatureFlagsSchema.safeParse({
      canEditIntake: true,
    })).toMatchObject({ success: false });
  });

  it('validates the initial /me response skeleton', () => {
    const response = {
      client: {
        businessName: '',
        clientId: 'client_123',
        status: 'lead',
      },
      featureFlags,
      membership: {
        role: 'client_owner',
        status: 'active',
      },
      user: {
        auth0Sub: 'auth0|abc',
        email: 'client@example.com',
        name: 'Client Name',
      },
    };

    expect(MeResponseSchema.parse(response)).toEqual(response);
  });

  it('validates common API error responses', () => {
    const error = {
      error: 'Forbidden',
      message: 'You do not have access to this resource.',
      requestId: 'request-123',
    };

    expect(ApiErrorResponseSchema.parse(error)).toEqual(error);
    expect(ApiErrorResponseSchema.safeParse({ error: '' })).toMatchObject({ success: false });
  });

  it('validates admin client list filters and responses', () => {
    expect(AdminClientListQuerySchema.parse({
      limit: '25',
      status: 'lead',
    })).toEqual({
      limit: 25,
      status: 'lead',
    });

    const response = {
      clients: [
        {
          businessName: 'North Star Remodeling',
          clientId: 'client_123',
          createdAt: '2026-05-21T10:15:30.000Z',
          primaryContactUserId: 'auth0|abc',
          status: 'lead',
          updatedAt: '2026-05-21T10:20:30.000Z',
        },
      ],
      count: 1,
      filters: {
        limit: 25,
        status: 'lead',
      },
    };

    expect(AdminClientListResponseSchema.parse(response)).toEqual(response);
  });
});
