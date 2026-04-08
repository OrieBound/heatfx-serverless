output "http_api_id" {
  value = aws_apigatewayv2_api.http.id
}

output "http_api_invoke_url" {
  description = "Base URL with trailing slash (matches CloudFormation HttpApiUrl style)."
  value       = aws_apigatewayv2_stage.default.invoke_url
}
