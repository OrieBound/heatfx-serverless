# HeatFX Terraform

This directory mirrors the **CloudFormation nested stacks** (data, auth, API, frontend) as Terraform modules. **CloudFormation under `../cloudformation/` is unchanged**; pick **one** IaC tool per environment.

## Layout

| Module       | Path                 | Resources |
|-------------|----------------------|-----------|
| **data**    | `modules/data`       | S3 recordings bucket, DynamoDB sessions table |
| **auth**    | `modules/auth`       | Cognito user pool, SPA client, hosted UI domain, `admins` group |
| **frontend**| `modules/frontend`   | S3 site bucket, CloudFront + OAC, subpage rewrite function |
| **api**     | `modules/api`        | HTTP API (JWT authorizer), Lambda, IAM for DynamoDB + S3 + Cognito admin |

Root `.tf` files wire modules together and zip the Lambda from **`api/`** (this repo copy of the HTTP API handler). **SAM / CloudFormation** still use **`../cloudformation/api/`** unchanged—when you change the handler, update **both** copies (or consolidate into a single shared package later).

## Prerequisites

- [Terraform](https://www.terraform.io/downloads) `>= 1.5` (or OpenTofu equivalent).
- AWS credentials (e.g. `aws sso login --profile orie-prod`).
- **Lambda dependencies installed** before `plan` / `apply`:

```bash
cd infra/terraform/api && npm ci
```

If `node_modules` is missing, Terraform fails the `check` block with that message.

## First-time setup

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars: cognito_domain_prefix, callback URLs, etc.

# Local state (no S3 backend yet):
terraform init -backend=false
terraform plan
terraform apply
```

If you use **remote state** (after deploying **`pipeline/`**), copy **`backend.hcl.example`** → **`backend.hcl`**, fill bucket and lock table from pipeline outputs, then:

```bash
terraform init -backend-config=backend.hcl -migrate-state
```

After apply, use outputs for `.env.local` / CI: `http_api_url`, `user_pool_id`, `user_pool_client_id`, `cloudfront_domain_name`, bucket names, etc.

```bash
terraform output
```

## Backend

`backend.tf` defines an **S3** backend; attributes are supplied at **`terraform init`** (`-backend-config` or **`-backend=false`** for local-only). See **`backend.hcl.example`**.

## Cognito + CloudFront follow-up

1. First apply can use localhost callback URLs (as in CloudFormation dev flow).
2. Note **`cloudfront_domain_name`** from outputs.
3. Add `https://<cloudfront>/auth/callback` and `https://<cloudfront>/` to **`app_callback_urls`** / **`app_logout_urls`**, set **`cors_allow_origin`** to `https://<cloudfront>`, and **`terraform apply`** again.

## CI / pipeline (Terraform-only)

A separate root **`pipeline/`** provisions **CodePipeline + CodeBuild** that run repo root **`buildspec.terraform.yml`** (Terraform apply for this stack, then Next build + S3 sync + invalidation). See **[pipeline/README.md](pipeline/README.md)**. That path does **not** use **`buildspec.yml`** (CloudFormation).

## Tear down

```bash
terraform destroy
```

Empty S3 buckets if `destroy` fails on non-empty buckets (same as CloudFormation).
