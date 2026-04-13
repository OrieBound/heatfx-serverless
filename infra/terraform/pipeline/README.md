# HeatFX Terraform CI pipeline (AWS only)

**New to this repo?** Start with the full guide: **[../README.md](../README.md)** (clone → variables → CloudFront).

This folder is a **separate Terraform root** from `../` (the app stack). Run all commands from **`infra/terraform/pipeline`**. To work on the **app** stack instead, **`cd ..`** to `infra/terraform` — do **not** use `cd infra/terraform` from here (that path does not exist). **`backend.hcl`** is only for the parent app root, not this folder.

It creates:

| Resource | Purpose |
|----------|---------|
| **S3 bucket** | Remote backend for the **app** Terraform state |
| **DynamoDB table** | State locking for `terraform apply` in CI |
| **S3 bucket** | CodePipeline artifact store |
| **CodeStar connection** | GitHub source (or use an existing connection ARN) |
| **CodeBuild** | Runs **`buildspec.terraform.yml`** at repo root: `terraform init` (S3 backend) → `apply` → `npm run build` → `s3 sync` → CloudFront invalidation |
| **CodePipeline** | Source → Build |

**CloudFormation** templates in `infra/cloudformation/` are not used or modified by this stack.

## Prerequisites

- Terraform >= 1.5, AWS credentials (e.g. SSO admin).
- GitHub repo contains **`buildspec.terraform.yml`** on the branch you configure.

## One-time: deploy this pipeline stack (local state)

This stack keeps its own **local** `terraform.tfstate` (not in the state bucket). Store it safely or add a second backend later.

```bash
cd infra/terraform/pipeline
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars: repository, connection_arn or new connection, cognito prefix, URLs.

terraform init
terraform apply
```

Do **not** commit **`terraform.tfvars`** or **`terraform.tfstate`** (they stay local / remote backend only). The **`.example`** file uses placeholders only.

## Authorize GitHub

1. Open **AWS Console → Developer Tools → Settings → Connections** (or search **CodeStar Connections**).
2. Find the connection named **`heatfx-terraform-<environment>`** (or your existing one).
3. **Update pending connection** → complete GitHub OAuth / app install.

Until status is **Available**, the pipeline source stage will fail.

## Wire the app stack to remote state (optional, for laptop)

The app root `../` includes `backend.tf` (empty `backend "s3" {}`). After this pipeline exists:

```bash
cd infra/terraform
cp backend.hcl.example backend.hcl
# Set bucket = pipeline output terraform_state_bucket, dynamodb_table = terraform_lock_table

terraform init -backend-config=backend.hcl -migrate-state
```

To stay **fully local** on a laptop: `terraform init -backend=false` (no S3 backend).

## What CodeBuild runs

See repo root **`buildspec.terraform.yml`**. It expects env vars **`TF_STATE_BUCKET`**, **`TF_LOCK_TABLE`**, **`TF_STATE_KEY`**, and **`TF_VAR_*`** — all injected by this Terraform on the CodeBuild project.

**IAM:** By default the CodeBuild role has **AdministratorAccess** so `terraform apply` can create IAM, Lambda, Cognito, etc. Set **`enable_admin_access_for_codebuild = false`** and add a scoped policy when you harden.

## After first successful deploy

Add your **CloudFront https** URLs to **`app_callback_urls`** / **`app_logout_urls`**, set **`cors_allow_origins`** (list), `terraform apply` this pipeline stack again (updates CodeBuild env), then re-run the pipeline or push a commit.

## Tear down

```bash
cd infra/terraform/pipeline
terraform destroy
```

Empty any buckets if destroy fails on non-empty objects.
