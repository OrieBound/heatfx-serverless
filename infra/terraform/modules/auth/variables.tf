variable "environment" {
  type = string
}

variable "cognito_domain_prefix" {
  type = string
}

variable "app_callback_urls" {
  type = list(string)
}

variable "app_logout_urls" {
  type = list(string)
}
