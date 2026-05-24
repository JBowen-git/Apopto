locals {
  lambda_alarm_targets = {
    health = {
      function_name   = "${local.resource_prefix}-health"
      timeout_seconds = var.lambda_timeout
    }
    identity_intake = {
      function_name   = "${local.resource_prefix}-auth-placeholder"
      timeout_seconds = var.lambda_timeout
    }
    admin = {
      function_name   = "${local.resource_prefix}-admin"
      timeout_seconds = var.lambda_timeout
    }
    files = {
      function_name   = "${local.resource_prefix}-files"
      timeout_seconds = var.lambda_timeout
    }
    messages = {
      function_name   = "${local.resource_prefix}-messages"
      timeout_seconds = var.lambda_timeout
    }
    billing = {
      function_name   = "${local.resource_prefix}-billing"
      timeout_seconds = var.lambda_timeout
    }
    file_scan_result = {
      function_name   = "${local.resource_prefix}-file-scan-result"
      timeout_seconds = var.lambda_timeout
    }
    site_renderer = {
      function_name   = "${local.resource_prefix}-site-renderer"
      timeout_seconds = var.site_renderer_lambda_timeout
    }
  }

  api_gateway_alarm_dimensions = {
    ApiId = aws_apigatewayv2_api.app.id
    Stage = aws_apigatewayv2_stage.default.name
  }
}

resource "aws_cloudwatch_log_group" "api_gateway_access" {
  name              = "/aws/apigateway/${local.resource_prefix}-api-access"
  retention_in_days = var.api_gateway_log_retention_days

  tags = {
    Name = "${local.resource_prefix}-api-access-logs"
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = var.cloudwatch_alarms_enabled ? local.lambda_alarm_targets : {}

  alarm_name          = "${local.resource_prefix}-${replace(each.key, "_", "-")}-lambda-errors"
  alarm_description   = "Lambda ${each.value.function_name} reported errors."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.cloudwatch_alarm_evaluation_periods
  threshold           = var.lambda_error_alarm_threshold
  treat_missing_data  = "notBreaching"

  namespace   = "AWS/Lambda"
  metric_name = "Errors"
  period      = var.cloudwatch_alarm_period_seconds
  statistic   = "Sum"

  dimensions = {
    FunctionName = each.value.function_name
  }

  alarm_actions             = var.cloudwatch_alarm_actions
  ok_actions                = var.cloudwatch_alarm_ok_actions
  insufficient_data_actions = var.cloudwatch_alarm_insufficient_data_actions

  tags = {
    Name = "${local.resource_prefix}-${replace(each.key, "_", "-")}-lambda-errors"
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_high_duration" {
  for_each = var.cloudwatch_alarms_enabled ? local.lambda_alarm_targets : {}

  alarm_name          = "${local.resource_prefix}-${replace(each.key, "_", "-")}-lambda-high-duration"
  alarm_description   = "Lambda ${each.value.function_name} is approaching its configured timeout."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.cloudwatch_alarm_evaluation_periods
  threshold = (
    var.lambda_duration_alarm_threshold_ms > 0
    ? var.lambda_duration_alarm_threshold_ms
    : each.value.timeout_seconds * 1000 * var.lambda_duration_alarm_timeout_ratio
  )
  treat_missing_data = "notBreaching"

  namespace   = "AWS/Lambda"
  metric_name = "Duration"
  period      = var.cloudwatch_alarm_period_seconds
  statistic   = "Maximum"
  unit        = "Milliseconds"

  dimensions = {
    FunctionName = each.value.function_name
  }

  alarm_actions             = var.cloudwatch_alarm_actions
  ok_actions                = var.cloudwatch_alarm_ok_actions
  insufficient_data_actions = var.cloudwatch_alarm_insufficient_data_actions

  tags = {
    Name = "${local.resource_prefix}-${replace(each.key, "_", "-")}-lambda-high-duration"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_5xx" {
  count = var.cloudwatch_alarms_enabled ? 1 : 0

  alarm_name          = "${local.resource_prefix}-api-5xx"
  alarm_description   = "HTTP API Gateway is returning 5xx responses."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.cloudwatch_alarm_evaluation_periods
  threshold           = var.api_gateway_5xx_alarm_threshold
  treat_missing_data  = "notBreaching"

  namespace   = "AWS/ApiGateway"
  metric_name = "5xx"
  period      = var.cloudwatch_alarm_period_seconds
  statistic   = "Sum"

  dimensions = local.api_gateway_alarm_dimensions

  alarm_actions             = var.cloudwatch_alarm_actions
  ok_actions                = var.cloudwatch_alarm_ok_actions
  insufficient_data_actions = var.cloudwatch_alarm_insufficient_data_actions

  tags = {
    Name = "${local.resource_prefix}-api-5xx"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_4xx" {
  count = var.cloudwatch_alarms_enabled ? 1 : 0

  alarm_name          = "${local.resource_prefix}-api-4xx"
  alarm_description   = "HTTP API Gateway is returning elevated 4xx responses."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.cloudwatch_alarm_evaluation_periods
  threshold           = var.api_gateway_4xx_alarm_threshold
  treat_missing_data  = "notBreaching"

  namespace   = "AWS/ApiGateway"
  metric_name = "4xx"
  period      = var.cloudwatch_alarm_period_seconds
  statistic   = "Sum"

  dimensions = local.api_gateway_alarm_dimensions

  alarm_actions             = var.cloudwatch_alarm_actions
  ok_actions                = var.cloudwatch_alarm_ok_actions
  insufficient_data_actions = var.cloudwatch_alarm_insufficient_data_actions

  tags = {
    Name = "${local.resource_prefix}-api-4xx"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_latency" {
  count = var.cloudwatch_alarms_enabled ? 1 : 0

  alarm_name          = "${local.resource_prefix}-api-latency"
  alarm_description   = "HTTP API Gateway average latency is elevated."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.cloudwatch_alarm_evaluation_periods
  threshold           = var.api_gateway_latency_alarm_threshold_ms
  treat_missing_data  = "notBreaching"

  namespace   = "AWS/ApiGateway"
  metric_name = "Latency"
  period      = var.cloudwatch_alarm_period_seconds
  statistic   = "Average"
  unit        = "Milliseconds"

  dimensions = local.api_gateway_alarm_dimensions

  alarm_actions             = var.cloudwatch_alarm_actions
  ok_actions                = var.cloudwatch_alarm_ok_actions
  insufficient_data_actions = var.cloudwatch_alarm_insufficient_data_actions

  tags = {
    Name = "${local.resource_prefix}-api-latency"
  }
}
