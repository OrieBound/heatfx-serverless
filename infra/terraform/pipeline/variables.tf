variable "aws_region" {
  type        = string
  description = "Region for pipeline, state bucket, and app stack."
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Logical environment (e.g. prod). Used in resource names."
  default     = "prod"
}

variable "github_repository_id" {
  type        = string
  description = "GitHub repo as owner/name (e.g. myorg/myrepo)."
}

variable "github_branch" {
  type        = string
  description = "Branch that triggers the pipeline."
  default     = "main"
}

variable "use_existing_connection" {
  type        = bool
  description = "If true, use connection_arn instead of creating a new CodeStar connection."
  default     = false
}

variable "connection_arn" {
  type        = string
  description = "Existing CodeStar/CodeConnections ARN (required when use_existing_connection is true)."
  default     = ""

  validation {
    condition     = !var.use_existing_connection || length(var.connection_arn) > 0
    error_message = "connection_arn must be set when use_existing_connection is true."
  }
}

variable "cognito_domain_prefix" {
  type        = string
  description = "Passed to app Terraform as TF_VAR_cognito_domain_prefix (globally unique)."
}

variable "app_callback_urls" {
  type        = list(string)
  description = "OAuth callback URLs for Cognito (e.g. localhost + CloudFront after first deploy)."
}

variable "app_logout_urls" {
  type        = list(string)
  description = "Cognito logout URLs."
}

variable "cors_allow_origin" {
  type        = string
  description = "API CORS origin; use CloudFront https URL after first deploy."
  default     = "*"
}

variable "terraform_state_key" {
  type        = string
  description = "S3 object key for the app Terraform state inside the state bucket."
  default     = "heatfx/prod/terraform.tfstate"
}

variable "terraform_version" {
  type        = string
  description = "Terraform CLI version installed in CodeBuild (must match lockfile major/minor roughly)."
  default     = "1.9.8"
}

variable "codebuild_compute_type" {
  type        = string
  description = "CodeBuild compute type."
  default     = "BUILD_GENERAL1_MEDIUM"
}

variable "enable_admin_access_for_codebuild" {
  type        = bool
  description = "Attach AdministratorAccess to the CodeBuild role so terraform apply can create IAM/Lambda/etc. Disable and replace with a scoped policy for production hardening."
  default     = true
}
