locals {
  client_portal_table_name = "ClientPortal-${var.deployment_environment}"
  client_portal_table_deletion_protection_enabled = (
    var.deployment_environment == "production" || !var.client_portal_table_allow_destroy
  )
  client_portal_upload_bucket_name = (
    trimspace(var.client_portal_upload_bucket_name) != ""
    ? trimspace(var.client_portal_upload_bucket_name)
    : "client-portal-uploads-${var.deployment_environment}-${data.aws_caller_identity.current.account_id}"
  )
  client_portal_upload_bucket_cors_allowed_origins = (
    length(var.client_portal_upload_bucket_cors_allowed_origins) > 0
    ? var.client_portal_upload_bucket_cors_allowed_origins
    : distinct(compact(concat(var.cors_allowed_origins, [trimspace(var.frontend_site_origin)])))
  )
  client_portal_table_index_arns = [
    "${aws_dynamodb_table.client_portal.arn}/index/GSI1",
    "${aws_dynamodb_table.client_portal.arn}/index/GSI2",
  ]
}

resource "aws_dynamodb_table" "client_portal" {
  name                        = local.client_portal_table_name
  billing_mode                = "PAY_PER_REQUEST"
  hash_key                    = "PK"
  range_key                   = "SK"
  deletion_protection_enabled = local.client_portal_table_deletion_protection_enabled

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    projection_type = "ALL"

    key_schema {
      attribute_name = "GSI1PK"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "GSI1SK"
      key_type       = "RANGE"
    }
  }

  global_secondary_index {
    name            = "GSI2"
    projection_type = "ALL"

    key_schema {
      attribute_name = "GSI2PK"
      key_type       = "HASH"
    }

    key_schema {
      attribute_name = "GSI2SK"
      key_type       = "RANGE"
    }
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name = local.client_portal_table_name
  }
}

resource "aws_iam_role" "identity_intake_lambda" {
  name               = "${local.resource_prefix}-identity-intake-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "${local.resource_prefix}-identity-intake-role"
  }
}

resource "aws_iam_role_policy_attachment" "identity_intake_lambda_basic" {
  role       = aws_iam_role.identity_intake_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "identity_intake_dynamodb" {
  statement {
    sid    = "ReadWriteClientPortalTable"
    effect = "Allow"

    actions = [
      "dynamodb:BatchGetItem",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:TransactWriteItems",
      "dynamodb:UpdateItem",
    ]

    resources = [aws_dynamodb_table.client_portal.arn]
  }

  statement {
    sid    = "QueryClientPortalIndexes"
    effect = "Allow"

    actions = [
      "dynamodb:Query",
    ]

    resources = local.client_portal_table_index_arns
  }
}

resource "aws_iam_role_policy" "identity_intake_dynamodb" {
  name   = "${local.resource_prefix}-identity-intake-dynamodb"
  role   = aws_iam_role.identity_intake_lambda.id
  policy = data.aws_iam_policy_document.identity_intake_dynamodb.json
}

resource "aws_iam_role" "admin_lambda" {
  name               = "${local.resource_prefix}-admin-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "${local.resource_prefix}-admin-role"
  }
}

resource "aws_iam_role_policy_attachment" "admin_lambda_basic" {
  role       = aws_iam_role.admin_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "admin_dynamodb" {
  statement {
    sid    = "ReadClientPortalAdminRecords"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:TransactWriteItems",
    ]

    resources = [aws_dynamodb_table.client_portal.arn]
  }

  statement {
    sid    = "QueryClientStatusIndex"
    effect = "Allow"

    actions = [
      "dynamodb:Query",
    ]

    resources = local.client_portal_table_index_arns
  }
}

resource "aws_iam_role_policy" "admin_dynamodb" {
  name   = "${local.resource_prefix}-admin-dynamodb"
  role   = aws_iam_role.admin_lambda.id
  policy = data.aws_iam_policy_document.admin_dynamodb.json
}

resource "aws_iam_role" "files_lambda" {
  name               = "${local.resource_prefix}-files-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "${local.resource_prefix}-files-role"
  }
}

resource "aws_iam_role_policy_attachment" "files_lambda_basic" {
  role       = aws_iam_role.files_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "files_s3" {
  statement {
    sid    = "ReadWriteClientPortalUploadObjects"
    effect = "Allow"

    actions = [
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:PutObject",
    ]

    resources = [
      "${aws_s3_bucket.client_portal_uploads.arn}/clean/*",
      "${aws_s3_bucket.client_portal_uploads.arn}/infected/*",
      "${aws_s3_bucket.client_portal_uploads.arn}/quarantine/*",
    ]
  }
}

resource "aws_iam_role_policy" "files_s3" {
  name   = "${local.resource_prefix}-files-s3"
  role   = aws_iam_role.files_lambda.id
  policy = data.aws_iam_policy_document.files_s3.json
}

data "aws_iam_policy_document" "files_dynamodb" {
  statement {
    sid    = "ReadWriteFileMetadata"
    effect = "Allow"

    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:TransactWriteItems",
    ]

    resources = [aws_dynamodb_table.client_portal.arn]
  }

  statement {
    sid    = "QueryTenantAndFileIndexes"
    effect = "Allow"

    actions = [
      "dynamodb:Query",
    ]

    resources = local.client_portal_table_index_arns
  }
}

