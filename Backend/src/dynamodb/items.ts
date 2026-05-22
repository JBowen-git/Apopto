import type {
  ClientStatus,
  EmailNotificationStatus,
  FileCategory,
  FileScanStatus,
  FileStoragePrefix,
  IntakeFormData,
  InvoiceStatus,
  MembershipRole,
  MessageVisibility,
  ProjectStatus,
  UploadStatus,
} from '@apopto/shared';

import {
  auditKey,
  clientByStatusGsiKey,
  clientProfileKey,
  currentIntakeKey,
  fileByIdGsiKey,
  fileByProjectGsiKey,
  fileKey,
  invoiceKey,
  internalAdminKey,
  membershipByUserGsiKey,
  membershipKey,
  messageByClientGsiKey,
  messageKey,
  projectKey,
  threadByIdGsiKey,
  threadKey,
  userProfileKey,
  type PortalGsi1Key,
  type PortalGsi2Key,
  type PortalTableKey,
} from './keys.js';

export type EntityType =
  | 'CLIENT'
  | 'USER'
  | 'MEMBERSHIP'
  | 'INTAKE'
  | 'PROJECT'
  | 'FILE'
  | 'THREAD'
  | 'MESSAGE'
  | 'INVOICE'
  | 'AUDIT'
  | 'INTERNAL_ADMIN';

export type IsoDateTime = string;
export type IsoDate = string;

type Timestamps = {
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};

export type ClientProfileItem = PortalTableKey & PortalGsi1Key & Timestamps & {
  type: 'CLIENT';
  clientId: string;
  businessName: string;
  status: ClientStatus;
  primaryContactUserId: string;
  contactEmail?: string;
  contactName?: string;
  industry?: string;
  phone?: string;
  website?: string;
};

export type UserProfileItem = PortalTableKey & {
  type: 'USER';
  auth0Sub: string;
  email?: string;
  name?: string;
  createdAt: IsoDateTime;
  lastLoginAt: IsoDateTime;
};

export type MembershipStatus = 'active' | 'invited' | 'removed';
export type InternalAdminStatus = 'active' | 'disabled';

export type MembershipItem = PortalTableKey & PortalGsi1Key & Timestamps & {
  type: 'MEMBERSHIP';
  clientId: string;
  auth0Sub: string;
  role: MembershipRole;
  status: MembershipStatus;
};

export type CurrentIntakeItem = PortalTableKey & Timestamps & {
  type: 'INTAKE';
  clientId: string;
  formData: IntakeFormData;
  version: number;
  updatedBy: string;
};

export type ProjectItem = PortalTableKey & Timestamps & {
  type: 'PROJECT';
  clientId: string;
  projectId: string;
  name: string;
  status: ProjectStatus;
  description?: string;
  targetLaunchDate?: IsoDate;
};

export type FileMetadataItem = PortalTableKey & Partial<PortalGsi1Key> & PortalGsi2Key & Timestamps & {
  type: 'FILE';
  clientId: string;
  projectId?: string;
  fileId: string;
  bucket: string;
  key: string;
  storageKey: string;
  storagePrefix: FileStoragePrefix;
  cleanStorageKey?: string;
  originalFilename: string;
  safeFilename: string;
  mimeType: string;
  sizeBytes: number;
  category: FileCategory;
  scanStatus: FileScanStatus;
  scannedAt?: string;
  guardDutyMalwareScanStatus?: string;
  scanStatusReason?: string;
  uploadStatus: UploadStatus;
  uploadedBy: string;
};

export type ThreadItem = PortalTableKey & PortalGsi2Key & Timestamps & {
  type: 'THREAD';
  clientId: string;
  threadId: string;
  subject: string;
  lastMessageAt: IsoDateTime;
  lastMessagePreview: string;
  createdBy: string;
};

export type MessageSenderRole = 'client' | 'admin';

export type MessageItem = PortalTableKey & PortalGsi1Key & {
  type: 'MESSAGE';
  clientId: string;
  threadId: string;
  messageId: string;
  body: string;
  senderUserId: string;
  senderRole: MessageSenderRole;
  visibility: MessageVisibility;
  emailNotificationStatus: EmailNotificationStatus;
  createdAt: IsoDateTime;
};

export type InvoiceItem = PortalTableKey & Timestamps & {
  type: 'INVOICE';
  clientId: string;
  invoiceId: string;
  provider: 'stripe';
  stripeCustomerId?: string;
  stripeInvoiceId?: string;
  status: InvoiceStatus;
  amountDue: number;
  currency: string;
  dueDate: IsoDate;
};

export type AuditEventItem = PortalTableKey & {
  type: 'AUDIT';
  clientId: string;
  eventId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: IsoDateTime;
};

export type InternalAdminItem = PortalTableKey & Timestamps & {
  type: 'INTERNAL_ADMIN';
  auth0Sub: string;
  status: InternalAdminStatus;
  createdBy: string;
  email?: string;
  name?: string;
  notes?: string;
  updatedBy?: string;
};

