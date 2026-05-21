import { createNotImplementedHandler } from '../router/notImplemented.js';
import { billingRoutes } from '../router/routeOwnership.js';

export const handler = createNotImplementedHandler('billing', billingRoutes);
