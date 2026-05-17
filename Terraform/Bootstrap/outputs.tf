output "state_bucket_name" {
  description = "S3 bucket used for Terraform state and native lockfiles."
  value       = aws_s3_bucket.terraform_state.bucket
}

output "github_actions_oidc_provider_arn" {
  description = "GitHub Actions OIDC provider ARN."
  value       = aws_iam_openid_connect_provider.github_actions.arn
}

output "github_actions_site_deploy_role_arn" {
  description = "Role ARN assumed by GitHub Actions for staging deploys and production release orchestration."
  value       = aws_iam_role.site_deploy.arn
}

output "production_app_deploy_role_arn" {
  description = "Role ARN assumed from the site deploy role for production plans and applies."
  value       = aws_iam_role.production_deploy.arn
}