export type PortalTableItem =
  | ClientProfileItem
  | UserProfileItem
  | MembershipItem
  | CurrentIntakeItem
  | ProjectItem
  | FileMetadataItem
  | ThreadItem
  | MessageItem
  | InvoiceItem
  | AuditEventItem
  | InternalAdminItem;

export type BuildClientProfileItemInput =
  Omit<ClientProfileItem, keyof PortalTableKey | keyof PortalGsi1Key | 'type'>;

export function buildClientProfileItem(input: BuildClientProfileItemInput): ClientProfileItem {
  return {
    ...clientProfileKey(input.clientId),
    ...clientByStatusGsiKey(input.status, input.createdAt, input.clientId),
    type: 'CLIENT',
    ...input,
  };
}

export type BuildUserProfileItemInput =
  Omit<UserProfileItem, keyof PortalTableKey | 'type'>;

export function buildUserProfileItem(input: BuildUserProfileItemInput): UserProfileItem {
  return {
    ...userProfileKey(input.auth0Sub),
    type: 'USER',
    ...input,
  };
}

export type BuildMembershipItemInput =
  Omit<MembershipItem, keyof PortalTableKey | keyof PortalGsi1Key | 'type'>;

export function buildMembershipItem(input: BuildMembershipItemInput): MembershipItem {
  return {
    ...membershipKey(input.clientId, input.auth0Sub),
    ...membershipByUserGsiKey(input.auth0Sub, input.clientId),
    type: 'MEMBERSHIP',
    ...input,
  };
}

export type BuildCurrentIntakeItemInput =
  Omit<CurrentIntakeItem, keyof PortalTableKey | 'type'>;

export function buildCurrentIntakeItem(input: BuildCurrentIntakeItemInput): CurrentIntakeItem {
  return {
    ...currentIntakeKey(input.clientId),
    type: 'INTAKE',
    ...input,
  };
}

export type BuildProjectItemInput =
  Omit<ProjectItem, keyof PortalTableKey | 'type'>;

export function buildProjectItem(input: BuildProjectItemInput): ProjectItem {
  return {
    ...projectKey(input.clientId, input.projectId),
    type: 'PROJECT',
    ...input,
  };
}

export type BuildFileMetadataItemInput =
  Omit<FileMetadataItem, keyof PortalTableKey | keyof PortalGsi1Key | keyof PortalGsi2Key | 'type'>;

export function buildFileMetadataItem(input: BuildFileMetadataItemInput): FileMetadataItem {
  return {
    ...fileKey(input.clientId, input.createdAt, input.fileId),
    ...(input.projectId ? fileByProjectGsiKey(input.projectId, input.createdAt, input.fileId) : {}),
    ...fileByIdGsiKey(input.fileId, input.clientId),
    type: 'FILE',
    ...input,
  };
}

export type BuildThreadItemInput =
  Omit<ThreadItem, keyof PortalTableKey | keyof PortalGsi2Key | 'type'>;

export function buildThreadItem(input: BuildThreadItemInput): ThreadItem {
  return {
    ...threadKey(input.clientId, input.updatedAt, input.threadId),
    ...threadByIdGsiKey(input.threadId, input.clientId),
    type: 'THREAD',
    ...input,
  };
}

export type BuildMessageItemInput =
  Omit<MessageItem, keyof PortalTableKey | keyof PortalGsi1Key | 'type'>;

export function buildMessageItem(input: BuildMessageItemInput): MessageItem {
  return {
    ...messageKey(input.threadId, input.createdAt, input.messageId),
    ...messageByClientGsiKey(input.clientId, input.createdAt, input.messageId),
    type: 'MESSAGE',
    ...input,
  };
}

export type BuildInvoiceItemInput =
  Omit<InvoiceItem, keyof PortalTableKey | 'type'>;

export function buildInvoiceItem(input: BuildInvoiceItemInput): InvoiceItem {
  return {
    ...invoiceKey(input.clientId, input.dueDate, input.invoiceId),
    type: 'INVOICE',
    ...input,
  };
}

export type BuildAuditEventItemInput =
  Omit<AuditEventItem, keyof PortalTableKey | 'type'>;

export function buildAuditEventItem(input: BuildAuditEventItemInput): AuditEventItem {
  return {
    ...auditKey(input.clientId, input.createdAt, input.eventId),
    type: 'AUDIT',
    ...input,
  };
}

export type BuildInternalAdminItemInput =
  Omit<InternalAdminItem, keyof PortalTableKey | 'type'>;

export function buildInternalAdminItem(input: BuildInternalAdminItemInput): InternalAdminItem {
  return {
    ...internalAdminKey(input.auth0Sub),
    type: 'INTERNAL_ADMIN',
    ...input,
  };
}
