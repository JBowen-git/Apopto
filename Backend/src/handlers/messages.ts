import { createNotImplementedHandler } from '../router/notImplemented.js';
import { messageRoutes } from '../router/routeOwnership.js';

export const handler = createNotImplementedHandler('messages', messageRoutes);
