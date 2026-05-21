import { createNotImplementedHandler } from '../router/notImplemented.js';
import { fileRoutes } from '../router/routeOwnership.js';

export const handler = createNotImplementedHandler('files', fileRoutes);
