# HeatFX — Deploy with Terraform

This guide is for someone who **cloned the repo from GitHub** and wants the app **running on AWS** with the static site on **CloudFront**, using **only Terraform** (no CloudFormation for this environment).

**Time:** first deploy is often **20–40 minutes** (CloudFront + pipeline propagation).

---

## What you get

| Piece | Role |
|--------|------|
| **CloudFront + S3** | Public **Next.js** static site (`npm run build` → `out/`) |
| **API Gateway HTTP API + Lambda** | REST-style API under `/api/...` |
| **Cognito** | Sign-up / sign-in for the SPA |
| **DynamoDB + S3** | Session index + recording payloads |

---

## Prerequisites

Check these before you start:

1. **AWS account** you control, with permissions to create IAM, Lambda, Cognito, S3, DynamoDB, API Gateway, CloudFront, CodeBuild, CodePipeline (if using CI).
2. **[Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.5** on your machine.
3. **[Node.js](https://nodejs.org/)** **20+** and **npm** (Lambda packaging + frontend build).
4. **[AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)** installed and logged in, e.g.  
   `aws sso login --profile your-profile`  
   then `export AWS_PROFILE=your-profile` (or set `AWS_REGION` / default region; this project assumes **`us-east-1`** unless you change it consistently).
5. **Git** and a **Bash** shell (**Git Bash** on Windows is fine). Terraform’s `-backend-config=...` is easier in Bash than in PowerShell (where you may need quotes around the flag).
6. **GitHub:** for the **CI path** you need a repo AWS can pull from (your **fork** or your own copy) and a **[CodeStar connection](https://docs.aws.amazon.com/dtconsole/latest/userguide/connections.html)** to GitHub.

---

## Two Terraform roots (important)

| Directory | Purpose | State |
|-----------|---------|--------|
| **`infra/terraform/pipeline/`** | CodePipeline, CodeBuild, **S3 backend bucket** for the app | Local `terraform.tfstate` on your laptop |
| **`infra/terraform/`** | **App**: Cognito, API, site bucket, CloudFront, … | **S3 remote state** (after pipeline exists) or local with `-backend=false` |

Do **not** run Terraform from **`infra/`** alone — use **`infra/terraform/`** or **`infra/terraform/pipeline/`**.

From the repo root, you can use:

```bash
bash scripts/tf.sh pipeline plan -var-file=terraform.tfvars
bash scripts/tf.sh app plan -var-file=terraform.tfvars
```

---

## Choose a path

| Path | Best for |
|------|-----------|
| **A — CodePipeline + GitHub** | You want **git push → build → Terraform apply → site upload** automatically. |
| **B — Laptop only (no CI)** | You are fine running **`terraform apply`** and **`npm run build`** + **`aws s3 sync`** yourself. |

You can start with **B** and add **A** later.

---

## Path A — End-to-end with CodePipeline (recommended)

### Step 1 — Clone the repository

```bash
git clone https://github.com/<YOUR_GITHUB_USER>/heatfx-serverless.git
cd heatfx-serverless
```

Use **your fork** (or a repo you own). The pipeline will pull **this** repo/branch from GitHub.

### Step 2 — Create pipeline variables (local secrets)

```bash
cd infra/terraform/pipeline
cp terraform.tfvars.example terraform.tfvars
```

Edit **`terraform.tfvars`** (this file is **gitignored** — never commit it):

| Variable | What to put |
|----------|-------------|
| `aws_region` | e.g. `us-east-1` |
| `environment` | e.g. `prod` |
| `github_repository_id` | `YOUR_USER/heatfx-serverless` (must match the repo the pipeline clones) |
| `github_branch` | e.g. `main` |
| `use_existing_connection` | `true` if you already have a **GitHub** connection in AWS; then set `connection_arn` |
| `connection_arn` | From **Developer Tools → Settings → Connections** (CodeStar / CodeConnections) |
| `cognito_domain_prefix` | **Globally unique** prefix (lowercase, hyphens). Example: `heatfx-yourname-prod` |
| `app_callback_urls` / `app_logout_urls` | Start with `http://localhost:3000/auth/callback` and `http://localhost:3000/`; you will add **HTTPS CloudFront URLs** after Step 7 |
| `cors_allow_origins` | List including at least `http://localhost:3000` for local dev. For the **first** deploy you may use `["*"]` and **tighten** to your CloudFront `https://...` origin after you know the distribution domain (see Step 8) |

If `use_existing_connection = false`, Terraform creates a **new** connection — you **must** open the AWS console and **complete the GitHub handshake** before the pipeline can pull source.

### Step 3 — Deploy the pipeline stack

```bash
terraform init
terraform apply -var-file=terraform.tfvars
```

Save the **outputs** (state bucket name, lock table, pipeline name). You will use them for **`backend.hcl`** if you run the app stack from your laptop with remote state.

### Step 4 — Authorize GitHub (if the connection is “Pending”)

**AWS Console → Developer Tools → Settings → Connections** → your connection → **Update pending connection** → finish GitHub app install. Status must be **Available**.

### Step 5 — Put the code on GitHub

Push this clone to the **`github_repository_id`** / **`github_branch`** you configured. The pipeline only sees what is on GitHub.

### Step 6 — Run the pipeline

**CodePipeline** → pipeline named like **`heatfx-terraform-<environment>`** → **Release change** (or push a commit if the pipeline is triggered on push).

The **Build** stage runs **`buildspec.terraform.yml`**: Terraform **init** (S3 backend) → **apply** → **`npm ci`** / **`npm run build`** → **`aws s3 sync`** → **CloudFront invalidation**.

Open **CodeBuild → Build logs** if anything fails (IAM, Terraform errors, etc.).

### Step 7 — First successful run: note CloudFront and API

From AWS console or, if you configure **`backend.hcl`** (Step 9), from your laptop:

```bash
cd infra/terraform
terraform output cloudfront_domain_name
terraform output http_api_url
# … and other outputs for .env.local
```

### Step 8 — Lock down Cognito and CORS for production

1. Add to **`app_callback_urls`** and **`app_logout_urls`**:  
   `https://<YOUR_CLOUDFRONT_DOMAIN>/auth/callback` and `https://<YOUR_CLOUDFRONT_DOMAIN>/`
2. Set **`cors_allow_origins`** to something like:
   - `https://<YOUR_CLOUDFRONT_DOMAIN>`
   - `http://localhost:3000` (optional, for local dev against prod API)
3. Apply **both** roots so CI env vars stay in sync:
   - `cd infra/terraform/pipeline && terraform apply -var-file=terraform.tfvars`
   - Either run **`terraform apply`** locally in **`infra/terraform/`** with the same values, **or** push / **Release change** so CodeBuild applies the app stack again.

### Step 9 — (Optional) Laptop + remote state for the app stack

```bash
cd infra/terraform
cp backend.hcl.example backend.hcl
# Fill bucket, dynamodb_table, key, region from pipeline outputs (see backend.hcl.example comments)

terraform init -backend-config=backend.hcl
# If you had local state first: add -migrate-state once

terraform plan -var-file=terraform.tfvars
```

On **PowerShell**, quote the backend flag:  
`terraform init "-backend-config=backend.hcl"`.

---

## Path B — Deploy without CodePipeline

Use this if you only want Terraform from your machine and will publish **`out/`** yourself.

### Step 1 — Clone and install Lambda dependencies

```bash
git clone https://github.com/<YOUR_GITHUB_USER>/heatfx-serverless.git
cd heatfx-serverless
cd infra/terraform/api && npm ci && cd ../../..
```

### Step 2 — App variables

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit **`terraform.tfvars`**: **`cognito_domain_prefix`**, callback/logout URLs (localhost is fine to start), **`cors_allow_origins`**.

### Step 3 — Local state (simplest)

```bash
terraform init -backend=false
terraform apply -var-file=terraform.tfvars
```

### Step 4 — Build and publish the site

From **repository root**:

```bash
npm ci
npm run build
```

Use **`terraform output`** for **`site_bucket_name`** and **`cloudfront_distribution_id`**, then:

```bash
aws s3 sync out/ "s3://$(cd infra/terraform && terraform output -raw site_bucket_name)/" --delete
aws cloudfront create-invalidation \
  --distribution-id "$(cd infra/terraform && terraform output -raw cloudfront_distribution_id)" \
  --paths "/*"
```

### Step 5 — Point local dev at the deployed backend

Copy **`.env.example`** → **`.env.local`** and set **`NEXT_PUBLIC_*`** from **`terraform output`** (API URL **without** a trailing slash, Cognito pool, client, hosted UI domain, redirect URI matching your dev port).

### Step 6 — Add CloudFront URLs to Cognito / CORS

Same idea as **Path A — Step 8**: after you know **`cloudfront_domain_name`**, update **`terraform.tfvars`** and run **`terraform apply`** again.

---

## Layout (modules)

| Module | Path | Resources |
|--------|------|-----------|
| **data** | `modules/data` | Recordings bucket, DynamoDB sessions |
| **auth** | `modules/auth` | Cognito pool, app client, hosted UI domain |
| **frontend** | `modules/frontend` | Site bucket, CloudFront, OAC |
| **api** | `modules/api` | HTTP API, Lambda, JWT authorizer |

Lambda source: **`infra/terraform/api/`** (keep **`infra/cloudformation/api/`** in sync if you still use CloudFormation elsewhere).

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| **No configuration files** | Current directory must be **`infra/terraform`** or **`infra/terraform/pipeline`**, not **`infra/`**. |
| **State lock** | Another Terraform or CI run holds the lock; wait, or `terraform force-unlock <id>` only if no other run is active. |
| **Build fails on `pipefail`** | Use latest **`buildspec.terraform.yml`** from the repo (POSIX `sh` / dash — no `set -o pipefail`). |
| **CORS errors from browser** | **`cors_allow_origins`** must include the **exact** browser origin (e.g. `https://dxxxx.cloudfront.net` and/or `http://localhost:3000`). |
| **Cognito redirect mismatch** | **`app_callback_urls`** / **`app_logout_urls`** must list every URL users hit (localhost + CloudFront HTTPS). |

---

## CI details

Pipeline Terraform and CodeBuild env vars: **[pipeline/README.md](pipeline/README.md)**.

---

## Tear down

**App stack** (from **`infra/terraform/`** with the correct backend):

```bash
terraform destroy -var-file=terraform.tfvars
```

Empty S3 buckets if destroy fails. **Pipeline stack** (from **`infra/terraform/pipeline/`**): `terraform destroy` after the app is gone or state migrated.

---

## Related

- Repo root **[README.md](../../README.md)** — local dev, stack overview  
- **[../README.md](../README.md)** — CloudFormation vs Terraform  
- **Product / deploy narrative:** **[../../docs/SPEC.md](../../docs/SPEC.md)**
