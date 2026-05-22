import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MAX_UPLOAD_BYTES,
  FileSafetyError,
  assertAllowedFilename,
  assertUploadSizeAllowed,
  buildClientFileStorageKey,
  buildClientUploadS3Key,
  hasBlockedExtension,
  normalizeMimeType,
  resolveMaxUploadBytes,
  sanitizeFilename,
  validateUploadFile,
} from '../src/files/index.js';

describe('file safety utilities', () => {
  it('sanitizes filenames without preserving paths or control characters', () => {
    expect(sanitizeFilename('..\\..\\ACME Logo Final (1).PNG')).toBe('ACME-Logo-Final-1.PNG');
    expect(sanitizeFilename('/tmp/resume & brand copy.pdf')).toBe('resume-and-brand-copy.pdf');
    expect(sanitizeFilename('../\u0000')).toBe('upload');
    expect(sanitizeFilename('con.txt')).toBe('file-con.txt');
  });

  it('detects blocked executable and script extensions case-insensitively', () => {
    expect(hasBlockedExtension('invoice.pdf.exe')).toBe(true);
    expect(hasBlockedExtension('script.js.map')).toBe(true);
    expect(hasBlockedExtension('deploy.SH')).toBe(true);
    expect(hasBlockedExtension('proposal.PDF')).toBe(false);

    expect(() => assertAllowedFilename('shell.SH')).toThrow(FileSafetyError);
  });

  it('resolves upload limits with a 50 MB default and env override', () => {
    expect(resolveMaxUploadBytes({})).toBe(DEFAULT_MAX_UPLOAD_BYTES);
    expect(resolveMaxUploadBytes({ MAX_UPLOAD_BYTES: '1048576' })).toBe(1_048_576);

    expect(() => resolveMaxUploadBytes({ MAX_UPLOAD_BYTES: '1.5' })).toThrow(FileSafetyError);
    expect(() => resolveMaxUploadBytes({ MAX_UPLOAD_BYTES: '0' })).toThrow(FileSafetyError);
  });

  it('validates size, MIME type, and category inputs', () => {
    expect(assertUploadSizeAllowed(DEFAULT_MAX_UPLOAD_BYTES, DEFAULT_MAX_UPLOAD_BYTES)).toBe(
      DEFAULT_MAX_UPLOAD_BYTES,
    );
    expect(() => assertUploadSizeAllowed(DEFAULT_MAX_UPLOAD_BYTES + 1, DEFAULT_MAX_UPLOAD_BYTES))
      .toThrow(FileSafetyError);

    expect(normalizeMimeType(' Image/PNG ')).toBe('image/png');
    expect(() => normalizeMimeType('not-a-mime')).toThrow(FileSafetyError);

    expect(validateUploadFile({
      category: 'images',
      maxUploadBytes: 10_000,
      mimeType: 'IMAGE/PNG',
      originalFilename: ' Hero Image.PNG ',
      sizeBytes: 2048,
    })).toMatchObject({
      category: 'images',
      maxUploadBytes: 10_000,
      mimeType: 'image/png',
      safeFilename: 'Hero-Image.PNG',
      sizeBytes: 2048,
    });

    expect(() => validateUploadFile({
      category: 'unknown',
      maxUploadBytes: 10_000,
      mimeType: 'image/png',
      originalFilename: 'hero.png',
      sizeBytes: 2048,
    })).toThrow(FileSafetyError);
  });

  it('builds deterministic tenant-scoped S3 keys', () => {
    expect(buildClientUploadS3Key({
      clientId: 'client_123',
      fileId: 'file_123',
      safeFilename: 'hero image.png',
    })).toBe('quarantine/client_123/file_123/hero-image.png');

    expect(buildClientUploadS3Key({
      clientId: 'client_123',
      fileId: 'file_123',
      safeFilename: 'notes.pdf',
    })).toBe('quarantine/client_123/file_123/notes.pdf');

    expect(buildClientFileStorageKey({
      clientId: 'client_123',
      fileId: 'file_123',
      safeFilename: 'notes.pdf',
      storagePrefix: 'clean',
    })).toBe('clean/client_123/file_123/notes.pdf');

    expect(() => buildClientUploadS3Key({
      clientId: '../client_123',
      fileId: 'file_123',
      safeFilename: 'notes.pdf',
    })).toThrow(FileSafetyError);
  });
});
