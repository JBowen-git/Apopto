client_slug            = "apopto"
deployment_environment = "staging"
aws_region             = "us-east-2"

lambda_handler                = "handlers/health.handler"
lambda_runtime                = "nodejs22.x"
lambda_zip_path               = "../../Backend/artifacts/staging-portal-api.zip"
site_renderer_lambda_zip_path = "lambda_packages/site-renderer.zip"

frontend_site_origin = ""

cloudfront_aliases                = []
cloudfront_acm_certificate_domain = ""

auth0_domain   = "dev-746g37dhd2m2q4g4.us.auth0.com"
auth0_audience = "https://apopto.net"

cors_allowed_origins = [
  "http://localhost:5173",
]

ses_from_email            = "contact@apopto.net"
ses_notification_to_email = "Jake@apopto.net"
ses_region                = "us-east-1"

tags = {
  ManagedBy = "Terraform"
}
