import { createNotImplementedHandler } from '../router/notImplemented.js';
import { identityIntakeRoutes } from '../router/routeOwnership.js';

export const handler = createNotImplementedHandler('identityIntake', identityIntakeRoutes);
