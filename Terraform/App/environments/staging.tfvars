client_slug            = "apopto"
deployment_environment = "staging"
aws_region             = "us-east-2"

lambda_handler                = "Apopto.Backend::Apopto.Backend.Function::Health"
lambda_zip_path               = "../../Backend/artifacts/staging-backend.zip"
site_renderer_lambda_zip_path = "lambda_packages/site-renderer.zip"

frontend_site_origin = ""

cors_allowed_origins = [
  "http://localhost:5173",
]

tags = {
  ManagedBy = "Terraform"
}
