import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProtectedRoute from './ProtectedRoute';

const authState = vi.hoisted(() => ({
  current: {
    error: undefined as Error | undefined,
    isAuthenticated: false,
    isConfigured: true,
    isLoading: false,
    login: vi.fn(),
  },
}));

vi.mock('../../auth.jsx', () => ({
  useApoptoAuth: () => authState.current,
}));

function renderProtectedRoute(path = '/dashboard') {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <ProtectedRoute>
        <main>Secure dashboard</main>
      </ProtectedRoute>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    authState.current = {
      error: undefined,
      isAuthenticated: false,
      isConfigured: true,
      isLoading: false,
      login: vi.fn(),
    };
  });

  it('renders a configuration error when customer login is unavailable', () => {
    authState.current.isConfigured = false;

    const html = renderProtectedRoute();

    expect(html).toContain('Sign in is not available.');
    expect(html).toContain('Customer login is not configured for this environment yet.');
    expect(html).not.toContain('Secure dashboard');
  });

  it('renders the loading state while authentication is unresolved', () => {
    authState.current.isLoading = true;

    const html = renderProtectedRoute('/files');

    expect(html).toContain('Checking your session.');
    expect(html).toContain('Opening secure customer access.');
    expect(html).not.toContain('Secure dashboard');
  });

  it('renders authentication errors without exposing protected children', () => {
    authState.current.error = new Error('Auth0 callback failed.');

    const html = renderProtectedRoute('/callback');

    expect(html).toContain('Authentication needs attention.');
    expect(html).toContain('Auth0 callback failed.');
    expect(html).not.toContain('Secure dashboard');
  });

  it('renders protected children once the user is authenticated', () => {
    authState.current.isAuthenticated = true;

    const html = renderProtectedRoute('/dashboard?tab=files#top');

    expect(html).toContain('Secure dashboard');
    expect(html).not.toContain('Checking your session.');
  });
});
