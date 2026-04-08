output "recordings_bucket_name" {
  value = aws_s3_bucket.recordings.bucket
}

output "recordings_bucket_arn" {
  value = aws_s3_bucket.recordings.arn
}

output "sessions_table_name" {
  value = aws_dynamodb_table.sessions.name
}

output "sessions_table_arn" {
  value = aws_dynamodb_table.sessions.arn
}
