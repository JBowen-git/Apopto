resource "aws_wafv2_web_acl" "cloudfront_api_rate_limit" {
  count    = var.cloudfront_waf_rate_limiting_enabled ? 1 : 0
  provider = aws.global

  name        = "${local.resource_prefix}-cloudfront-api-rate-limit"
  description = "Optional CloudFront WAF rate limits for ${local.resource_prefix} /api/* routes."
  scope       = "CLOUDFRONT"

  default_action {
    allow {}
  }

  dynamic "rule" {
    for_each = var.cloudfront_waf_upload_presign_rate_limit > 0 ? [1] : []

    content {
      name     = "RateLimitUploadPresign"
      priority = 10

      action {
        dynamic "block" {
          for_each = var.cloudfront_waf_rate_limit_action == "block" ? [1] : []
          content {}
        }

        dynamic "count" {
          for_each = var.cloudfront_waf_rate_limit_action == "count" ? [1] : []
          content {}
        }
      }

      statement {
        rate_based_statement {
          aggregate_key_type = "IP"
          limit              = var.cloudfront_waf_upload_presign_rate_limit

          scope_down_statement {
            byte_match_statement {
              positional_constraint = "EXACTLY"
              search_string         = "/api/files/presign-upload"

              field_to_match {
                uri_path {}
              }

              text_transformation {
                priority = 0
                type     = "NONE"
              }
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${local.resource_prefix}-upload-presign-rate-limit"
        sampled_requests_enabled   = true
      }
    }
  }

  dynamic "rule" {
    for_each = var.cloudfront_waf_messages_rate_limit > 0 ? [1] : []

    content {
      name     = "RateLimitMessages"
      priority = 20

      action {
        dynamic "block" {
          for_each = var.cloudfront_waf_rate_limit_action == "block" ? [1] : []
          content {}
        }

        dynamic "count" {
          for_each = var.cloudfront_waf_rate_limit_action == "count" ? [1] : []
          content {}
        }
      }

      statement {
        rate_based_statement {
          aggregate_key_type = "IP"
          limit              = var.cloudfront_waf_messages_rate_limit

          scope_down_statement {
            byte_match_statement {
              positional_constraint = "STARTS_WITH"
              search_string         = "/api/threads"

              field_to_match {
                uri_path {}
              }

              text_transformation {
                priority = 0
                type     = "NONE"
              }
            }
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${local.resource_prefix}-messages-rate-limit"
        sampled_requests_enabled   = true
      }
    }
  }

  rule {
    name     = "RateLimitApi"
    priority = 100

    action {
      dynamic "block" {
        for_each = var.cloudfront_waf_rate_limit_action == "block" ? [1] : []
        content {}
      }

      dynamic "count" {
        for_each = var.cloudfront_waf_rate_limit_action == "count" ? [1] : []
        content {}
      }
    }

    statement {
      rate_based_statement {
        aggregate_key_type = "IP"
        limit              = var.cloudfront_waf_api_rate_limit

        scope_down_statement {
          byte_match_statement {
            positional_constraint = "STARTS_WITH"
            search_string         = "/api/"

            field_to_match {
              uri_path {}
            }

            text_transformation {
              priority = 0
              type     = "NONE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.resource_prefix}-api-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.resource_prefix}-cloudfront-api-rate-limit"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "${local.resource_prefix}-cloudfront-api-rate-limit"
  }
}
