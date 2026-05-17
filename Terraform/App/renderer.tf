locals {
  site_renderer_asset_directory = trimspace(var.site_renderer_asset_root) != "" ? "${path.module}/${var.site_renderer_asset_root}" : null
  site_renderer_asset_files     = local.site_renderer_asset_directory != null ? fileset(local.site_renderer_asset_directory, "**") : toset([])

  site_renderer_prefix        = "internal/site-renderer"
  site_renderer_manifest_key  = "${local.site_renderer_prefix}/manifest.json"
  site_renderer_build_prefix  = "${local.site_renderer_prefix}/builds"
  site_renderer_state_key     = "${local.site_renderer_prefix}/state.json"
  site_renderer_manifest_file = local.site_renderer_asset_directory != null ? "${local.site_renderer_asset_directory}/site-renderer-manifest.json" : null
  site_renderer_manifest = local.site_renderer_manifest_file == null ? null : (
    fileexists(local.site_renderer_manifest_file)
    ? jsondecode(file(local.site_renderer_manifest_file))
    : null
  )
  site_renderer_build_id = try(local.site_renderer_manifest.buildId, null)
  site_renderer_runtime_files = local.site_renderer_build_id != null ? toset([
    for asset_file in local.site_renderer_asset_files : asset_file
    if asset_file != "site-renderer-manifest.json"
  ]) : toset([])
  site_renderer_site_origin = trimspace(var.frontend_site_origin) != "" ? trimsuffix(trimspace(var.frontend_site_origin), "/") : "https://${aws_cloudfront_distribution.website.domain_name}"
}

resource "aws_s3_object" "site_renderer_runtime_files" {
  for_each = local.site_renderer_runtime_files

  bucket        = aws_s3_bucket.website.id
  cache_control = "public, max-age=31536000, immutable"
  key           = "${local.site_renderer_build_prefix}/${local.site_renderer_build_id}/${each.value}"
  source        = "${local.site_renderer_asset_directory}/${each.value}"
  etag          = filemd5("${local.site_renderer_asset_directory}/${each.value}")
  content_type  = lookup(local.site_content_types, lower(element(reverse(split(".", each.value)), 0)), "application/octet-stream")
}

resource "aws_s3_object" "site_renderer_manifest" {
  for_each = local.site_renderer_build_id != null ? {
    manifest = local.site_renderer_manifest_file
  } : {}

  bucket        = aws_s3_bucket.website.id
  cache_control = "no-cache, no-store, must-revalidate"
  key           = local.site_renderer_manifest_key
  source        = each.value
  etag          = filemd5(each.value)
  content_type  = "application/json"
}

resource "aws_sqs_queue" "site_renderer_dlq" {
  name                      = "${local.resource_prefix}-site-renderer-dlq"
  message_retention_seconds = 604800
  receive_wait_time_seconds = 20
  sqs_managed_sse_enabled   = true

  tags = {
    Name = "${local.resource_prefix}-site-renderer-dlq"
  }
}

resource "aws_sqs_queue" "site_renderer" {
  name                       = "${local.resource_prefix}-site-renderer"
  message_retention_seconds  = 1209600
  visibility_timeout_seconds = 900
  receive_wait_time_seconds  = 20
  sqs_managed_sse_enabled    = true
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.site_renderer_dlq.arn
    maxReceiveCount     = 5
  })

  tags = {
    Name = "${local.resource_prefix}-site-renderer"
  }
}

resource "aws_cloudwatch_log_group" "site_renderer" {
  name              = "/aws/lambda/${local.resource_prefix}-site-renderer"
  retention_in_days = var.lambda_log_retention_days

  tags = {
    Name = "${local.resource_prefix}-site-renderer-logs"
  }
}

resource "aws_iam_role" "site_renderer" {
  name               = "${local.resource_prefix}-site-renderer-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "${local.resource_prefix}-site-renderer-role"
  }
}

resource "aws_iam_role_policy_attachment" "site_renderer_basic" {
  role       = aws_iam_role.site_renderer.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "site_renderer_sqs" {
  role       = aws_iam_role.site_renderer.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaSQSQueueExecutionRole"
}

data "aws_iam_policy_document" "site_renderer" {
  statement {
    sid    = "ManageRenderedSiteObjects"
    effect = "Allow"

    actions = [
      "s3:DeleteObject",
      "s3:GetObject",
      "s3:PutObject",
    ]

    resources = ["${aws_s3_bucket.website.arn}/*"]
  }

  statement {
    sid       = "InvalidateCloudFront"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [aws_cloudfront_distribution.website.arn]
  }
}

resource "aws_iam_role_policy" "site_renderer" {
  name   = "${local.resource_prefix}-site-renderer-policy"
  role   = aws_iam_role.site_renderer.id
  policy = data.aws_iam_policy_document.site_renderer.json
}

resource "aws_lambda_function" "site_renderer" {
  function_name    = "${local.resource_prefix}-site-renderer"
  description      = "${local.resource_prefix} static HTML renderer for crawler-visible pages."
  role             = aws_iam_role.site_renderer.arn
  handler          = "index.handler"
  runtime          = var.site_renderer_lambda_runtime
  filename         = var.site_renderer_lambda_zip_path
  source_code_hash = filebase64sha256(var.site_renderer_lambda_zip_path)
  memory_size      = var.site_renderer_lambda_memory_size
  timeout          = var.site_renderer_lambda_timeout

  environment {
    variables = {
      CLOUDFRONT_DISTRIBUTION_ID = aws_cloudfront_distribution.website.id
      SITE_BUCKET                = aws_s3_bucket.website.bucket
      SITE_ORIGIN                = local.site_renderer_site_origin
      SITE_RENDERER_BUILD_PREFIX = local.site_renderer_build_prefix
      SITE_RENDERER_MANIFEST_KEY = local.site_renderer_manifest_key
      SITE_RENDERER_STATE_KEY    = local.site_renderer_state_key
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.site_renderer,
    aws_iam_role_policy.site_renderer,
    aws_iam_role_policy_attachment.site_renderer_basic,
    aws_iam_role_policy_attachment.site_renderer_sqs,
    aws_s3_object.site_renderer_manifest,
    aws_s3_object.site_renderer_runtime_files,
  ]

  tags = {
    Name = "${local.resource_prefix}-site-renderer"
  }
}

resource "aws_lambda_event_source_mapping" "site_renderer" {
  event_source_arn                   = aws_sqs_queue.site_renderer.arn
  function_name                      = aws_lambda_function.site_renderer.arn
  batch_size                         = 1
  maximum_batching_window_in_seconds = 0
  function_response_types            = ["ReportBatchItemFailures"]
  enabled                            = true
}
