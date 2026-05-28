# Parameter Store Secrets

Runtime secrets are manually owned in AWS Systems Manager Parameter Store.
Terraform must not create secret parameters and must not receive secret values.

## Current Secret Inventory

```text
/apopto/staging/stripe/secret-key
/apopto/production/stripe/secret-key
```

The Stripe key is optional. When no parameter name is configured, the billing
portal session route keeps returning the existing `stripe_not_configured`
fallback.

Auth0 domain, Auth0 audience, Auth0 SPA client ID, SES sender addresses, and
site origins are identifiers or configuration values, not app secrets.

## Manual Create Or Update

Run these commands from a terminal that is already authenticated to the target
AWS account and region. Enter the real secret value only in your shell or the AWS
console, never in Terraform files, docs, commits, or tickets.

```bash
aws ssm put-parameter \
  --name "/apopto/staging/stripe/secret-key" \
  --type "SecureString" \
  --value "sk_test_replace_me" \
  --overwrite
```

```bash
aws ssm put-parameter \
  --name "/apopto/production/stripe/secret-key" \
  --type "SecureString" \
  --value "sk_live_replace_me" \
  --overwrite
```

Use `--key-id <kms-key-arn-or-alias>` only if the environment uses a
customer-managed KMS key. If you do, also set
`stripe_secret_key_kms_key_arn` in the environment tfvars so the billing Lambda
can decrypt that SecureString.

## Terraform Wiring

Terraform receives only the parameter name:

```hcl
stripe_secret_key_parameter_name = "/apopto/staging/stripe/secret-key"
stripe_secret_key_kms_key_arn    = ""
```

Terraform then:

- sets `STRIPE_SECRET_KEY_PARAMETER_NAME` on the billing Lambda,
- grants the billing Lambda `ssm:GetParameter` for that exact parameter,
- optionally grants `kms:Decrypt` for the provided customer-managed key.

Terraform does not read the parameter value, so the Stripe key does not enter
Terraform state or Lambda environment variables.

## Validation

Before enabling the parameter name in tfvars, confirm the parameter exists:

```bash
aws ssm get-parameter \
  --name "/apopto/staging/stripe/secret-key" \
  --with-decryption \
  --query 'Parameter.Name' \
  --output text
```

For CI/deploy checks, set:

```text
REQUIRED_RUNTIME_SSM_PARAMETERS=/apopto/staging/stripe/secret-key
```

Do not map Stripe secrets through `CICD_SSM_ENV_EXPORTS` or any `TF_VAR_*`
environment variable.
