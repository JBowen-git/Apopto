import type { DashboardResponse } from '@apopto/shared';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DashboardLifecycleModules from './DashboardLifecycleModules';

const timestamp = '2026-05-23T10:00:00.000Z';

function dashboard(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  const base: DashboardResponse = {
    client: {
      businessName: 'North Star Remodeling',
      clientId: 'client_123',
      createdAt: timestamp,
      status: 'lead',
      updatedAt: timestamp,
    },
    featureFlags: {
      canAccessAdmin: false,
      canEditIntake: true,
      canSendMessages: false,
      canUploadFiles: false,
      canViewBilling: false,
      canViewProjects: false,
    },
    intake: null,
    invoices: [],
    membership: {
      role: 'client_owner',
      status: 'active',
    },
    nextSteps: [],
    projects: [],
    recentFiles: [],
    recentThreads: [],
    sliceLimits: {
      files: 5,
      invoices: 5,
      projects: 5,
      threads: 5,
    },
    user: {
      auth0Sub: 'auth0|client',
      email: 'client@example.com',
      name: 'Client Owner',
    },
  };

  return {
    ...base,
    ...overrides,
    featureFlags: {
      ...base.featureFlags,
      ...overrides.featureFlags,
    },
    sliceLimits: {
      ...base.sliceLimits,
      ...overrides.sliceLimits,
    },
  };
}

function renderModules(value: DashboardResponse) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <DashboardLifecycleModules dashboard={value} />
    </MemoryRouter>,
  );
}

describe('DashboardLifecycleModules', () => {
  it('shows the intake-first placeholder when lifecycle flags hide later modules', () => {
    const html = renderModules(dashboard());

    expect(html).toContain('Intake comes first.');
    expect(html).toContain('Lifecycle modules');
    expect(html).not.toContain('Open files');
    expect(html).not.toContain('Open messages');
    expect(html).not.toContain('Open billing');
  });

  it('renders only modules enabled by backend feature flags', () => {
    const html = renderModules(dashboard({
      featureFlags: {
        canAccessAdmin: false,
        canEditIntake: false,
        canSendMessages: true,
        canUploadFiles: true,
        canViewBilling: true,
        canViewProjects: false,
      },
      invoices: [{
        amountDue: 12500,
        createdAt: timestamp,
        currency: 'usd',
        dueDate: '2026-06-15',
        invoiceId: 'invoice_123',
        provider: 'stripe',
        status: 'open',
        updatedAt: timestamp,
      }],
      recentFiles: [{
        category: 'images',
        createdAt: timestamp,
        fileId: 'file_123',
        mimeType: 'image/png',
        originalFilename: 'logo.png',
        safeFilename: 'logo.png',
        scanStatus: 'clean',
        sizeBytes: 2048,
        storageKey: 'clean/client_123/file_123/logo.png',
        storagePrefix: 'clean',
        updatedAt: timestamp,
        uploadStatus: 'available',
      }],
      recentThreads: [{
        createdAt: timestamp,
        lastMessageAt: timestamp,
        lastMessagePreview: 'Can we talk launch?',
        subject: 'Launch planning',
        threadId: 'thread_123',
        updatedAt: timestamp,
      }],
    }));

    expect(html).toContain('Files');
    expect(html).toContain('logo.png');
    expect(html).toContain('href="/files"');
    expect(html).toContain('Messages');
    expect(html).toContain('Launch planning');
    expect(html).toContain('href="/messages"');
    expect(html).toContain('Billing');
    expect(html).toContain('USD 125.00');
    expect(html).toContain('href="/billing"');
    expect(html).not.toContain('Projects');
  });
});
