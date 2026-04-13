# HeatFX on AWS (infra guide)

This folder describes how the app lands in **your** AWS account: static site (S3 + CloudFront), Cognito sign-in, API (HTTP API + Lambda), DynamoDB, and a private bucket for recording data. **There is no VPC:** Lambda runs in the default (non-VPC) mode, and the API, auth, and data stores are used as managed public HTTPS endpoints—typical for this style of serverless app.

**Pick one path below.** You do not need to understand CloudFormation deeply to follow the steps.

---

## Choose how you want to deploy

| If you want… | Do this | Notes |
|--------------|---------|--------|
| **Fastest: deploy from your laptop** | [Path 1 — Laptop only](#path-1--deploy-from-your-laptop-cloudformation) | One script. You build the site and upload when you are ready. |
| **Push to GitHub and let AWS deploy** | [Path 2 — GitHub + CodePipeline](#path-2--github--codepipeline) | Slightly more setup once; after that, pushes (or “Release change”) drive deploys. |
| **Terraform instead of CloudFormation** | [terraform/README.md](terraform/README.md) | Same idea, different tool. **Do not** run both against the same environment. |

---

## What you have to type vs what is automatic

**You always choose a few names** (AWS needs globally unique values for some things):

- **Cognito domain prefix** — something like `heatfx-yourname-prod`. If AWS says it is taken, pick another.
- **Packaging bucket** — an S3 bucket name *you* pick for CloudFormation upload artifacts. **The deploy script can create this bucket** if it does not exist.

**Everything else** (app buckets, DynamoDB, Lambda, API, CloudFront, IAM for those resources) is created by the templates.

**GitHub integration** needs one extra thing AWS cannot guess:

- A **connection** between AWS and GitHub. You create it once in the AWS console (Developer Tools → **Connections**), approve it in GitHub, then you **paste the connection ARN** into a small local JSON file. That is the main “manual” step; there is no way for a template to log into GitHub on your behalf without that handshake.

**Tip — get the connection ARN from the CLI** (same value as in the console):

```bash
aws codeconnections list-connections --region us-east-1 \
  --query "Connections[?ConnectionStatus=='AVAILABLE'].ConnectionArn" --output text
```

---

## Path 1 — Deploy from your laptop (CloudFormation)

**Goal:** Stack `heatfx-<env>` (e.g. `heatfx-dev`) exists in AWS; you run `npm run build` and sync `out/` when you want to update the site.

1. Install **AWS CLI v2** and sign in (e.g. `aws sso login --profile your-profile`).
2. From the **repo root**, set a **unique** Cognito prefix and a packaging bucket name, then run the script.

**Bash (macOS, Linux, Git Bash):**

```bash
export AWS_PROFILE=your-profile
export AWS_REGION=us-east-1
export ENV=dev
export PACKAGING_BUCKET=any-unique-bucket-name-you-own
export COGNITO_DOMAIN_PREFIX=heatfx-yourname-dev

./scripts/deploy-aws.sh
```

**PowerShell:**

```powershell
$env:AWS_PROFILE = "your-profile"
$env:AWS_REGION = "us-east-1"
$env:ENV = "dev"
$env:PACKAGING_BUCKET = "any-unique-bucket-name-you-own"
$env:COGNITO_DOMAIN_PREFIX = "heatfx-yourname-dev"

.\scripts\deploy-aws.ps1
```

3. After the stack finishes, **publish the frontend** (still from repo root):

```bash
npm ci
npm run build
aws cloudformation describe-stacks --stack-name heatfx-dev --query "Stacks[0].Outputs" --output table
# Use SiteBucketName and CloudFrontDistributionId from outputs:
aws s3 sync out/ "s3://SITE_BUCKET/" --delete
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"
```

4. Point local dev at the deployed backend: copy **`.env.example`** → **`.env.local`** and fill **`NEXT_PUBLIC_*`** from stack outputs (see repo root **README**).

**After you know your CloudFront URL:** run the script again with updated **callback URLs**, **logout URLs**, and a tighter **CORS** origin (instead of `*`) so production auth matches your real site URL. The script parameters are documented in `deploy-aws.ps1`.

---

## Path 2 — GitHub + CodePipeline

**Goal:** When you push to the branch you configured (usually `main`), **CodePipeline** pulls the repo, **CodeBuild** runs **`buildspec.yml`**, which deploys or updates **`heatfx-prod`**, builds Next.js, uploads `out/`, and invalidates CloudFront.

### One-time setup

1. **Create the GitHub connection** (if you do not already have one):  
   AWS Console → **Developer Tools** → **Settings** → **Connections** → **Create connection** → GitHub → finish the browser steps until status is **Available**.

2. **Create `pipeline-params.json`** next to the example file (it is **gitignored** so you do not commit account-specific values):

   - Copy **[cloudformation/pipeline/pipeline-params.example.json](cloudformation/pipeline/pipeline-params.example.json)** → **`cloudformation/pipeline/pipeline-params.json`**.
   - Edit it:
     - **ConnectionArn** — from the console, or from the `list-connections` command above.
     - **FullRepositoryId** — `your-github-user/your-repo` (must match the repo CodePipeline will clone).
     - **BranchName** — usually `main`.
     - **PackagingBucket** — any unused S3 bucket name in your account (the build can create it if missing).
     - **CognitoDomainPrefix** — unique prefix for Hosted UI.
     - **AppCallbackUrls** / **AppLogoutUrls** — start with `http://localhost:3000/...` if you like; after the first deploy you will add your **https://…cloudfront.net** URLs and redeploy the pipeline stack (see below).
     - **CorsAllowOrigin** — `*` is fine for first success; tighten later.

3. **Deploy the pipeline stack** from repo root:

   ```bash
   ./scripts/deploy-pipeline.sh
   ```

   **PowerShell:**

   ```powershell
   .\scripts\deploy-pipeline.ps1
   ```

   Optional: set **`HEATFX_EXPECT_PIPELINE_ACCOUNT`** to your 12-digit AWS account ID so the script refuses to run if your CLI profile is pointed at the wrong account.

### Ongoing use

- **Push** to the configured branch, or open **CodePipeline** and click **Release change**.
- **Logs:** CodeBuild project (name is in the stack outputs) → latest build → **Logs**.

### After the first successful deploy

You will have a **CloudFront domain**. Update **`pipeline-params.json`**:

- Add the **https** callback and sign-out URLs for that domain.
- Set **CorsAllowOrigin** to that origin (instead of `*`) if you want stricter CORS.

Run **`deploy-pipeline.ps1`** / **`deploy-pipeline.sh`** again so CodeBuild’s environment variables stay in sync, then run the pipeline once more.

---

## How CloudFormation deploy works (short)

1. **`aws cloudformation package`** — uploads nested templates and the Lambda zip to **your** packaging bucket and writes a packaged parent template under **`infra/cloudformation/.packaged/`** (gitignored).
2. **`aws cloudformation deploy`** — creates or updates **one parent stack** (e.g. `heatfx-dev`), which creates nested stacks for **data**, **auth**, **API**, and **frontend**.

---

## What gets created (reference)

| Part | What it is |
|------|------------|
| **Data** | Private S3 bucket for recordings; DynamoDB table for session metadata. |
| **Auth** | Cognito user pool, app client, Hosted UI domain. |
| **API** | HTTP API, Lambda, JWT authorizer. |
| **Frontend** | Public site bucket, CloudFront, origin access. |

Templates live under **`infra/cloudformation/`** (`parent.yaml`, `stacks/`, `nested/`). Lambda source: **`infra/cloudformation/api/src/`**.

---

## Folder layout (reference)

```
infra/
├── README.md                    # This file
├── cloudformation/
│   ├── parent.yaml
│   ├── stacks/                  # data, auth, frontend
│   ├── nested/api.yaml          # HTTP API + Lambda
│   ├── api/src/                 # Lambda handler
│   ├── pipeline/                # CodePipeline template + params example
│   └── .packaged/               # generated; gitignored
├── diagrams/
└── terraform/                   # Alternate IaC path → terraform/README.md
```

---

## Terraform vs CloudFormation

- **CloudFormation** — templates in **`infra/cloudformation/`**; optional pipeline in **`infra/cloudformation/pipeline/`** with **`buildspec.yml`**.
- **Terraform** — **`infra/terraform/`**; optional CI in **`infra/terraform/pipeline/`** with **`buildspec.terraform.yml`**.

**Do not** manage the **same environment** with both: tear one down before using the other. Terraform keeps a **copy** of the Lambda under **`infra/terraform/api/`**; if you maintain both paths, keep that code in sync with **`infra/cloudformation/api/`**.

---

## Tear down

- Delete the **app** parent stack (`heatfx-dev` or `heatfx-prod`). If delete fails on the recordings bucket, empty it (including old versions if versioning was on), then retry.
- Delete **`heatfx-pipeline`** separately if you created the CodePipeline stack.

---

## Manual commands (if you avoid the scripts)

See the older-style **`aws cloudformation package`** / **`deploy`** example in git history or in **`scripts/deploy-aws.ps1`** — the script is the supported, copy-paste-friendly version.
