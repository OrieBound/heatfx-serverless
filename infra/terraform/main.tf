check "lambda_node_modules" {
  assert {
    condition     = fileexists("${local.lambda_source_dir}/node_modules/@aws-sdk/client-dynamodb/package.json")
    error_message = "Install Lambda dependencies before apply: cd infra/terraform/api && npm ci"
  }
}

data "archive_file" "api_lambda" {
  type        = "zip"
  source_dir  = local.lambda_source_dir
  output_path = "${path.root}/.build/heatfx-api-lambda.zip"

  excludes = [
    "node_modules/.cache",
    ".git",
    "*.md",
  ]
}

module "data" {
  source = "./modules/data"

  environment         = var.environment
  sessions_table_name = local.sessions_table
}

module "auth" {
  source = "./modules/auth"

  environment           = var.environment
  cognito_domain_prefix = var.cognito_domain_prefix
  app_callback_urls     = var.app_callback_urls
  app_logout_urls       = var.app_logout_urls
}

module "frontend" {
  source = "./modules/frontend"

  environment = var.environment
}

module "api" {
  source = "./modules/api"

  environment             = var.environment
  lambda_zip_path         = data.archive_file.api_lambda.output_path
  lambda_source_code_hash = data.archive_file.api_lambda.output_base64sha256

  user_pool_id           = module.auth.user_pool_id
  user_pool_client_id    = module.auth.user_pool_client_id
  sessions_table_name    = module.data.sessions_table_name
  recordings_bucket_name = module.data.recordings_bucket_name
  cors_allow_origin      = var.cors_allow_origin

  depends_on = [module.data, module.auth]
}
