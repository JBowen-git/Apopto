client_slug            = "apopto"
deployment_environment = "production"
aws_region             = "us-east-2"

lambda_handler                = "handlers/health.handler"
lambda_runtime                = "nodejs22.x"
lambda_zip_path               = "../../Backend/artifacts/production-portal-api.zip"
site_renderer_lambda_zip_path = "lambda_packages/site-renderer.zip"

frontend_site_origin = ""

auth0_domain   = "replace-with-production-auth0-domain"
auth0_audience = "https://replace-with-production-api-audience"

cors_allowed_origins = [
  "http://localhost:5173",
]

tags = {
  ManagedBy = "Terraform"
}
