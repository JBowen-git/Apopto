# CloudWatch Observability

Phase 44 adds Terraform-managed CloudWatch retention and baseline alarms for the
client portal stack.

## Managed Logs

- Lambda log groups use `lambda_log_retention_days`.
- HTTP API Gateway access logs write to
  `/aws/apigateway/{resource_prefix}-api-access`.
- HTTP API access logs use `api_gateway_log_retention_days`.
- Access log format is structured JSON with request, route, status, latency, and
  integration error metadata. It does not log headers, tokens, cookies, request
  bodies, or response bodies.

## Managed Alarms

Terraform creates alarms when `cloudwatch_alarms_enabled = true`:

- Lambda `Errors` per function.
- Lambda `Duration` per function, using either
  `lambda_duration_alarm_threshold_ms` or a timeout-derived threshold from
  `lambda_duration_alarm_timeout_ratio`.
- HTTP API Gateway `5xx`.
- HTTP API Gateway `4xx`.
- HTTP API Gateway `Latency`.

Thresholds and evaluation windows are configurable through Terraform variables:

- `cloudwatch_alarm_period_seconds`
- `cloudwatch_alarm_evaluation_periods`
- `lambda_error_alarm_threshold`
- `lambda_duration_alarm_timeout_ratio`
- `lambda_duration_alarm_threshold_ms`
- `api_gateway_5xx_alarm_threshold`
- `api_gateway_4xx_alarm_threshold`
- `api_gateway_latency_alarm_threshold_ms`

## Deferred Notification Wiring

Alarm action lists are intentionally empty by default:

- `cloudwatch_alarm_actions`
- `cloudwatch_alarm_ok_actions`
- `cloudwatch_alarm_insufficient_data_actions`

This avoids hardcoding personal emails, phone numbers, or one-off notification
targets. A later phase can add an SNS topic, ChatOps integration, or incident
management destination and pass those action ARNs through environment tfvars.
