output "recordings_bucket_name" {
  description = "S3 bucket for recording JSON payloads"
  value       = module.data.recordings_bucket_name
}

output "sessions_table_name" {
  value = module.data.sessions_table_name
}

output "user_pool_id" {
  value = module.auth.user_pool_id
}

output "user_pool_client_id" {
  value = module.auth.user_pool_client_id
}

output "cognito_hosted_ui_domain_prefix" {
  description = "Hosted UI prefix; full host is PREFIX.auth.REGION.amazoncognito.com"
  value       = module.auth.cognito_hosted_ui_domain_prefix
}

output "cognito_issuer_url" {
  description = "JWT issuer for API authorizer / client config"
  value       = module.auth.cognito_issuer_url
}

output "http_api_url" {
  description = "Public HTTP API base URL (trailing slash)"
  value       = module.api.http_api_invoke_url
}

output "site_bucket_name" {
  value = module.frontend.site_bucket_name
}

output "cloudfront_distribution_id" {
  value = module.frontend.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "Static site URL (HTTPS) — use in Cognito callback URLs and CORS"
  value       = module.frontend.cloudfront_domain_name
}

output "cloudfront_distribution_arn" {
  description = "Should match the site bucket policy condition AWS:SourceArn (use when debugging AccessDenied)."
  value       = module.frontend.cloudfront_arn
}
