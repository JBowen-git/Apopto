import {
  FileCategorySchema,
  FileStoragePrefixSchema,
  type FileCategory,
  type FileStoragePrefix,
} from '@apopto/shared';

export const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_SAFE_FILENAME_LENGTH = 160;

export const BLOCKED_FILE_EXTENSIONS = new Set([
  '.ade',
  '.adp',
  '.app',
  '.appx',
  '.bat',
  '.bin',
  '.cmd',
  '.com',
  '.cpl',
  '.dll',
  '.dmg',
  '.exe',
  '.gadget',
  '.hta',
  '.inf',
  '.ins',
  '.iso',
  '.jar',
  '.js',
  '.jse',
  '.jsx',
  '.ksh',
  '.lnk',
  '.msi',
  '.msp',
  '.php',
  '.pif',
  '.pl',
  '.ps1',
  '.py',
  '.rb',
  '.scr',
  '.sh',
  '.ts',
  '.tsx',
  '.vb',
  '.vbe',
  '.vbs',
  '.ws',
  '.wsc',
  '.wsf',
  '.wsh',
]);

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
const COMBINING_MARKS = /[\u0300-\u036f]/g;
const PATH_SEPARATORS = /[/\\]+/;
const SAFE_FILENAME_CHARACTERS = /[^A-Za-z0-9._-]+/g;
const VALID_MIME_TYPE = /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/;
const VALID_S3_KEY_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const WINDOWS_RESERVED_FILENAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

export type FileSafetyErrorCode =
  | 'blocked_extension'
  | 'invalid_category'
  | 'invalid_filename'
  | 'invalid_mime_type'
  | 'invalid_s3_key_segment'
  | 'invalid_upload_limit'
  | 'invalid_upload_size'
  | 'upload_too_large';

export class FileSafetyError extends Error {
  constructor(
    readonly code: FileSafetyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FileSafetyError';
  }
}

export type UploadLimitEnv = {
  MAX_UPLOAD_BYTES?: string;
};

export type ValidateUploadFileInput = {
  category: unknown;
  mimeType: string;
  originalFilename: string;
  sizeBytes: number;
  allowBlockedExtensions?: boolean;
  maxUploadBytes?: number;
};

export type ValidatedUploadFile = {
  category: FileCategory;
  maxUploadBytes: number;
  mimeType: string;
  originalFilename: string;
  safeFilename: string;
  sizeBytes: number;
};

export type BuildClientUploadS3KeyInput = {
  clientId: string;
  fileId: string;
  safeFilename: string;
};

export type BuildClientFileStorageKeyInput = BuildClientUploadS3KeyInput & {
  storagePrefix: FileStoragePrefix;
  projectId?: string;
};

function basename(filename: string) {
  const cleaned = filename.replace(CONTROL_CHARACTERS, '').trim();
  const parts = cleaned.split(PATH_SEPARATORS).filter(Boolean);

  return parts.at(-1) ?? '';
}

function truncateFilename(filename: string) {
  if (filename.length <= MAX_SAFE_FILENAME_LENGTH) {
    return filename;
  }

  const lastDotIndex = filename.lastIndexOf('.');

  if (lastDotIndex <= 0 || lastDotIndex === filename.length - 1) {
    return filename.slice(0, MAX_SAFE_FILENAME_LENGTH);
  }

  const extension = filename.slice(lastDotIndex);
  const stem = filename.slice(0, lastDotIndex);
  const maxStemLength = Math.max(1, MAX_SAFE_FILENAME_LENGTH - extension.length);

  return `${stem.slice(0, maxStemLength)}${extension}`;
}

