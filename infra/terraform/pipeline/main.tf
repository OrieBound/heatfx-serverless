locals {
  connection_arn = var.use_existing_connection ? var.connection_arn : aws_codestarconnections_connection.github[0].arn
}

resource "aws_codestarconnections_connection" "github" {
  count = var.use_existing_connection ? 0 : 1

  name          = "heatfx-terraform-${var.environment}"
  provider_type = "GitHub"
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "heatfx-tf-state-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.name}"
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "terraform_locks" {
  name         = "heatfx-tf-locks-${var.environment}-${data.aws_caller_identity.current.account_id}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

resource "aws_s3_bucket" "pipeline_artifacts" {
  bucket = "heatfx-tf-artifacts-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.name}-${var.environment}"
}

resource "aws_s3_bucket_public_access_block" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "pipeline_artifacts" {
  bucket = aws_s3_bucket.pipeline_artifacts.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_iam_role" "codebuild" {
  name = "heatfx-tf-codebuild-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "codebuild.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "codebuild_admin" {
  count = var.enable_admin_access_for_codebuild ? 1 : 0

  role       = aws_iam_role.codebuild.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "aws_iam_role_policy" "codebuild_logs" {
  name = "heatfx-tf-codebuild-logs-${var.environment}"
  role = aws_iam_role.codebuild.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
      ]
      Resource = "*"
    }]
  })
}

resource "aws_codebuild_project" "app" {
  name          = "heatfx-terraform-${var.environment}"
  description   = "Terraform apply + Next.js build + S3 sync (HeatFX)"
  build_timeout = 60
  service_role  = aws_iam_role.codebuild.arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = var.codebuild_compute_type
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = false

    environment_variable {
      name  = "TF_STATE_BUCKET"
      value = aws_s3_bucket.terraform_state.bucket
    }
    environment_variable {
      name  = "TF_STATE_KEY"
      value = var.terraform_state_key
    }
    environment_variable {
      name  = "TF_LOCK_TABLE"
      value = aws_dynamodb_table.terraform_locks.name
    }
    environment_variable {
      name  = "TERRAFORM_VERSION"
      value = var.terraform_version
    }
    environment_variable {
      name  = "TF_VAR_aws_region"
      value = var.aws_region
    }
    environment_variable {
      name  = "TF_VAR_environment"
      value = var.environment
    }
    environment_variable {
      name  = "TF_VAR_cognito_domain_prefix"
      value = var.cognito_domain_prefix
    }
    environment_variable {
      name  = "TF_VAR_app_callback_urls"
      value = jsonencode(var.app_callback_urls)
    }
    environment_variable {
      name  = "TF_VAR_app_logout_urls"
      value = jsonencode(var.app_logout_urls)
    }
    environment_variable {
      name  = "TF_VAR_cors_allow_origin"
      value = var.cors_allow_origin
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.terraform.yml"
  }
}

resource "aws_iam_role" "codepipeline" {
  name = "heatfx-tf-codepipeline-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "codepipeline.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

data "aws_iam_policy_document" "codepipeline" {
  statement {
    sid = "S3Artifacts"
    actions = [
      "s3:GetBucketVersioning",
      "s3:GetObject",
      "s3:GetObjectVersion",
      "s3:PutObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.pipeline_artifacts.arn,
      "${aws_s3_bucket.pipeline_artifacts.arn}/*",
    ]
  }

  statement {
    sid = "CodeBuild"
    actions = [
      "codebuild:BatchGetBuilds",
      "codebuild:StartBuild",
    ]
    resources = [aws_codebuild_project.app.arn]
  }

  statement {
    sid = "CodeStarConnection"
    actions = [
      "codestar-connections:UseConnection",
    ]
    resources = [local.connection_arn]
  }

  statement {
    sid = "PassCodeBuildRole"
    actions = [
      "iam:PassRole",
    ]
    resources = [aws_iam_role.codebuild.arn]
  }
}

resource "aws_iam_role_policy" "codepipeline" {
  name   = "heatfx-tf-pipeline-inline-${var.environment}"
  role   = aws_iam_role.codepipeline.id
  policy = data.aws_iam_policy_document.codepipeline.json
}

resource "aws_codepipeline" "app" {
  name     = "heatfx-terraform-${var.environment}"
  role_arn = aws_iam_role.codepipeline.arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts.bucket
    type     = "S3"
  }

  stage {
    name = "Source"

    action {
      name             = "GitHub_Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn        = local.connection_arn
        FullRepositoryId     = var.github_repository_id
        BranchName           = var.github_branch
        OutputArtifactFormat = "CODE_ZIP"
      }
    }
  }

  stage {
    name = "Build"

    action {
      name            = "Terraform_and_Frontend"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source_output"]

      configuration = {
        ProjectName = aws_codebuild_project.app.name
      }
    }
  }
}
