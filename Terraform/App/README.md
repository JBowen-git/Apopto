# App Terraform

This root is applied once per environment using the Xavier-style deployment
pattern:

- `backends/staging.hcl` with `environments/staging.tfvars`
- `backends/production.hcl` with `environments/production.tfvars`

Each apply creates one complete environment:

- Private S3 website bucket.
- Terraform-managed frontend/SSR site objects.
- CloudFront distribution using Origin Access Control.
- CloudFront Function for prerendered route directory indexes.
- HTTP API Gateway.
- Node.js health check Lambda at `GET /api/health`.
- Auth0 JWT authorizer with a protected placeholder route at
  `GET /api/_auth-placeholder`.
- Node.js site renderer Lambda triggered through SQS after deploys to refresh
  crawler-visible HTML and SEO files.

Resource names follow:

```text
{client_slug}-{deployment_environment}-{resource}
```

## Usage

Bootstrap must run first so the state bucket and GitHub deploy roles exist.

Copy and edit the examples:

```bash
cp backends/staging.hcl.example backends/staging.hcl
cp backends/production.hcl.example backends/production.hcl
cp environments/staging.tfvars.example environments/staging.tfvars
cp environments/production.tfvars.example environments/production.tfvars
```

Run staging:

```bash
terraform init -backend-config=backends/staging.hcl
terraform apply -var-file=environments/staging.tfvars
```

Run production:

```bash
terraform init -reconfigure -backend-config=backends/production.hcl
terraform apply -var-file=environments/production.tfvars
```

The Lambda zip files referenced by the selected tfvars file must exist before
`terraform apply`.

`auth0_domain` and `auth0_audience` must be configured before relying on
protected routes. See `../../docs/client-portal/auth0-setup.md`.

The `/api/*` CloudFront behavior uses a dedicated origin request policy for
Auth0 and CORS headers. See
`../../docs/client-portal/cloudfront-api-hardening.md`.

The deployment scripts set `TF_VAR_site_asset_root=.artifacts/site` and
`TF_VAR_site_renderer_asset_root=.artifacts/site-renderer` after building the
frontend. Terraform uploads public SSR output to the website root and private
renderer runtime files under `internal/site-renderer`.

## Observability

Terraform manages Lambda log groups and HTTP API access logs. CloudWatch metric
alarms are intentionally opt-in because each alarm is a paid resource.

Set `cloudwatch_alarms_enabled = true`, then list only the specific alarm
targets needed with `cloudwatch_lambda_error_alarm_targets`,
`cloudwatch_lambda_duration_alarm_targets`, and `cloudwatch_api_alarm_types`.
Alarm notification actions are empty by default. Set `cloudwatch_alarm_actions`,
`cloudwatch_alarm_ok_actions`, and
`cloudwatch_alarm_insufficient_data_actions` to SNS topic ARNs or other
CloudWatch-supported action ARNs when an environment-specific notification path
is ready.
