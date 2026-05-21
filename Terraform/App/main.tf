locals {
  resource_prefix     = trimspace(var.resource_prefix) != "" ? trimspace(var.resource_prefix) : "${var.client_slug}-${var.deployment_environment}"
  website_bucket_name = "${local.resource_prefix}-${data.aws_caller_identity.current.account_id}-website"

  default_tags = merge(
    {
      Client      = var.client_slug
      Environment = var.deployment_environment
      ManagedBy   = "Terraform"
    },
    var.tags,
  )

  website_origin_id = "${local.resource_prefix}-website-s3"
  api_origin_id     = "${local.resource_prefix}-api-gateway"
  auth0_domain      = trimspace(var.auth0_domain)
  auth0_issuer      = "https://${local.auth0_domain}/"

  site_asset_directory = "${path.module}/${var.site_asset_root}"
  site_asset_files     = fileset(local.site_asset_directory, "**")

  site_content_types = {
    css   = "text/css"
    gif   = "image/gif"
    html  = "text/html"
    ico   = "image/x-icon"
    jpeg  = "image/jpeg"
    jpg   = "image/jpeg"
    js    = "text/javascript"
    json  = "application/json"
    map   = "application/json"
    png   = "image/png"
    svg   = "image/svg+xml"
    txt   = "text/plain"
    webp  = "image/webp"
    woff  = "font/woff"
    woff2 = "font/woff2"
    xml   = "application/xml"
  }
}

data "aws_caller_identity" "current" {}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host_header" {
  name = "Managed-AllViewerExceptHostHeader"
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

data "aws_iam_policy_document" "website_bucket" {
  policy_id = "PolicyForCloudFrontPrivateContent"

  statement {
    sid    = "AllowCloudFrontServicePrincipal"
    effect = "Allow"

    actions = ["s3:GetObject"]

    resources = ["${aws_s3_bucket.website.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "ArnLike"
      variable = "AWS:SourceArn"
      values   = ["arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${aws_cloudfront_distribution.website.id}"]
    }
  }
}

resource "aws_s3_bucket" "website" {
  bucket = local.website_bucket_name

  tags = {
    Name = local.website_bucket_name
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_cors_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  cors_rule {
    allowed_headers = var.cors_allowed_headers
    allowed_methods = var.cors_allowed_methods
    allowed_origins = var.cors_allowed_origins
    expose_headers  = var.cors_expose_headers
    max_age_seconds = var.cors_max_age
  }
}

resource "aws_s3_object" "site_files" {
  for_each = local.site_asset_files

  bucket = aws_s3_bucket.website.id
  key    = each.value
  source = "${local.site_asset_directory}/${each.value}"
  etag   = filemd5("${local.site_asset_directory}/${each.value}")
  cache_control = endswith(lower(each.value), ".html") || startswith(each.value, "internal/") ? "no-cache, no-store, must-revalidate" : (
    startswith(each.value, "assets/") || startswith(each.value, "fonts/")
    ? "public, max-age=31536000, immutable"
    : "public, max-age=300, stale-while-revalidate=3600"
  )
  content_type = lookup(local.site_content_types, lower(element(reverse(split(".", each.value)), 0)), "application/octet-stream")
}

resource "aws_iam_role" "health_lambda" {
  name               = "${local.resource_prefix}-health-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "${local.resource_prefix}-health-role"
  }
}

resource "aws_iam_role_policy_attachment" "health_lambda_basic" {
  role       = aws_iam_role.health_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_cloudwatch_log_group" "health_lambda" {
  name              = "/aws/lambda/${local.resource_prefix}-health"
  retention_in_days = var.lambda_log_retention_days

  tags = {
    Name = "${local.resource_prefix}-health-logs"
  }
}

resource "aws_cloudwatch_log_group" "auth_placeholder_lambda" {
  name              = "/aws/lambda/${local.resource_prefix}-auth-placeholder"
  retention_in_days = var.lambda_log_retention_days

  tags = {
    Name = "${local.resource_prefix}-auth-placeholder-logs"
  }
}

