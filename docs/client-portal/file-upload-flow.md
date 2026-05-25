# Client Portal File Upload Flow

Client files use direct browser-to-S3 uploads. Lambda creates short-lived
presigned URLs and stores metadata, but Lambda never receives file bytes.

## Storage

The private upload bucket defaults to:

```text
client-portal-uploads-{deployment_environment}-{aws_account_id}
```

Security defaults:

- S3 block public access enabled.
- ACLs disabled with `BucketOwnerEnforced` object ownership.
- Server-side encryption enabled with `AES256`.
- Versioning enabled.
- Non-SSL requests denied by bucket policy.
- Incomplete multipart uploads cleaned up by lifecycle rules.

## Prefixes

Uploads start in quarantine:

```text
quarantine/{clientId}/{fileId}/{safeFilename}
```

GuardDuty scan result handling can promote objects to:

```text
clean/{clientId}/{fileId}/{safeFilename}
infected/{clientId}/{fileId}/{safeFilename}
```

The app should issue download URLs only for clean/available metadata.

## Upload Lifecycle

1. The browser calls `POST /api/files/presign-upload` with filename, MIME type,
   size, category, and optional project ID.
2. The backend resolves the authenticated client from DynamoDB and checks that
   the client status allows uploads.
3. The backend validates size, category, MIME value, filename, and blocked
   extensions.
4. The backend creates a DynamoDB file metadata record:

   ```text
   uploadStatus = pending
   scanStatus = pending
   storagePrefix = quarantine
   storageKey = quarantine/{clientId}/{fileId}/{safeFilename}
   ```

5. The backend returns a short-lived presigned S3 PUT URL.
6. The browser uploads directly to S3 using the returned URL and headers.
7. The browser calls `POST /api/files/{fileId}/complete`.
8. The backend verifies the file belongs to the authenticated client, checks S3
   with `HeadObject`, and marks the object uploaded while it waits for scan
   enforcement.
9. GuardDuty scans the new object and publishes a result to EventBridge.
10. The scan-result Lambda updates DynamoDB:
    - clean: `scanStatus=clean`, `uploadStatus=available`
    - threat: `scanStatus=infected`, `uploadStatus=blocked`
    - skipped/failed/unsupported/unknown: blocked or pending review

## Download Lifecycle

1. The browser calls `GET /api/files`.
2. The browser requests `GET /api/files/{fileId}/download-url` for a selected
   file.
3. The backend verifies the file record belongs to the authenticated client's
   partition.
4. The backend refuses deleted, quarantined, blocked, infected, failed,
   unsupported, or unscanned files.
5. The backend returns a short-lived presigned GET URL only for clean,
   available files.

## Soft Delete

`DELETE /api/files/{fileId}` marks metadata as deleted. The normal client path
does not hard-delete S3 objects.

## Browser CORS

The upload bucket CORS is for S3 PUT/GET/HEAD flows only. Do not add `PATCH` to
S3 bucket CORS; S3 does not support it.

Allowed origins should match the frontend origins configured in Terraform and
Auth0.

## Configuration

Relevant Terraform/runtime values:

```text
UPLOAD_BUCKET
MAX_UPLOAD_BYTES
client_portal_max_upload_bytes
client_portal_malware_scan_prefixes
client_portal_promote_scanned_files
client_portal_delete_quarantine_after_promotion
```

The default maximum upload size is 50 MB unless the environment overrides it.

## Safety Rules

- Never upload through Lambda.
- Never store file bytes in DynamoDB.
- Never issue download URLs for unclean files.
- Never trust frontend `clientId` values.
- Reject dangerous extensions unless a future internal-admin-only workflow
  explicitly allows them.
- Do not allow users to upload plaintext passwords or secrets.

For the detailed GuardDuty event workflow, see
`guardduty-file-scanning.md`.
