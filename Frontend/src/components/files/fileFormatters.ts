import type {
  FileCategory,
  FileMetadataSummary,
  FileScanStatus,
  UploadStatus,
} from '@apopto/shared';
import { fileCategories } from '@apopto/shared';
import { formatPortalChoice } from '../dashboard/dashboardFormatters';

export const fileCategoryOptions = fileCategories.map((category) => ({
  label: formatPortalChoice(category),
  value: category,
}));

export function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatCategory(category: FileCategory) {
  return formatPortalChoice(category);
}

export function formatFileTimestamp(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function statusLabel(file: FileMetadataSummary) {
  if (file.uploadStatus === 'available' && file.scanStatus === 'clean') {
    return 'Ready';
  }

  if (file.uploadStatus === 'uploaded' && file.scanStatus === 'pending') {
    return 'Scanning';
  }

  if (file.uploadStatus === 'pending') {
    return 'Waiting for upload';
  }

  if (file.uploadStatus === 'blocked' || file.scanStatus === 'infected') {
    return 'Blocked';
  }

  if (file.uploadStatus === 'pending_review') {
    return 'Needs review';
  }

  return formatPortalChoice(file.uploadStatus);
}

export function statusTone(
  uploadStatus: UploadStatus,
  scanStatus: FileScanStatus,
) {
  if (uploadStatus === 'available' && scanStatus === 'clean') {
    return 'ready';
  }

  if (uploadStatus === 'blocked' || scanStatus === 'infected') {
    return 'blocked';
  }

  if (
    uploadStatus === 'pending_review'
    || scanStatus === 'failed'
    || scanStatus === 'skipped'
    || scanStatus === 'unsupported'
    || scanStatus === 'unknown'
  ) {
    return 'review';
  }

  return 'pending';
}

export function canDownloadFile(file: FileMetadataSummary) {
  return file.uploadStatus === 'available' && file.scanStatus === 'clean';
}
