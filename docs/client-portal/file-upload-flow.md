# Client Portal File Upload Foundation

Phase 32 adds the private S3 storage foundation for future client portal uploads. It does not add presigned URL handlers, frontend upload UI, Lambda IAM access, or file metadata writes yet.

## Bucket

The default bucket name is:

```text
client-portal-uploads-{deployment_environment}-{aws_account_id}
```

For staging in account `543035741420`, that resolves to:

```text
client-portal-uploads-staging-543035741420
```

The name can be overridden with `client_portal_upload_bucket_name` if a future environment needs an exact bucket name.

## Security Defaults

The bucket is private by default:

- S3 block public access is enabled.
- ACLs are disabled with `BucketOwnerEnforced` object ownership.
- Server-side encryption is enabled with `AES256`.
- Versioning is enabled.
- A bucket policy denies all non-SSL requests with `aws:SecureTransport = false`.
- `force_destroy` is false so Terraform will not delete a non-empty bucket during normal destroys.

## Browser CORS

The upload bucket has browser CORS configured for future presigned PUT/GET/HEAD flows. Allowed origins default to `cors_allowed_origins` plus `frontend_site_origin` when that value is set. Environments can override the list with `client_portal_upload_bucket_cors_allowed_origins`.

Allowed methods default to:

```text
GET, HEAD, PUT
```

The bucket exposes `ETag` so the browser can read upload response metadata after a direct S3 PUT.

## Lifecycle Cleanup

Incomplete multipart uploads are aborted after `client_portal_upload_incomplete_multipart_days`, defaulting to 7 days. Client files and completed object versions are not expired in this phase.

## Future Wiring

Phase 33 adds the files Lambda infrastructure wiring without enabling file API behavior:

- Files handler Lambda: `{resource_prefix}-files`
- Environment variables:
  - `UPLOAD_BUCKET`
  - `MAX_UPLOAD_BYTES`
  - `APP_ENVIRONMENT`
  - `PORTAL_HANDLER_GROUP=files`
- IAM object permissions scoped to:

```text
arn:aws:s3:::{upload_bucket}/clients/*
```

The files handler role receives only:

- `s3:PutObject`
- `s3:GetObject`
- `s3:DeleteObject`

AWS authorizes `HeadObject` through `s3:GetObject`, so there is no separate `s3:HeadObject` IAM action.

Phase 34.5 adds the GuardDuty malware-scanning workflow. Future browser uploads must land only in:

```text
quarantine/{clientId}/{fileId}/{safeFilename}
```

GuardDuty scans the `quarantine/` prefix and the scan-result Lambda promotes objects to:

```text
clean/{clientId}/{fileId}/{safeFilename}
infected/{clientId}/{fileId}/{safeFilename}
```

For the detailed workflow, see `docs/client-portal/guardduty-file-scanning.md`.

Later upload phases should:

- Generate short-lived presigned PUT and GET URLs server-side.
- Store file metadata in DynamoDB, not object bodies.
- Issue download URLs only for files with `scanStatus=clean` and `uploadStatus=available`.
- Keep client tenant resolution server-side and never trust a frontend `clientId`.
