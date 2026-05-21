export type HandlerGroupName =
  | 'health'
  | 'identityIntake'
  | 'files'
  | 'messages'
  | 'billing'
  | 'admin';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiRouteDefinition = {
  method: ApiMethod;
  path: string;
  owner: HandlerGroupName;
  operation: string;
  phase: number;
};

export function toRouteKey(route: Pick<ApiRouteDefinition, 'method' | 'path'>) {
  return `${route.method} ${route.path}`;
}

export const healthRoutes = [
  {
    method: 'GET',
    path: '/api/health',
    owner: 'health',
    operation: 'healthCheck',
    phase: 9,
  },
] as const satisfies readonly ApiRouteDefinition[];

export const identityIntakeRoutes = [
  {
    method: 'GET',
    path: '/api/_auth-placeholder',
    owner: 'identityIntake',
    operation: 'authPlaceholder',
    phase: 11,
  },
  {
    method: 'GET',
    path: '/api/me',
    owner: 'identityIntake',
    operation: 'getMe',
    phase: 16,
  },
  {
    method: 'GET',
    path: '/api/dashboard',
    owner: 'identityIntake',
    operation: 'getDashboard',
    phase: 26,
  },
  {
    method: 'GET',
    path: '/api/intake',
    owner: 'identityIntake',
    operation: 'getIntake',
    phase: 23,
  },
  {
    method: 'PUT',
    path: '/api/intake',
    owner: 'identityIntake',
    operation: 'updateIntake',
    phase: 23,
  },
  {
    method: 'PATCH',
    path: '/api/client/profile',
    owner: 'identityIntake',
    operation: 'updateClientProfile',
    phase: 25,
  },
] as const satisfies readonly ApiRouteDefinition[];

export const fileRoutes = [
  {
    method: 'POST',
    path: '/api/files/presign-upload',
    owner: 'files',
    operation: 'createUploadUrl',
    phase: 35,
  },
  {
    method: 'POST',
    path: '/api/files/{fileId}/complete',
    owner: 'files',
    operation: 'completeUpload',
    phase: 35,
  },
  {
    method: 'GET',
    path: '/api/files',
    owner: 'files',
    operation: 'listFiles',
    phase: 36,
  },
  {
    method: 'GET',
    path: '/api/files/{fileId}/download-url',
    owner: 'files',
    operation: 'createDownloadUrl',
    phase: 36,
  },
  {
    method: 'DELETE',
    path: '/api/files/{fileId}',
    owner: 'files',
    operation: 'deleteFile',
    phase: 36,
  },
] as const satisfies readonly ApiRouteDefinition[];

export const messageRoutes = [
  {
    method: 'GET',
    path: '/api/threads',
    owner: 'messages',
    operation: 'listThreads',
    phase: 38,
  },
  {
    method: 'POST',
    path: '/api/threads',
    owner: 'messages',
    operation: 'createThread',
    phase: 38,
  },
  {
    method: 'GET',
    path: '/api/threads/{threadId}/messages',
    owner: 'messages',
    operation: 'listMessages',
    phase: 38,
  },
  {
    method: 'POST',
    path: '/api/threads/{threadId}/messages',
    owner: 'messages',
    operation: 'createMessage',
    phase: 38,
  },
] as const satisfies readonly ApiRouteDefinition[];

export const billingRoutes = [
  {
    method: 'GET',
    path: '/api/billing',
    owner: 'billing',
    operation: 'getBilling',
    phase: 41,
  },
  {
    method: 'POST',
    path: '/api/billing/stripe-portal-session',
    owner: 'billing',
    operation: 'createStripePortalSession',
    phase: 41,
  },
] as const satisfies readonly ApiRouteDefinition[];

export const adminRoutes = [
  {
    method: 'GET',
    path: '/api/admin/clients',
    owner: 'admin',
    operation: 'listClients',
    phase: 29,
  },
  {
    method: 'GET',
    path: '/api/admin/clients/{clientId}',
    owner: 'admin',
    operation: 'getClientDetail',
    phase: 30,
  },
  {
    method: 'PATCH',
    path: '/api/admin/clients/{clientId}/status',
    owner: 'admin',
    operation: 'updateClientStatus',
    phase: 30,
  },
  {
    method: 'POST',
    path: '/api/admin/clients/{clientId}/projects',
    owner: 'admin',
    operation: 'createClientProject',
    phase: 30,
  },
] as const satisfies readonly ApiRouteDefinition[];

export const allPortalRoutes = [
  ...healthRoutes,
  ...identityIntakeRoutes,
  ...fileRoutes,
  ...messageRoutes,
  ...billingRoutes,
  ...adminRoutes,
] as const satisfies readonly ApiRouteDefinition[];
