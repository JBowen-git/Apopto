import { describe, expect, it } from 'vitest';
import {
  AdminUpdateClientStatusRequestSchema,
  CreateMessageRequestSchema,
  CreateThreadRequestSchema,
  CreateUploadUrlRequestSchema,
  DataSensitivitySchema,
  IntakeFormDataSchema,
  ProjectTypeSchema,
  UpdateClientProfileRequestSchema,
  UpdateIntakeRequestSchema,
} from '../src/index.js';

const validIntake = {
  acceptedNoSecretsWarning: true,
  acceptedTerms: true,
  additionalNotes: 'We are hoping to launch before the busy season.',
  analyticsTools: 'Google Analytics',
  budgetRange: '$5,000-$10,000',
  businessDescription: 'A local service business focused on premium installs.',
  businessName: 'North Star Remodeling',
  contactEmail: 'owner@example.com',
  contactName: 'Sam Rivera',
  contentReadiness: 'partial',
  currentHostingProvider: 'CurrentHost',
  dataSensitivity: 'basic_contact_info',
  desiredFeatures: ['contact form', 'project gallery'],
  desiredTimeline: '8-12 weeks',
  designPreferences: 'Clean, trustworthy, and easy to scan on mobile.',
  domainRegistrar: 'Namecheap',
  emailProvider: 'Google Workspace',
  goals: ['get more leads', 'look more professional'],
  hasBrandGuide: false,
  hasLogo: true,
  industry: 'Home services',
  integrationsNeeded: ['CRM'],
  maintenanceInterest: 'not_sure',
  mustHaveFeatures: 'Mobile-first pages, contact form, and gallery.',
  needsCopywriting: true,
  niceToHaveFeatures: 'Client dashboard later.',
  phone: '555-555-1212',
  projectType: 'business_website',
  referenceSites: [
    {
      notes: 'The service page layout is clear.',
      url: 'https://example.com',
      whatTheyLike: 'Simple navigation and strong calls to action.',
    },
  ],
  targetAudience: 'Homeowners within 40 miles looking for remodeling help.',
  website: 'https://northstar.example',
};

describe('intake schemas', () => {
  it('validates a complete intake payload', () => {
    expect(IntakeFormDataSchema.parse(validIntake)).toEqual(validIntake);
    expect(UpdateIntakeRequestSchema.parse({ formData: validIntake })).toEqual({
      formData: validIntake,
    });
  });

  it('requires the no-secrets warning acknowledgement', () => {
    expect(IntakeFormDataSchema.safeParse({
      ...validIntake,
      acceptedNoSecretsWarning: false,
    })).toMatchObject({ success: false });
  });

  it('requires terms acceptance', () => {
    expect(IntakeFormDataSchema.safeParse({
      ...validIntake,
      acceptedTerms: false,
    })).toMatchObject({ success: false });
  });

  it('rejects invalid optional and reference URLs', () => {
    expect(IntakeFormDataSchema.safeParse({
      ...validIntake,
      website: 'not-a-url',
    })).toMatchObject({ success: false });

    expect(IntakeFormDataSchema.safeParse({
      ...validIntake,
      referenceSites: [
        {
          url: 'also-not-a-url',
          whatTheyLike: 'Nice visual hierarchy.',
        },
      ],
    })).toMatchObject({ success: false });
  });

  it('rejects invalid enum values', () => {
    expect(DataSensitivitySchema.safeParse('passwords')).toMatchObject({ success: false });
    expect(ProjectTypeSchema.safeParse('wordpress_template')).toMatchObject({ success: false });
    expect(IntakeFormDataSchema.safeParse({
      ...validIntake,
      dataSensitivity: 'passwords',
    })).toMatchObject({ success: false });
  });

  it('normalizes blank optional strings and keeps arrays defaultable', () => {
    const parsed = IntakeFormDataSchema.parse({
      ...validIntake,
      additionalNotes: '',
      desiredFeatures: undefined,
      integrationsNeeded: undefined,
      phone: '',
      referenceSites: undefined,
      website: '',
    });

    expect(parsed.additionalNotes).toBeUndefined();
    expect(parsed.desiredFeatures).toEqual([]);
    expect(parsed.integrationsNeeded).toEqual([]);
    expect(parsed.phone).toBeUndefined();
    expect(parsed.referenceSites).toEqual([]);
    expect(parsed.website).toBeUndefined();
  });
});

describe('profile and future endpoint request schemas', () => {
  it('validates editable client profile updates', () => {
    expect(UpdateClientProfileRequestSchema.parse({
      businessName: 'Updated Brand',
      website: '',
    })).toEqual({
      businessName: 'Updated Brand',
      website: undefined,
    });

    expect(UpdateClientProfileRequestSchema.safeParse({})).toMatchObject({ success: false });
    expect(UpdateClientProfileRequestSchema.safeParse({ contactEmail: 'invalid-email' }))
      .toMatchObject({ success: false });
  });

  it('validates initial request schemas for later portal features', () => {
    expect(CreateUploadUrlRequestSchema.parse({
      category: 'images',
      mimeType: 'image/png',
      originalFilename: 'hero.png',
      sizeBytes: 1024,
    })).toMatchObject({
      category: 'images',
      originalFilename: 'hero.png',
    });

    expect(CreateThreadRequestSchema.parse({
      body: 'Can we talk about launch timing?',
      subject: 'Launch question',
    })).toMatchObject({ subject: 'Launch question' });

    expect(CreateMessageRequestSchema.parse({
      body: 'That works for me.',
    })).toEqual({ body: 'That works for me.' });

    expect(AdminUpdateClientStatusRequestSchema.parse({
      status: 'active',
    })).toEqual({ status: 'active' });
  });
});
