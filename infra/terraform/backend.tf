# Remote state for CI (CodeBuild passes -backend-config on terraform init).
# Local laptop without a state bucket: terraform init -backend=false
# With pipeline outputs: copy backend.hcl.example → backend.hcl, then terraform init -backend-config=backend.hcl
terraform {
  backend "s3" {}
}
