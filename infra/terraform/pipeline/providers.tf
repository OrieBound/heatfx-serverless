provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "heatfx"
      Environment = var.environment
      ManagedBy   = "terraform"
      Component   = "ci-pipeline"
    }
  }
}

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}
