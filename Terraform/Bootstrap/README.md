# Bootstrap Terraform

This root creates the AWS resources needed before the app Terraform and GitHub
Actions deploys can run:

- S3 Terraform state bucket with native S3 lockfile support.
- GitHub Actions OIDC provider.
- Staging/site deploy role trusted by pushes to the configured branch.
- Production app deploy role trusted by the staging/site deploy role.

The production workflow follows the Xavier pattern: GitHub assumes the staging
site deploy role first, then the scripts assume the production app deploy role
through `APP_DEPLOY_ROLE_ARN`.

The deploy policy also grants read-only ACM access so the app stack can adopt an
existing `us-east-1` certificate for CloudFront aliases without detaching it on
future applies.

## First Apply

Copy the example variables, edit them, then apply with local state:

```bash
cp bootstrap.tfvars.example bootstrap.tfvars
terraform init
terraform apply -var-file=bootstrap.tfvars
```

If the AWS account already has a GitHub OIDC provider, import it before applying:

```bash
terraform import \
  -var-file=bootstrap.tfvars \
  aws_iam_openid_connect_provider.github_actions \
  arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com
```

## Optional Remote State Migration

After the state bucket exists, add this temporary `backend.tf` file:

```hcl
terraform {
  backend "s3" {}
}
```

Then copy and edit the backend config example:

```bash
cp backend.remote.hcl.example backend.remote.hcl
terraform init -migrate-state -backend-config=backend.remote.hcl
```

## GitHub Variables

Add these Bootstrap outputs to GitHub repository variables:

```text
AWS_GITHUB_ACTIONS_SITE_DEPLOY_ROLE_ARN=<github_actions_site_deploy_role_arn>
AWS_PRODUCTION_DEPLOY_ROLE_ARN=<production_app_deploy_role_arn>
```
