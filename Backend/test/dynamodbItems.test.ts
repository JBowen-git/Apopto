import { describe, expect, it } from 'vitest';

import {
  buildAuditEventItem,
  buildClientProfileItem,
  buildCurrentIntakeItem,
  buildFileMetadataItem,
  buildInternalAdminItem,
  buildInvoiceItem,
  buildMembershipItem,
  buildMessageItem,
  buildProjectItem,
  buildThreadItem,
  buildUserProfileItem,
} from '../src/dynamodb/index.js';

const createdAt = '2026-05-21T10:15:30.000Z';
const updatedAt = '2026-05-21T10:20:30.000Z';

const intakeFormData = {
  acceptedNoSecretsWarning: true,
  acceptedTerms: true,
  businessDescription: 'A design-forward service company.',
  businessName: 'North Star Remodeling',
  budgetRange: '$5,000-$10,000',
  contactEmail: 'owner@example.com',
  contactName: 'Sam Rivera',
  contentReadiness: 'partial',
  dataSensitivity: 'basic_contact_info',
  desiredFeatures: ['contact form'],
  desiredTimeline: '8-12 weeks',
  designPreferences: 'Clean and confident.',
  goals: ['get more leads'],
  hasBrandGuide: false,
  hasLogo: true,
  industry: 'Home services',
  integrationsNeeded: [],
  maintenanceInterest: 'not_sure',
  mustHaveFeatures: 'Contact form and gallery.',
  needsCopywriting: true,
  projectType: 'business_website',
  referenceSites: [],
  targetAudience: 'Homeowners within 40 miles.',
} as const;