resource "aws_lambda_function" "health" {
  function_name    = "${local.resource_prefix}-health"
  description      = "${local.resource_prefix} health check Lambda."
  role             = aws_iam_role.health_lambda.arn
  handler          = var.lambda_handler
  runtime          = var.lambda_runtime
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout

  environment {
    variables = {
      APP_ENVIRONMENT = var.deployment_environment
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.health_lambda,
    aws_iam_role_policy_attachment.health_lambda_basic,
  ]

  tags = {
    Name = "${local.resource_prefix}-health"
  }
}

resource "aws_lambda_function" "auth_placeholder" {
  function_name    = "${local.resource_prefix}-auth-placeholder"
  description      = "${local.resource_prefix} protected Auth0 placeholder Lambda."
  role             = aws_iam_role.identity_intake_lambda.arn
  handler          = "handlers/identityIntake.handler"
  runtime          = var.lambda_runtime
  filename         = var.lambda_zip_path
  source_code_hash = filebase64sha256(var.lambda_zip_path)
  memory_size      = var.lambda_memory_size
  timeout          = var.lambda_timeout

  environment {
    variables = {
      APP_ENVIRONMENT      = var.deployment_environment
      CLIENT_PORTAL_TABLE  = aws_dynamodb_table.client_portal.name
      PORTAL_HANDLER_GROUP = "identityIntake"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.auth_placeholder_lambda,
    aws_iam_role_policy.identity_intake_dynamodb,
    aws_iam_role_policy_attachment.identity_intake_lambda_basic,
  ]

  tags = {
    Name = "${local.resource_prefix}-auth-placeholder"
  }
}

resource "aws_apigatewayv2_api" "app" {
  name          = "${local.resource_prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers  = var.cors_allowed_headers
    allow_methods  = var.cors_allowed_methods
    allow_origins  = var.cors_allowed_origins
    expose_headers = var.cors_expose_headers
    max_age        = var.cors_max_age
  }

  tags = {
    Name = "${local.resource_prefix}-api"
  }
}

resource "aws_apigatewayv2_authorizer" "auth0" {
  api_id           = aws_apigatewayv2_api.app.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${local.resource_prefix}-auth0-jwt"

  jwt_configuration {
    audience = [var.auth0_audience]
    issuer   = local.auth0_issuer
  }
}

resource "aws_apigatewayv2_integration" "health" {
  api_id                 = aws_apigatewayv2_api.app.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.health.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "auth_placeholder" {
  api_id                 = aws_apigatewayv2_api.app.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.auth_placeholder.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.app.id
  route_key = "GET /api/health"
  target    = "integrations/${aws_apigatewayv2_integration.health.id}"
}

resource "aws_apigatewayv2_route" "auth_placeholder" {
  api_id               = aws_apigatewayv2_api.app.id
  authorization_scopes = var.auth0_placeholder_route_scopes
  authorization_type   = "JWT"
  authorizer_id        = aws_apigatewayv2_authorizer.auth0.id
  route_key            = "GET /api/_auth-placeholder"
  target               = "integrations/${aws_apigatewayv2_integration.auth_placeholder.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.app.id
  name        = "$default"
  auto_deploy = true

  tags = {
    Name = "${local.resource_prefix}-api-default-stage"
  }
}

resource "aws_lambda_permission" "allow_api_gateway_health" {
  statement_id  = "AllowExecutionFromApiGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.health.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.app.execution_arn}/*/*"
}

resource "aws_lambda_permission" "allow_api_gateway_auth_placeholder" {
  statement_id  = "AllowExecutionFromApiGatewayAuthPlaceholder"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_placeholder.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.app.execution_arn}/*/*"
}

resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${local.resource_prefix}-website-oac"
  description                       = "Origin access control for ${local.resource_prefix} website bucket."
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "site_directory_index" {
  name    = "${local.resource_prefix}-site-directory-index"
  runtime = "cloudfront-js-2.0"
  comment = "Routes prerendered pages to index documents and blocks private internal objects."
  publish = true
  code    = file("${path.module}/functions/site-directory-index.js")
}

resource "aws_cloudfront_distribution" "website" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront distribution serving ${local.resource_prefix} frontend and API."
  default_root_object = "index.html"
  # CloudFront Free pricing plans reject explicit price class settings.
  http_version = "http2"

  origin {
    origin_id   = local.api_origin_id
    domain_name = replace(aws_apigatewayv2_api.app.api_endpoint, "https://", "")

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_read_timeout    = 30
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  origin {
    origin_id                = local.website_origin_id
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  default_cache_behavior {
    target_origin_id       = local.website_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.site_directory_index.arn
    }
  }

  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = local.api_origin_id
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD", "OPTIONS"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host_header.id
    compress                 = true
  }

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  lifecycle {
    # CloudFront's flat-rate pricing plan attaches and requires a Web ACL.
    # Leave that association in place when Terraform updates the distribution.
    ignore_changes = [web_acl_id]
  }

  tags = {
    Name = "${local.resource_prefix}-cloudfront"
  }
}

resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id
  policy = data.aws_iam_policy_document.website_bucket.json
}