resource "aws_iam_role_policy" "files_dynamodb" {
  name   = "${local.resource_prefix}-files-dynamodb"
  role   = aws_iam_role.files_lambda.id
  policy = data.aws_iam_policy_document.files_dynamodb.json
}

resource "aws_iam_role" "file_scan_result_lambda" {
  name               = "${local.resource_prefix}-file-scan-result-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "${local.resource_prefix}-file-scan-result-role"
  }
}

resource "aws_iam_role_policy_attachment" "file_scan_result_lambda_basic" {
  role       = aws_iam_role.file_scan_result_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "file_scan_result_lambda" {
  statement {
    sid    = "ReadAndMoveScannedUploadObjects"
    effect = "Allow"

    actions = [
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:GetObjectTagging",
      "s3:GetObjectVersion",
      "s3:GetObjectVersionTagging",
      "s3:PutObject",
      "s3:PutObjectTagging",
    ]

    resources = [
      "${aws_s3_bucket.client_portal_uploads.arn}/clean/*",
      "${aws_s3_bucket.client_portal_uploads.arn}/infected/*",
      "${aws_s3_bucket.client_portal_uploads.arn}/quarantine/*",
    ]
  }

  statement {
    sid    = "UpdateFileMetadataAndAudit"
    effect = "Allow"

    actions = [
      "dynamodb:Query",
      "dynamodb:TransactWriteItems",
    ]

    resources = [
      aws_dynamodb_table.client_portal.arn,
      "${aws_dynamodb_table.client_portal.arn}/index/GSI2",
    ]
  }
}

resource "aws_iam_role_policy" "file_scan_result_lambda" {
  name   = "${local.resource_prefix}-file-scan-result"
  role   = aws_iam_role.file_scan_result_lambda.id
  policy = data.aws_iam_policy_document.file_scan_result_lambda.json
}

data "aws_iam_policy_document" "guardduty_malware_protection_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["malware-protection-plan.guardduty.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

resource "aws_iam_role" "guardduty_malware_protection" {
  name               = "${local.resource_prefix}-guardduty-s3-malware-role"
  assume_role_policy = data.aws_iam_policy_document.guardduty_malware_protection_assume_role.json

  tags = {
    Name = "${local.resource_prefix}-guardduty-s3-malware-role"
  }
}

data "aws_iam_policy_document" "guardduty_malware_protection" {
  statement {
    sid    = "AllowManagedRuleToSendS3EventsToGuardDuty"
    effect = "Allow"

    actions = [
      "events:DeleteRule",
      "events:PutRule",
      "events:PutTargets",
      "events:RemoveTargets",
    ]

    resources = [
      "arn:aws:events:${var.aws_region}:${data.aws_caller_identity.current.account_id}:rule/DO-NOT-DELETE-AmazonGuardDutyMalwareProtectionS3*",
    ]

    condition {
      test     = "StringLike"
      variable = "events:ManagedBy"
      values   = ["malware-protection-plan.guardduty.amazonaws.com"]
    }
  }

  statement {
    sid    = "AllowGuardDutyToMonitorEventBridgeManagedRule"
    effect = "Allow"

    actions = [
      "events:DescribeRule",
      "events:ListTargetsByRule",
    ]

    resources = [
      "arn:aws:events:${var.aws_region}:${data.aws_caller_identity.current.account_id}:rule/DO-NOT-DELETE-AmazonGuardDutyMalwareProtectionS3*",
    ]
  }

  statement {
    sid    = "AllowPostScanTag"
    effect = "Allow"

    actions = [
      "s3:GetObjectTagging",
      "s3:GetObjectVersionTagging",
      "s3:PutObjectTagging",
      "s3:PutObjectVersionTagging",
    ]

    resources = [
      for prefix in var.client_portal_malware_scan_prefixes :
      "${aws_s3_bucket.client_portal_uploads.arn}/${prefix}*"
    ]
  }

  statement {
    sid    = "AllowEnableS3EventBridgeEvents"
    effect = "Allow"

    actions = [
      "s3:GetBucketNotification",
      "s3:PutBucketNotification",
    ]

    resources = [aws_s3_bucket.client_portal_uploads.arn]
  }

  statement {
    sid    = "AllowPutValidationObject"
    effect = "Allow"

    actions = ["s3:PutObject"]

    resources = [
      "${aws_s3_bucket.client_portal_uploads.arn}/malware-protection-resource-validation-object",
    ]
  }

  statement {
    sid    = "AllowCheckBucketOwnership"
    effect = "Allow"

    actions = ["s3:ListBucket"]

    resources = [aws_s3_bucket.client_portal_uploads.arn]
  }

  statement {
    sid    = "AllowMalwareScan"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
    ]

    resources = [
      for prefix in var.client_portal_malware_scan_prefixes :
      "${aws_s3_bucket.client_portal_uploads.arn}/${prefix}*"
    ]
  }
}