export function sanitizeFilename(originalFilename: string) {
  const base = basename(originalFilename);

  const safe = base
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(/['"`]/g, '')
    .replace(/&/g, ' and ')
    .replace(SAFE_FILENAME_CHARACTERS, '-')
    .replace(/-+/g, '-')
    .replace(/_+/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/-+\./g, '.')
    .replace(/\.-+/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '');

  const fallback = safe.length > 0 ? safe : 'upload';
  const stem = fallback.split('.')[0]?.toUpperCase() ?? fallback.toUpperCase();
  const reservedSafe = WINDOWS_RESERVED_FILENAMES.has(stem) ? `file-${fallback}` : fallback;

  return truncateFilename(reservedSafe);
}

export function getFilenameExtensions(filename: string) {
  const safeFilename = sanitizeFilename(filename).toLowerCase();
  const parts = safeFilename.split('.').filter(Boolean);

  if (parts.length < 2) {
    return [];
  }

  return parts.slice(1).map((extension) => `.${extension}`);
}

export function hasBlockedExtension(
  filename: string,
  blockedExtensions = BLOCKED_FILE_EXTENSIONS,
) {
  return getFilenameExtensions(filename).some((extension) => blockedExtensions.has(extension));
}

export function assertAllowedFilename(
  originalFilename: string,
  allowBlockedExtensions = false,
) {
  const safeFilename = sanitizeFilename(originalFilename);

  if (safeFilename.length === 0) {
    throw new FileSafetyError('invalid_filename', 'A filename is required.');
  }

  if (!allowBlockedExtensions && hasBlockedExtension(safeFilename)) {
    throw new FileSafetyError('blocked_extension', 'This file type is not allowed for client uploads.');
  }

  return safeFilename;
}

export function normalizeMimeType(mimeType: string) {
  const normalized = mimeType.trim().toLowerCase();

  if (!VALID_MIME_TYPE.test(normalized)) {
    throw new FileSafetyError('invalid_mime_type', 'A valid MIME type is required.');
  }

  return normalized;
}

export function assertValidFileCategory(category: unknown) {
  const parsed = FileCategorySchema.safeParse(category);

  if (!parsed.success) {
    throw new FileSafetyError('invalid_category', 'A valid file category is required.');
  }

  return parsed.data;
}

export function assertValidStoragePrefix(storagePrefix: unknown) {
  const parsed = FileStoragePrefixSchema.safeParse(storagePrefix);

  if (!parsed.success) {
    throw new FileSafetyError('invalid_s3_key_segment', 'A valid storage prefix is required.');
  }

  return parsed.data;
}

export function resolveMaxUploadBytes(env: UploadLimitEnv = process.env) {
  const configured = env.MAX_UPLOAD_BYTES?.trim();

  if (!configured) {
    return DEFAULT_MAX_UPLOAD_BYTES;
  }

  const value = Number(configured);

  if (!Number.isInteger(value) || value <= 0) {
    throw new FileSafetyError('invalid_upload_limit', 'MAX_UPLOAD_BYTES must be a positive integer.');
  }

  return value;
}

export function assertUploadSizeAllowed(
  sizeBytes: number,
  maxUploadBytes = resolveMaxUploadBytes(),
) {
  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    throw new FileSafetyError('invalid_upload_size', 'Upload size must be a positive integer.');
  }

  if (sizeBytes > maxUploadBytes) {
    throw new FileSafetyError('upload_too_large', 'Upload size exceeds the configured limit.');
  }

  return sizeBytes;
}

export function validateUploadFile(input: ValidateUploadFileInput): ValidatedUploadFile {
  const maxUploadBytes = input.maxUploadBytes ?? resolveMaxUploadBytes();
  const sizeBytes = assertUploadSizeAllowed(input.sizeBytes, maxUploadBytes);

  return {
    category: assertValidFileCategory(input.category),
    maxUploadBytes,
    mimeType: normalizeMimeType(input.mimeType),
    originalFilename: input.originalFilename,
    safeFilename: assertAllowedFilename(input.originalFilename, input.allowBlockedExtensions),
    sizeBytes,
  };
}

function requireS3KeySegment(name: string, value: string) {
  const trimmed = value.trim();

  if (!VALID_S3_KEY_SEGMENT.test(trimmed)) {
    throw new FileSafetyError(
      'invalid_s3_key_segment',
      `${name} must be a non-empty path-safe identifier.`,
    );
  }

  return trimmed;
}

export function buildClientUploadS3Key(input: BuildClientUploadS3KeyInput) {
  return buildClientFileStorageKey({
    ...input,
    storagePrefix: 'quarantine',
  });
}

export function buildClientFileStorageKey(input: BuildClientFileStorageKeyInput) {
  const storagePrefix = assertValidStoragePrefix(input.storagePrefix);
  const clientId = requireS3KeySegment('clientId', input.clientId);
  const fileId = requireS3KeySegment('fileId', input.fileId);
  const safeFilename = assertAllowedFilename(input.safeFilename);

  return `${storagePrefix}/${clientId}/${fileId}/${safeFilename}`;
}
