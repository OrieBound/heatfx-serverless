variable "environment" {
  type = string
}

variable "lambda_zip_path" {
  type        = string
  description = "Path to zipped Lambda artifact (src/ + node_modules at package root)."
}

variable "lambda_source_code_hash" {
  type        = string
  description = "Base64 SHA256 of zip for aws_lambda_function.source_code_hash."
}

variable "user_pool_id" {
  type = string
}

variable "user_pool_client_id" {
  type = string
}

variable "sessions_table_name" {
  type = string
}

variable "recordings_bucket_name" {
  type = string
}

variable "cors_allow_origins" {
  type = list(string)
}