resource "aws_iam_role_policy" "guardduty_malware_protection" {
  name   = "${local.resource_prefix}-guardduty-s3-malware"
  role   = aws_iam_role.guardduty_malware_protection.id
  policy = data.aws_iam_policy_document.guardduty_malware_protection.json
}

resource "aws_guardduty_malware_protection_plan" "client_portal_uploads" {
  role = aws_iam_role.guardduty_malware_protection.arn

  protected_resource {
    s3_bucket {
      bucket_name     = aws_s3_bucket.client_portal_uploads.id
      object_prefixes = var.client_portal_malware_scan_prefixes
    }
  }

  actions {
    tagging {
      status = "ENABLED"
    }
  }

  tags = {
    Name = "${local.resource_prefix}-client-portal-upload-malware-protection"
  }

  depends_on = [
    aws_iam_role_policy.guardduty_malware_protection,
    aws_s3_bucket_policy.client_portal_uploads,
  ]
}

resource "aws_s3_bucket" "client_portal_uploads" {
  bucket        = local.client_portal_upload_bucket_name
  force_destroy = false

  tags = {
    Name = local.client_portal_upload_bucket_name
  }
}

resource "aws_s3_bucket_public_access_block" "client_portal_uploads" {
  bucket = aws_s3_bucket.client_portal_uploads.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "client_portal_uploads" {
  bucket = aws_s3_bucket.client_portal_uploads.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "client_portal_uploads" {
  bucket = aws_s3_bucket.client_portal_uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "client_portal_uploads" {
  bucket = aws_s3_bucket.client_portal_uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "client_portal_uploads" {
  bucket = aws_s3_bucket.client_portal_uploads.id

  rule {
    id     = "abort-incomplete-multipart-uploads"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = var.client_portal_upload_incomplete_multipart_days
    }
  }
}

resource "aws_s3_bucket_cors_configuration" "client_portal_uploads" {
  bucket = aws_s3_bucket.client_portal_uploads.id

  cors_rule {
    allowed_headers = var.cors_allowed_headers
    allowed_methods = var.client_portal_upload_bucket_cors_allowed_methods
    allowed_origins = local.client_portal_upload_bucket_cors_allowed_origins
    expose_headers  = var.cors_expose_headers
    max_age_seconds = var.cors_max_age
  }
}

data "aws_iam_policy_document" "client_portal_uploads_bucket" {
  statement {
    sid    = "DenyInsecureTransport"
    effect = "Deny"

    actions = ["s3:*"]

    resources = [
      aws_s3_bucket.client_portal_uploads.arn,
      "${aws_s3_bucket.client_portal_uploads.arn}/*",
    ]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }

  statement {
    sid    = "DenyQuarantineReadExceptScanAndVerification"
    effect = "Deny"

    not_principals {
      type = "AWS"
      identifiers = [
        aws_iam_role.file_scan_result_lambda.arn,
        aws_iam_role.files_lambda.arn,
        aws_iam_role.guardduty_malware_protection.arn,
      ]
    }

    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
    ]

    resources = ["${aws_s3_bucket.client_portal_uploads.arn}/quarantine/*"]
  }

  statement {
    sid    = "DenyFinalReadUnlessGuardDutyClean"
    effect = "Deny"

    not_principals {
      type = "AWS"
      identifiers = [
        aws_iam_role.file_scan_result_lambda.arn,
        aws_iam_role.guardduty_malware_protection.arn,
      ]
    }

    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
    ]

    resources = [
      "${aws_s3_bucket.client_portal_uploads.arn}/clean/*",
      "${aws_s3_bucket.client_portal_uploads.arn}/infected/*",
    ]

    condition {
      test     = "StringNotEquals"
      variable = "s3:ExistingObjectTag/GuardDutyMalwareScanStatus"
      values   = ["NO_THREATS_FOUND"]
    }
  }

  statement {
    sid    = "OnlyGuardDutyCanWriteScanStatusTag"
    effect = "Deny"

    not_principals {
      type = "AWS"
      identifiers = [
        aws_iam_role.file_scan_result_lambda.arn,
        aws_iam_role.guardduty_malware_protection.arn,
      ]
    }

    actions = [
      "s3:PutObjectTagging",
      "s3:PutObjectVersionTagging",
    ]

    resources = ["${aws_s3_bucket.client_portal_uploads.arn}/*"]

    condition {
      test     = "ForAnyValue:StringEquals"
      variable = "s3:RequestObjectTagKeys"
      values   = ["GuardDutyMalwareScanStatus"]
    }
  }
}

resource "aws_s3_bucket_policy" "client_portal_uploads" {
  bucket = aws_s3_bucket.client_portal_uploads.id
  policy = data.aws_iam_policy_document.client_portal_uploads_bucket.json
}
