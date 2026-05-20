export * from './schemas/admin.js';
export * from './schemas/billing.js';
export * from './schemas/common.js';
export * from './schemas/core.js';
export * from './schemas/files.js';
export * from './schemas/intake.js';
export * from './schemas/messages.js';

export const sharedPackageReady = true as const;

export const sharedPackageVersion = '0.0.0';

export function getSharedPackageStatus() {
  return {
    ready: sharedPackageReady,
    version: sharedPackageVersion,
  };
}
