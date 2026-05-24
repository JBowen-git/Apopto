output "website_bucket_name" {
  description = "Private S3 website bucket."
  value       = aws_s3_bucket.website.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID."
  value       = aws_cloudfront_distribution.website.id
}

output "cloudfront_distribution_domain_name" {
  description = "CloudFront distribution domain name."
  value       = aws_cloudfront_distribution.website.domain_name
}

output "api_endpoint" {
  description = "HTTP API Gateway endpoint."
  value       = aws_apigatewayv2_api.app.api_endpoint
}

output "client_portal_table_name" {
  description = "DynamoDB single-table foundation for client portal data."
  value       = aws_dynamodb_table.client_portal.name
}

output "client_portal_table_arn" {
  description = "ARN of the DynamoDB ClientPortal table."
  value       = aws_dynamodb_table.client_portal.arn
}

output "client_portal_upload_bucket_name" {
  description = "Private S3 bucket for future client portal file uploads."
  value       = aws_s3_bucket.client_portal_uploads.bucket
}

output "client_portal_upload_bucket_arn" {
  description = "ARN of the private S3 bucket for future client portal file uploads."
  value       = aws_s3_bucket.client_portal_uploads.arn
}

output "client_portal_files_lambda_function_name" {
  description = "Files handler Lambda function name."
  value       = aws_lambda_function.files.function_name
}

output "client_portal_messages_lambda_function_name" {
  description = "Messages handler Lambda function name."
  value       = aws_lambda_function.messages.function_name
}

output "client_portal_billing_lambda_function_name" {
  description = "Billing handler Lambda function name."
  value       = aws_lambda_function.billing.function_name
}

output "client_portal_file_scan_result_lambda_function_name" {
  description = "GuardDuty malware scan-result Lambda function name."
  value       = aws_lambda_function.file_scan_result.function_name
}

output "client_portal_guardduty_malware_protection_plan_id" {
  description = "GuardDuty Malware Protection for S3 plan ID for the client portal upload bucket."
  value       = aws_guardduty_malware_protection_plan.client_portal_uploads.id
}

output "health_check_url" {
  description = "CloudFront health check URL."
  value       = "https://${aws_cloudfront_distribution.website.domain_name}/api/health"
}

output "lambda_function_name" {
  description = "Health Lambda function name."
  value       = aws_lambda_function.health.function_name
}

output "site_renderer_lambda_function_name" {
  description = "Site renderer Lambda function name."
  value       = aws_lambda_function.site_renderer.function_name
}

output "site_renderer_queue_url" {
  description = "SQS queue URL used to trigger site rendering."
  value       = aws_sqs_queue.site_renderer.id
}

output "site_renderer_queue_arn" {
  description = "SQS queue ARN used to trigger site rendering."
  value       = aws_sqs_queue.site_renderer.arn
}

output "site_renderer_dlq_url" {
  description = "SQS DLQ URL for failed site rendering messages."
  value       = aws_sqs_queue.site_renderer_dlq.id
}

output "site_renderer_build_id" {
  description = "Frontend SSR renderer build ID currently uploaded by Terraform."
  value       = local.site_renderer_build_id
}
