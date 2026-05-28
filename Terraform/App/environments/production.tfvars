client_slug            = "apopto"
deployment_environment = "production"
aws_region             = "us-east-2"

lambda_handler                = "handlers/health.handler"
lambda_runtime                = "nodejs22.x"
lambda_zip_path               = "../../Backend/artifacts/production-portal-api.zip"
site_renderer_lambda_zip_path = "lambda_packages/site-renderer.zip"

frontend_site_origin = "https://apopto.net"

auth0_domain   = "dev-746g37dhd2m2q4g4.us.auth0.com"
auth0_audience = "https://apopto.net"

cors_allowed_origins = [
  "http://localhost:5173",
]

tags = {
  ManagedBy = "Terraform"
}
