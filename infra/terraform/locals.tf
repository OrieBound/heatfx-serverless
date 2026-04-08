locals {
  lambda_source_dir = coalesce(var.lambda_source_dir, "${path.root}/api")
  sessions_table    = coalesce(var.dynamodb_sessions_table_name, "heatfx-${var.environment}-sessions")
}
