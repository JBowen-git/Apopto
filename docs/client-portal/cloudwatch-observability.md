# CloudWatch Observability

Phase 44 adds Terraform-managed CloudWatch retention and optional alarms for
the client portal stack.

## Managed Logs

- Lambda log groups use `lambda_log_retention_days`.
- HTTP API Gateway access logs write to
  `/aws/apigateway/{resource_prefix}-api-access`.
- HTTP API access logs use `api_gateway_log_retention_days`.
- Access log format is structured JSON with request, route, status, latency, and
  integration error metadata. It does not log headers, tokens, cookies, request
  bodies, or response bodies.

## Optional Alarms

CloudWatch metric alarms are paid resources, so Terraform creates no metric
alarms by default. To create alarms, set `cloudwatch_alarms_enabled = true` and
list the exact alarm targets needed:

```hcl
cloudwatch_alarms_enabled = true

cloudwatch_api_alarm_types = ["5xx"]

cloudwatch_lambda_error_alarm_targets    = ["health", "identity_intake"]
cloudwatch_lambda_duration_alarm_targets = []
```

Supported alarm types:

- Lambda `Errors` for each function listed in
  `cloudwatch_lambda_error_alarm_targets`.
- Lambda `Duration` for each function listed in
  `cloudwatch_lambda_duration_alarm_targets`, using either
  `lambda_duration_alarm_threshold_ms` or a timeout-derived threshold from
  `lambda_duration_alarm_timeout_ratio`.
- HTTP API Gateway `5xx`, `4xx`, and `latency`, selected with
  `cloudwatch_api_alarm_types`.

Thresholds and evaluation windows are configurable through Terraform variables:

- `cloudwatch_alarm_period_seconds`
- `cloudwatch_alarm_evaluation_periods`
- `lambda_error_alarm_threshold`
- `lambda_duration_alarm_timeout_ratio`
- `lambda_duration_alarm_threshold_ms`
- `api_gateway_5xx_alarm_threshold`
- `api_gateway_4xx_alarm_threshold`
- `api_gateway_latency_alarm_threshold_ms`

## Deferred Alarm IAM And Notification Wiring

Alarm action lists are intentionally empty by default:

- `cloudwatch_alarm_actions`
- `cloudwatch_alarm_ok_actions`
- `cloudwatch_alarm_insufficient_data_actions`

This avoids hardcoding personal emails, phone numbers, or one-off notification
targets. A later phase can add an SNS topic, ChatOps integration, or incident
management destination and pass those action ARNs through environment tfvars.

GitHub deployments also need CloudWatch alarm permissions before paid alarms are
enabled, including `cloudwatch:PutMetricAlarm`, `cloudwatch:DeleteAlarms`, and
`cloudwatch:DescribeAlarms`. Depending on provider tagging behavior, alarm
tagging may also require `cloudwatch:TagResource` and
`cloudwatch:UntagResource`.