describe('DynamoDB item builders', () => {
  it('builds client, user, membership, and intake items', () => {
    expect(buildClientProfileItem({
      businessName: 'North Star Remodeling',
      clientId: 'client_123',
      createdAt,
      primaryContactUserId: 'auth0|abc',
      status: 'lead',
      updatedAt,
    })).toEqual({
      GSI1PK: 'CLIENT_STATUS#lead',
      GSI1SK: `CLIENT#${createdAt}#client_123`,
      PK: 'CLIENT#client_123',
      SK: 'PROFILE#',
      businessName: 'North Star Remodeling',
      clientId: 'client_123',
      createdAt,
      primaryContactUserId: 'auth0|abc',
      status: 'lead',
      type: 'CLIENT',
      updatedAt,
    });

    expect(buildUserProfileItem({
      auth0Sub: 'auth0|abc',
      createdAt,
      email: 'owner@example.com',
      lastLoginAt: updatedAt,
      name: 'Sam Rivera',
    })).toMatchObject({
      PK: 'USER#auth0|abc',
      SK: 'PROFILE#',
      auth0Sub: 'auth0|abc',
      type: 'USER',
    });

    expect(buildMembershipItem({
      auth0Sub: 'auth0|abc',
      clientId: 'client_123',
      createdAt,
      role: 'client_owner',
      status: 'active',
      updatedAt,
    })).toEqual({
      PK: 'CLIENT#client_123',
      SK: 'USER#auth0|abc',
      GSI1PK: 'USER#auth0|abc',
      GSI1SK: 'CLIENT#client_123',
      auth0Sub: 'auth0|abc',
      clientId: 'client_123',
      createdAt,
      role: 'client_owner',
      status: 'active',
      type: 'MEMBERSHIP',
      updatedAt,
    });

    expect(buildInternalAdminItem({
      auth0Sub: 'auth0|admin',
      createdAt,
      createdBy: 'manual_seed',
      email: 'admin@example.com',
      name: 'Admin User',
      status: 'active',
      updatedAt,
    })).toEqual({
      PK: 'USER#auth0|admin',
      SK: 'INTERNAL_ADMIN#',
      auth0Sub: 'auth0|admin',
      createdAt,
      createdBy: 'manual_seed',
      email: 'admin@example.com',
      name: 'Admin User',
      status: 'active',
      type: 'INTERNAL_ADMIN',
      updatedAt,
    });

    expect(buildCurrentIntakeItem({
      clientId: 'client_123',
      createdAt,
      formData: intakeFormData,
      updatedAt,
      updatedBy: 'auth0|abc',
      version: 1,
    })).toMatchObject({
      PK: 'CLIENT#client_123',
      SK: 'INTAKE#CURRENT',
      type: 'INTAKE',
      version: 1,
    });
  });

  it('builds project, file, thread, message, invoice, and audit items', () => {
    expect(buildProjectItem({
      clientId: 'client_123',
      createdAt,
      description: 'Website rebuild',
      name: 'Main Website',
      projectId: 'project_123',
      status: 'planning',
      targetLaunchDate: '2026-07-01',
      updatedAt,
    })).toMatchObject({
      PK: 'CLIENT#client_123',
      SK: 'PROJECT#project_123',
      type: 'PROJECT',
    });

    expect(buildFileMetadataItem({
      bucket: 'client-portal-uploads-staging',
      category: 'images',
      clientId: 'client_123',
      createdAt,
      fileId: 'file_123',
      key: 'quarantine/client_123/file_123/hero.png',
      mimeType: 'image/png',
      originalFilename: 'hero.png',
      projectId: 'project_123',
      safeFilename: 'hero.png',
      scanStatus: 'pending',
      sizeBytes: 1024,
      storageKey: 'quarantine/client_123/file_123/hero.png',
      storagePrefix: 'quarantine',
      updatedAt,
      uploadedBy: 'auth0|abc',
      uploadStatus: 'pending',
    })).toMatchObject({
      PK: 'CLIENT#client_123',
      SK: `FILE#${createdAt}#file_123`,
      GSI1PK: 'PROJECT#project_123',
      GSI1SK: `FILE#${createdAt}#file_123`,
      GSI2PK: 'FILE#file_123',
      GSI2SK: 'CLIENT#client_123',
      type: 'FILE',
    });

    const generalFile = buildFileMetadataItem({
      bucket: 'client-portal-uploads-staging',
      category: 'other',
      clientId: 'client_123',
      createdAt,
      fileId: 'file_general',
      key: 'quarantine/client_123/file_general/notes.pdf',
      mimeType: 'application/pdf',
      originalFilename: 'notes.pdf',
      safeFilename: 'notes.pdf',
      scanStatus: 'pending',
      sizeBytes: 2048,
      storageKey: 'quarantine/client_123/file_general/notes.pdf',
      storagePrefix: 'quarantine',
      updatedAt,
      uploadedBy: 'auth0|abc',
      uploadStatus: 'pending',
    });

    expect(generalFile).not.toHaveProperty('GSI1PK');
    expect(generalFile).not.toHaveProperty('GSI1SK');

    expect(buildThreadItem({
      clientId: 'client_123',
      createdAt,
      createdBy: 'auth0|abc',
      lastMessageAt: updatedAt,
      lastMessagePreview: 'Can we talk about launch timing?',
      subject: 'Launch timing',
      threadId: 'thread_123',
      updatedAt,
    })).toMatchObject({
      PK: 'CLIENT#client_123',
      SK: `THREAD#${updatedAt}#thread_123`,
      type: 'THREAD',
    });

    expect(buildMessageItem({
      body: 'That timing works.',
      clientId: 'client_123',
      createdAt,
      emailNotificationStatus: 'not_sent',
      messageId: 'message_123',
      senderRole: 'client',
      senderUserId: 'auth0|abc',
      threadId: 'thread_123',
      visibility: 'client_and_admin',
    })).toMatchObject({
      PK: 'THREAD#thread_123',
      SK: `MESSAGE#${createdAt}#message_123`,
      GSI1PK: 'CLIENT#client_123',
      GSI1SK: `MESSAGE#${createdAt}#message_123`,
      type: 'MESSAGE',
    });

    expect(buildInvoiceItem({
      amountDue: 250000,
      clientId: 'client_123',
      createdAt,
      currency: 'usd',
      dueDate: '2026-06-01',
      invoiceId: 'invoice_123',
      provider: 'stripe',
      status: 'open',
      stripeCustomerId: 'cus_123',
      updatedAt,
    })).toMatchObject({
      PK: 'CLIENT#client_123',
      SK: 'INVOICE#2026-06-01#invoice_123',
      type: 'INVOICE',
    });

    expect(buildAuditEventItem({
      action: 'intake.updated',
      actorUserId: 'auth0|abc',
      clientId: 'client_123',
      createdAt,
      entityId: 'client_123',
      entityType: 'CLIENT',
      eventId: 'audit_123',
      metadata: { version: 1 },
    })).toMatchObject({
      PK: 'CLIENT#client_123',
      SK: `AUDIT#${createdAt}#audit_123`,
      type: 'AUDIT',
    });
  });
});
