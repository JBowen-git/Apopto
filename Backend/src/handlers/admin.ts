import { createNotImplementedHandler } from '../router/notImplemented.js';
import { adminRoutes } from '../router/routeOwnership.js';

export const handler = createNotImplementedHandler('admin', adminRoutes);
