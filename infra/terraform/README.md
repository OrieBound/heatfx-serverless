# HeatFX Terraform

## Two separate roots (do not mix them)

| Directory | What it is | `terraform init` |
|-----------|----------------|------------------|
| **`infra/terraform/`** (this folder) | App stack (Cognito, API, CloudFront, …) | With **`backend.hcl`** after pipeline exists, or **`-backend=false`** for local state only |
| **`infra/terraform/pipeline/`** | CI only (CodePipeline, CodeBuild, state bucket) | Plain **`terraform init`** — **no** `backend.hcl` (no S3 backend block here) |

If your shell is already in **`pipeline/`**, the app stack is one level up: **`cd ..`** (not `cd infra/terraform`).

### Golden path (Bash — safe to copy)

**Easiest:** from anywhere inside the repo, use **`scripts/tf.sh`** so you never `cd` into the wrong folder:

```bash
bash scripts/tf.sh pipeline init
bash scripts/tf.sh pipeline apply -var-file=terraform.tfvars

cd "$(git rev-parse --show-toplevel)/infra/terraform/api" && npm ci

bash scripts/tf.sh app init -backend-config=backend.hcl
bash scripts/tf.sh app plan -var-file=terraform.tfvars
bash scripts/tf.sh app apply -var-file=terraform.tfvars
```

**Manual:** anchor from the **git repo root** — do **not** run `cd infra/terraform/pipeline` when you are already in `infra/terraform` (that path does not exist there).

```bash
REPO="$(git rev-parse --show-toplevel)"
echo "REPO=$REPO"   # sanity check
```

**1 — CI / state bucket** (`pipeline/` root):

```bash
cd "$REPO/infra/terraform/pipeline"
terraform init
terraform apply -var-file=terraform.tfvars
```

**2 — App stack** (`infra/terraform/` root — **not** `pipeline/`, **not** bare `infra/`):

```bash
cd "$REPO/infra/terraform/api"
npm ci
cd "$REPO/infra/terraform"
# One-time: cp backend.hcl.example backend.hcl  # then fill from pipeline outputs
terraform init -backend-config=backend.hcl
terraform apply -var-file=terraform.tfvars
```

If `terraform plan` says **no configuration files**, your current directory is wrong — run `pwd` and compare to the paths above.

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

If you use **remote state** (after deploying **`pipeline/`**), copy **`backend.hcl.example`** → **`backend.hcl`**, fill bucket and lock table from pipeline outputs (or use pipeline `terraform output`), then:

```bash
terraform init -backend-config=backend.hcl -migrate-state
```

Use **Bash** or **Git Bash** for these commands. (PowerShell splits `=` in flags unless quoted—prefer Bash here.)

After apply, use outputs for `.env.local` / CI: `http_api_url`, `user_pool_id`, `user_pool_client_id`, `cloudfront_domain_name`, bucket names, etc.

```bash
terraform output
```

## Backend

`backend.tf` defines an **S3** backend; attributes are supplied at **`terraform init`** (`-backend-config` or **`-backend=false`** for local-only). See **`backend.hcl.example`**.

## Cognito + CloudFront follow-up

1. First apply can use localhost callback URLs (as in CloudFormation dev flow).
2. Note **`cloudfront_domain_name`** from outputs.
3. Add `https://<cloudfront>/auth/callback` and `https://<cloudfront>/` to **`app_callback_urls`** / **`app_logout_urls`**, set **`cors_allow_origins`** (e.g. CloudFront URL plus `http://localhost:3000` for local dev), and **`terraform apply`** again.

## CI / pipeline (Terraform-only)

A separate root **`pipeline/`** provisions **CodePipeline + CodeBuild** that run repo root **`buildspec.terraform.yml`** (Terraform apply for this stack, then Next build + S3 sync + invalidation). See **[pipeline/README.md](pipeline/README.md)**. That path does **not** use **`buildspec.yml`** (CloudFormation).

## Tear down

```bash
terraform destroy
```

Empty S3 buckets if `destroy` fails on non-empty buckets (same as CloudFormation).
