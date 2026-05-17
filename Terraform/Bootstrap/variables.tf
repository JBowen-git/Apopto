variable "client_slug" {
  description = "Lowercase, DNS-safe client identifier used as the resource name prefix."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,34}[a-z0-9]$", var.client_slug))
    error_message = "client_slug must be 3-36 characters, lowercase, and contain only letters, numbers, and hyphens."
  }
}

variable "aws_region" {
  description = "AWS region for regional bootstrap resources."
  type        = string
  default     = "us-east-2"
}

variable "state_bucket_name" {
  description = "S3 bucket for Terraform remote state and native lockfiles. Defaults to {client_slug}-terraform-state."
  type        = string
  default     = null

  validation {
    condition     = var.state_bucket_name == null || can(regex("^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$", var.state_bucket_name))
    error_message = "state_bucket_name must be 3-63 characters, lowercase, and contain only letters, numbers, and hyphens."
  }
}

variable "github_repository" {
  description = "GitHub owner/repository allowed to assume the site deploy role."
  type        = string

  validation {
    condition     = can(regex("^[^/]+/[^/]+$", var.github_repository))
    error_message = "github_repository must be formatted as owner/repository."
  }
}

variable "github_staging_branch" {
  description = "Branch allowed to assume the staging/site deploy role."
  type        = string
  default     = "main"
}

variable "github_oidc_url" {
  description = "GitHub Actions OIDC issuer URL."
  type        = string
  default     = "https://token.actions.githubusercontent.com"
}

variable "github_oidc_audience" {
  description = "OIDC audience expected by AWS STS."
  type        = string
  default     = "sts.amazonaws.com"
}

variable "github_oidc_thumbprints" {
  description = "TLS certificate thumbprints for the GitHub Actions OIDC provider."
  type        = list(string)
  default     = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

variable "site_deploy_role_name" {
  description = "Optional override for the GitHub Actions staging/site deploy role name."
  type        = string
  default     = null
}

variable "production_deploy_role_name" {
  description = "Optional override for the production app deploy role name."
  type        = string
  default     = null
}

variable "tags" {
  description = "Additional tags applied to all supported resources."
  type        = map(string)
  default     = {}
}
