# GuardDuty File Scanning Workflow

Phase 34.5 added the malware-scanning enforcement layer for client portal
uploads. Later file phases now presign uploads into the quarantine prefix and
block downloads until scan metadata is clean.

## Storage Prefixes

Client uploads must start in the quarantine prefix:

```text
quarantine/{clientId}/{fileId}/{safeFilename}
```

GuardDuty Malware Protection for S3 is scoped to the configured scan prefixes, defaulting to:

```text
quarantine/
```

The scan-result Lambda promotes scanned objects after GuardDuty publishes an EventBridge result:

```text
clean/{clientId}/{fileId}/{safeFilename}
infected/{clientId}/{fileId}/{safeFilename}
```

`PROMOTE_SCANNED_FILES=false` can disable the physical S3 copy/delete behavior if an environment needs metadata-only testing.

## Metadata Lifecycle

New file metadata starts as:

```text
uploadStatus = pending
scanStatus = pending
storagePrefix = quarantine
storageKey = quarantine/{clientId}/{fileId}/{safeFilename}
```

GuardDuty result handling maps statuses as follows:

```text
NO_THREATS_FOUND -> scanStatus=clean, uploadStatus=available, storagePrefix=clean
THREATS_FOUND    -> scanStatus=infected, uploadStatus=blocked, storagePrefix=infected
UNSUPPORTED      -> scanStatus=unsupported, uploadStatus=pending_review
ACCESS_DENIED    -> scanStatus=failed, uploadStatus=blocked
FAILED           -> scanStatus=failed, uploadStatus=blocked
unknown result   -> scanStatus=unknown, uploadStatus=pending_review
```

Download endpoints must issue URLs only when metadata is `scanStatus=clean` and
`uploadStatus=available`.

## GuardDuty Integration

Terraform creates:

- A GuardDuty Malware Protection plan for the private upload bucket.
- A GuardDuty service role with scoped access to `quarantine/`.
- GuardDuty object tagging enabled for `GuardDutyMalwareScanStatus`.
- An EventBridge rule for `GuardDuty Malware Protection Object Scan Result`.
- A scan-result Lambda that updates DynamoDB metadata and writes audit events.

The S3 bucket policy denies object reads unless the object has:

```text
GuardDutyMalwareScanStatus=NO_THREATS_FOUND
```

The GuardDuty role and scan-result Lambda role are exempt so GuardDuty can scan and the Lambda can promote/quarantine objects.

## Terraform Review

GuardDuty, EventBridge, S3 bucket policy, and scan-result Lambda changes are
infrastructure-sensitive. Produce and review a Terraform plan before apply.
