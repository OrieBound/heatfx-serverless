output "terraform_state_bucket" {
  description = "S3 bucket for app Terraform state (use in backend.hcl)."
  value       = aws_s3_bucket.terraform_state.bucket
}

output "terraform_lock_table" {
  description = "DynamoDB table for state locking."
  value       = aws_dynamodb_table.terraform_locks.name
}

output "terraform_state_key" {
  description = "State object key configured for CodeBuild."
  value       = var.terraform_state_key
}

output "pipeline_artifacts_bucket" {
  value = aws_s3_bucket.pipeline_artifacts.bucket
}

output "codebuild_project_name" {
  value = aws_codebuild_project.app.name
}

output "codepipeline_name" {
  value = aws_codepipeline.app.name
}

output "codestar_connection_arn" {
  description = "Authorize this connection in the AWS console (Settings → Developer tools) if status is PENDING."
  value       = local.connection_arn
}

output "codestar_connection_status" {
  description = "PENDING until you complete GitHub authorization in the console."
  value       = var.use_existing_connection ? "(existing connection)" : aws_codestarconnections_connection.github[0].connection_status
}
