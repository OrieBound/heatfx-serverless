variable "aws_region" {
  type        = string
  description = "AWS region for all resources (match CloudFront + Cognito regional endpoints)."
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Logical environment suffix (e.g. dev, prod). Used in names that are not globally unique by account/region alone."
  default     = "prod"
}

variable "cognito_domain_prefix" {
  type        = string
  description = "Globally unique Cognito hosted UI domain prefix (lowercase letters, numbers, hyphens; max 63)."
}

variable "app_callback_urls" {
  type        = list(string)
  description = "OAuth / Hosted UI callback URLs (e.g. https://d123.cloudfront.net/auth/callback)."
}

variable "app_logout_urls" {
  type        = list(string)
  description = "Sign-out URLs after logout (e.g. https://d123.cloudfront.net/)."
}

variable "cors_allow_origins" {
  type        = list(string)
  description = "Browser origins allowed for API Gateway CORS and Lambda Access-Control-Allow-Origin (reflects request Origin when it matches)."
  default     = ["*"]
}

variable "dynamodb_sessions_table_name" {
  type        = string
  description = "DynamoDB table name for sessions. CloudFormation used a fixed name; default here includes environment for safer multi-env accounts."
  default     = null
}

variable "lambda_source_dir" {
  type        = string
  description = "Directory containing the API Lambda package.json and src/ (default: infra/terraform/api)."
  default     = null
}
