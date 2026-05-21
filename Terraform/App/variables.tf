variable "client_slug" {
  description = "Lowercase, DNS-safe client identifier used as the default resource prefix."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9][a-z0-9-]{1,34}[a-z0-9]$", var.client_slug))
    error_message = "client_slug must be 3-36 characters, lowercase, and contain only letters, numbers, and hyphens."
  }
}

variable "deployment_environment" {
  description = "Environment deployed by this Terraform run."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.deployment_environment)
    error_message = "deployment_environment must be staging or production."
  }
}

variable "resource_prefix" {
  description = "Optional resource prefix. Defaults to {client_slug}-{deployment_environment}."
  type        = string
  default     = ""
}

variable "aws_region" {
  description = "AWS region for regional application resources."
  type        = string
  default     = "us-east-2"
}

variable "site_asset_root" {
  description = "Directory under this Terraform root containing frontend site assets to upload."
  type        = string
  default     = "site"
}

variable "site_renderer_asset_root" {
  description = "Directory under this Terraform root containing private SSR renderer assets."
  type        = string
  default     = ""
}

variable "frontend_site_origin" {
  description = "Public site origin used for CORS and generated metadata."
  type        = string
  default     = ""
}

variable "auth0_domain" {
  description = "Auth0 tenant domain without protocol, for example tenant.us.auth0.com. This is not a secret."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9][A-Za-z0-9.-]+[A-Za-z0-9]$", trimspace(var.auth0_domain))) && !startswith(trimspace(var.auth0_domain), "http://") && !startswith(trimspace(var.auth0_domain), "https://")
    error_message = "auth0_domain must be a domain name without http:// or https://."
  }
}

variable "auth0_audience" {
  description = "Auth0 API identifier/audience expected in access tokens. This is not a secret."
  type        = string

  validation {
    condition     = length(trimspace(var.auth0_audience)) > 0
    error_message = "auth0_audience must not be empty."
  }
}

variable "auth0_placeholder_route_scopes" {
  description = "Scopes accepted by the protected Auth0 placeholder route. API Gateway authorizes when any listed scope is present."
  type        = list(string)
  default     = ["read:me"]

  validation {
    condition     = length(var.auth0_placeholder_route_scopes) > 0 && alltrue([for scope in var.auth0_placeholder_route_scopes : length(trimspace(scope)) > 0])
    error_message = "auth0_placeholder_route_scopes must contain at least one non-empty scope."
  }
}

variable "lambda_handler" {
  description = "Lambda handler for the health check function."
  type        = string
}

variable "lambda_runtime" {
  description = "Lambda runtime for the health check function."
  type        = string
  default     = "nodejs22.x"
}

variable "lambda_zip_path" {
  description = "Path to the published Lambda zip file, relative to this Terraform root."
  type        = string
}

variable "site_renderer_lambda_zip_path" {
  description = "Path to the published Node.js site renderer Lambda zip file, relative to this Terraform root."
  type        = string
}

variable "site_renderer_lambda_runtime" {
  description = "Lambda runtime for the Node.js site renderer."
  type        = string
  default     = "nodejs22.x"
}

variable "site_renderer_lambda_memory_size" {
  description = "Site renderer Lambda memory size in MB."
  type        = number
  default     = 1024
}

variable "site_renderer_lambda_timeout" {
  description = "Site renderer Lambda timeout in seconds."
  type        = number
  default     = 120
}

variable "lambda_memory_size" {
  description = "Health Lambda memory size in MB."
  type        = number
  default     = 256
}

variable "lambda_timeout" {
  description = "Health Lambda timeout in seconds."
  type        = number
  default     = 10
}

variable "lambda_log_retention_days" {
  description = "CloudWatch log retention for health Lambda logs."
  type        = number
  default     = 14
}

variable "cloudfront_price_class" {
  description = "CloudFront price class. PriceClass_100 is the lowest-cost option."
  type        = string
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.cloudfront_price_class)
    error_message = "cloudfront_price_class must be PriceClass_100, PriceClass_200, or PriceClass_All."
  }
}

variable "cors_allowed_headers" {
  description = "CORS headers allowed by S3 and API Gateway."
  type        = list(string)
  default     = ["*"]
}

variable "cors_allowed_methods" {
  description = "CORS methods allowed by S3 and API Gateway."
  type        = list(string)
  default     = ["GET", "HEAD", "POST", "PUT"]
}

variable "cors_allowed_origins" {
  description = "CORS origins allowed by S3 and API Gateway."
  type        = list(string)
  default     = ["http://localhost:5173"]
}

variable "cors_expose_headers" {
  description = "CORS response headers exposed to browsers."
  type        = list(string)
  default     = ["ETag"]
}

variable "cors_max_age" {
  description = "CORS max age in seconds."
  type        = number
  default     = 3600
}

variable "tags" {
  description = "Additional tags applied to all supported resources."
  type        = map(string)
  default     = {}
}
