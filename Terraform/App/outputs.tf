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
