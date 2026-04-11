# HeatFX — Product & technical specification

**Status:** Portfolio / reference implementation — core product flows (record, results, cloud save, **My Recordings**, infra) are implemented and wired end-to-end. Treat **production** hardening as your responsibility (see *Current limitations* and deploy sections).

**Source:** [github.com/OrieBound/heatfx-serverless](https://github.com/OrieBound/heatfx-serverless)

---

## 1. What HeatFX is

HeatFX is a **serverless web application** that lets a user **record mouse activity** on a grid, then inspect the session as a **heatmap** and a **time-based replay** of the cursor. The goal is to make interaction data **visible and replayable** without capturing screen video—only **events** (positions, clicks, drags, scroll, timestamps, optional chaos-mode snapshots, etc.).

**Recording length (accurate for marketing copy):**

- **Guests (not signed in):** up to **30 seconds** per session (fixed cap).
- **Signed-in users:** choose **30, 60, 90, or 120 seconds** in settings (default length starts at 30s until changed). The API accepts saved sessions with **`durationMs` up to 120,000** to match the UI cap.

The same project doubles as a **reference architecture**: static site on **S3 + CloudFront**, **API Gateway + Lambda**, **DynamoDB**, **S3** for payloads, **Cognito** for auth. **Infrastructure** is available as **CloudFormation** under `infra/cloudformation/` **or** **Terraform** under `infra/terraform/` — use **one** IaC tool per environment (do not manage the same resources with both).

---

## 2. Why HeatFX exists (“Why” page — themes)

These themes align with the copy on the in-app **Why HeatFX** page (`/why`).

| Theme | Summary |
|--------|--------|
| **Invisible data, made visible** | Pointer events are generated constantly; HeatFX surfaces them as heatmaps and replays without embedding traditional page analytics. |
| **Replay without video** | Stores **event streams**, not pixels—lightweight, no screen capture, replay driven by timestamps (e.g. `requestAnimationFrame` on the client). |
| **Serverless reference** | End-to-end example: auth, API, DB, object storage, CDN, IaC wired together—not a single isolated Lambda demo. |
| **Serverless economics** | Pay-per-use services; **low traffic is inexpensive** and there are no always-on servers. AWS pricing and free-tier limits **change**—verify current docs for your account (the in-app copy uses illustrative “free tier” framing). |
| **Usability and polish** | Intended to be **fun to use** (themes, replay, interaction) as well as technically interesting. |
| **Open & self-hostable** | Full source and templates on GitHub; deploy into **your** AWS account; optional **GitHub → CodePipeline → CodeBuild** for production. |

**Opening question (from the app):** *Can you replay exactly what a user did on a page—without recording a video?* HeatFX implements that idea and expands it into a full cloud stack.

---

## 3. How it’s built (“Stack” page + repo layout)

### 3.1 Architecture overview

- **Frontend:** **Next.js 14** (App Router), **TypeScript**, **React 18**, **static export** (`output: 'export'`) → plain files in `out/` served from **S3** behind **CloudFront** (no Node server at runtime for the UI).
- **Backend:** One **Node.js 20** **Lambda** behind **API Gateway (HTTP API)**; **JWT authorizer** validates **Cognito** tokens before the handler runs for protected routes.
- **Data:** **DynamoDB** for session **metadata**; **S3** for **raw event JSON** (session-oriented keys). The API returns **presigned S3 URLs** so the browser can load large event payloads without streaming them through Lambda.
- **Auth:** **Amazon Cognito** User Pool + SPA app client. The app uses **custom pages** and **SRP** via **`amazon-cognito-identity-js`**. CloudFormation still provisions a **Cognito domain prefix** and **OAuth callback / logout URLs** (e.g. `/auth/callback`) for redirect-based flows alongside the SPA client.
- **Infrastructure (CloudFormation):** **Parent stack** with **four nested stacks**: **data**, **auth**, **api** (SAM transform), **frontend**. Templates: `infra/cloudformation/parent.yaml`, `stacks/`, `nested/`.
- **Infrastructure (Terraform):** **`infra/terraform/`** — modules **data**, **auth**, **api**, **frontend** plus root wiring; Lambda source under **`infra/terraform/api/`** (keep in sync with **`infra/cloudformation/api/`** if you use both tools in different accounts).
- **CI/CD — CloudFormation path:** **CodePipeline** + **CodeBuild**, GitHub via **CodeConnections**. **`buildspec.yml`** packages and deploys the CFN parent stack, then builds Next.js and syncs **`out/`** to S3 + invalidates CloudFront. Pipeline template: `infra/cloudformation/pipeline/pipeline.yaml`.
- **CI/CD — Terraform path:** Terraform under **`infra/terraform/pipeline/`** provisions a **separate** pipeline + state bucket; **`buildspec.terraform.yml`** runs **`terraform apply`** for the app stack, then **`npm run build`**, **`aws s3 sync`**, invalidation. See **`infra/terraform/README.md`** for a full clone-to-CloudFront checklist.

### 3.2 Frontend (high level)

- **Canvas** for heatmap rendering; **replay loop** driven by timestamps, not video decode.
- **Inline / CSS variables** for theming (no large CSS framework in the Stack page description).
- **Contexts** for shared state (e.g. recording settings, cursor color).

### 3.3 Repository map (conceptual)

| Area | Location |
|------|----------|
| Next.js app | `app/`, `components/`, `contexts/` |
| IaC (CloudFormation) | `infra/cloudformation/` |
| IaC (Terraform app stack) | `infra/terraform/` (root `.tf` + `modules/`) |
| IaC (Terraform CI + remote state bucket) | `infra/terraform/pipeline/` |
| Pipeline + CodeBuild (CFN path) | `infra/cloudformation/pipeline/pipeline.yaml` |
| Pipeline parameters (example, CFN) | `infra/cloudformation/pipeline/pipeline-params.example.json` |
| Prod build / deploy in CI (CFN) | `buildspec.yml` (repo root) |
| Prod build / deploy in CI (Terraform) | `buildspec.terraform.yml` (repo root) |
| Lambda source (CFN package) | `infra/cloudformation/api/src/` |
| Lambda source (Terraform zip) | `infra/terraform/api/` |
| App stack deploy (CFN scripts) | `scripts/deploy-aws.sh`, `scripts/deploy-aws.ps1` |
| Pipeline stack deploy (CFN scripts) | `scripts/deploy-pipeline.sh`, `scripts/deploy-pipeline.ps1` |
| Terraform helper (correct working dirs) | `scripts/tf.sh` |
| IaC narrative + CFN vs TF | `infra/README.md` |
| **Terraform deploy guide (clone → CloudFront)** | **`infra/terraform/README.md`** |

### 3.4 Current limitations (honest status)

The app **records**, **persists** sessions for signed-in users via the **HTTP API** (DynamoDB + S3), and **My Recordings** loads from the API. **sessionStorage** is still used as a **same-tab handoff** to the Results page after recording or after fetching from S3 in-tab — it is not the system of record. Treat any **production** deployment as **your own validation** (IAM scope, CORS, Cognito callback URLs, and whether you use **CloudFormation or Terraform** for that account).

---

## 4. User guide (quick start)

### 4.1 Local development

```bash
git clone https://github.com/OrieBound/heatfx-serverless.git
cd heatfx-serverless   # or your fork folder name
npm install
npm run dev
```

Open **http://localhost:3000** (or the port Next prints if 3000 is busy).

### 4.2 Using the recorder

1. **Start** recording (countdown).
2. Move, click, and drag in the **grid** until you **Stop** or hit the **session cap** (**30s** guests; **30 / 60 / 90 / 120s** signed-in, per settings).
3. Open **View results** (works in-tab for guests; **Save** to cloud requires sign-in).
4. **Heatmap** tab: density and related controls.
5. **Replay** tab: playback speed, scrubber, timestamp-driven cursor motion.
6. **Details** tab: session metadata and counts.

In-app **user-facing guide:** **`/about`** (linked from the recorder as “User Guide”). **Technical stack narrative:** **`/stack`**, **motivation:** **`/why`**.

**Password reset:** **`/auth/forgot-password`** (email verification code from Cognito) → **`/auth/reset-password`**. Works on localhost when **`.env.local`** points at your user pool; no separate infra beyond Cognito **account recovery** (already enabled in templates).

Copy **`.env.example`** to **`.env.local`** and set **`NEXT_PUBLIC_*`** when pointing at a deployed API and Cognito (see deploy outputs below). **Do not commit** `.env.local` (it is gitignored). For a **production** static build, set **`NEXT_PUBLIC_COGNITO_REDIRECT_URI`** to your live **`https://…/auth/callback`** (repo provides **`npm run build:prod-site`** for the default HeatFX domain).

---

## 5. Deploying HeatFX in another AWS account

This section summarizes **CloudFormation** and **Terraform** paths. **Step-by-step Terraform** (clone → variables → pipeline or manual → CloudFront) lives in **`infra/terraform/README.md`**.

### 5.1 Prerequisites

- **AWS account** they control.
- **AWS CLI v2** installed and authenticated (e.g. `aws sso login --profile <profile>`).
- **Node.js** for `npm run build` (local publish path; CodeBuild provides Node in CI).
- A **globally unique** S3 bucket name for CloudFormation **artifact uploads** (`PACKAGING_BUCKET`). The script can **create** this bucket if it does not exist.
- A **globally unique** **`COGNITO_DOMAIN_PREFIX`** (Cognito hosted domain prefix requirement).

### 5.2 One-command app stack deploy (recommended for dev / manual prod)

From **repository root** (Git Bash / macOS / Linux):

```bash
export AWS_PROFILE=<their-profile>
export AWS_REGION=us-east-1                    # or their chosen region; keep templates/scripts consistent
export PACKAGING_BUCKET=<globally-unique-artifacts-bucket>
export COGNITO_DOMAIN_PREFIX=<globally-unique-prefix>
# optional: export ENV=dev   # default dev → stack name heatfx-dev

chmod +x scripts/deploy-aws.sh
./scripts/deploy-aws.sh
```

**PowerShell:**

```powershell
$env:AWS_PROFILE = "<their-profile>"
$env:AWS_REGION = "us-east-1"
$env:PACKAGING_BUCKET = "<globally-unique-artifacts-bucket>"
$env:COGNITO_DOMAIN_PREFIX = "<globally-unique-prefix>"
.\scripts\deploy-aws.ps1 -CognitoDomainPrefix $env:COGNITO_DOMAIN_PREFIX
```

What this does:

1. Ensures the **packaging** bucket exists.
2. Runs **`aws cloudformation package`** (uploads nested templates + Lambda bundle, writes `infra/cloudformation/.packaged/parent.yaml` — **gitignored**).
3. Runs **`aws cloudformation deploy`** with **`CAPABILITY_IAM`**, **`CAPABILITY_NAMED_IAM`** (needed for SAM), and **`CAPABILITY_AUTO_EXPAND`** on **`heatfx-${ENV}`** (e.g. `heatfx-dev`).

### 5.3 Parameters they should plan for

| Parameter | Role |
|-----------|------|
| `Environment` | Suffix for naming (default `dev` in scripts; pipeline often uses `prod` → `heatfx-prod`). |
| `CognitoDomainPrefix` | **Required**, globally unique. |
| `AppCallbackUrls` / `AppLogoutUrls` | Cognito redirects; start with localhost; after CloudFront exists, **redeploy** with production **https** URLs. |
| `CorsAllowOrigin` | API CORS; `*` for early dev; tighten to the **CloudFront HTTPS origin** for production. |

### 5.4 Publish the static frontend

**If you use the optional CodePipeline (typical prod):** the **`buildspec.yml`** build already runs **`npm run build`**, syncs **`out/`** to the site bucket, and invalidates CloudFront after a successful **`heatfx-prod`** deploy. No manual `s3 sync` step is required for that path.

**If you deploy the stack manually** (no pipeline for this environment):

```bash
npm run build
aws cloudformation describe-stacks --stack-name heatfx-dev \
  --query "Stacks[0].Outputs" --output table
```

Use outputs for **`SiteBucketName`** and **`CloudFrontDistributionId`**:

```bash
aws s3 sync out/ "s3://<SiteBucketName>/" --delete --region <region>
aws cloudfront create-invalidation \
  --distribution-id <CloudFrontDistributionId> \
  --paths "/*" --region <region>
```

Configure **`.env.local`** (or CI secrets) from outputs: **`HttpApiUrl`**, **`UserPoolId`**, **`UserPoolClientId`**, **`CloudFrontDomainName`**, Cognito domain host derived from prefix and region, etc.

### 5.5 Optional: CodePipeline + CodeBuild (prod from GitHub)

1. In **AWS Developer Tools**, create a **CodeConnections** connection to GitHub; copy the connection **ARN**.
2. Copy **`infra/cloudformation/pipeline/pipeline-params.example.json`** → **`pipeline-params.json`** (that file is **gitignored** — do not commit account-specific ARNs). Fill in **ConnectionArn**, **FullRepositoryId**, **PackagingBucket**, **CognitoDomainPrefix**, and optional callback/CORS fields.
3. Deploy the **pipeline stack** (creates CodeBuild project + pipeline):  
   `./scripts/deploy-pipeline.sh` or `.\scripts\deploy-pipeline.ps1`  
   (optional: **`HEATFX_EXPECT_PIPELINE_ACCOUNT`** to guard the target account).
4. Push to the configured branch or **Release change** in the console.

**IAM note:** The CodeBuild service role must be allowed to create resources CloudFormation provisions (not only the CloudFormation API). The repo’s **`pipeline.yaml`** attaches policies including **Cognito**, **DynamoDB**, **Lambda**, and **API Gateway** so nested stack creation succeeds (not just `AWSCloudFormationFullAccess`).

### 5.6 Tear-down

- Delete the **app parent** stack (e.g. `heatfx-dev` or `heatfx-prod`). CloudFormation removes nested stacks; empty **S3** buckets if deletion is blocked by contents.
- Delete **`heatfx-pipeline`** separately if you created the pipeline stack.
- **Switching IaC:** do not manage the **same** resources with both tools; destroy one stack type before applying the other for the same environment.

### 5.7 Terraform — clone from GitHub to CloudFront

**Canonical instructions:** [`infra/terraform/README.md`](../infra/terraform/README.md) (paths **A** = CodePipeline + GitHub, **B** = laptop-only).

**Summary — Path A (CI):**

1. Clone / fork the repo; install **Terraform**, **Node 20+**, **AWS CLI**; authenticate to AWS.
2. **`infra/terraform/pipeline/`**: copy **`terraform.tfvars.example`** → **`terraform.tfvars`**; set **GitHub repo**, **branch**, **CodeStar/CodeConnections ARN** (or create a new connection and complete OAuth), **globally unique `cognito_domain_prefix`**, callback URLs (localhost first), **`cors_allow_origins`** (e.g. include `http://localhost:3000`; optionally `["*"]` for first deploy then tighten to your CloudFront HTTPS origin).
3. **`terraform init`** && **`terraform apply -var-file=terraform.tfvars`** in **`pipeline/`**.
4. Push code to the configured GitHub repo; **Release change** (or trigger on push) on **CodePipeline**. **CodeBuild** runs **`buildspec.terraform.yml`**: remote **S3 state**, **`terraform apply`** for the app, **`npm run build`**, **`aws s3 sync`**, **CloudFront invalidation**.
5. After the first success, add **HTTPS CloudFront** URLs to Cognito callbacks and **`cors_allow_origins`**; re-apply pipeline Terraform (updates CodeBuild env) and run the pipeline again (or **`terraform apply`** locally for the app stack with **`backend.hcl`** from pipeline outputs).

**Summary — Path B (no CI):** **`infra/terraform/api` → `npm ci`**; **`infra/terraform`** → **`terraform.tfvars`**, **`terraform init -backend=false`**, **`terraform apply`**; from repo root **`npm run build`** + **`aws s3 sync`** + invalidation using **`terraform output`**.

**Files:** **`backend.hcl.example`**, **`terraform.tfvars.example`**, **`pipeline/terraform.tfvars.example`** (all placeholders; real **`*.tfvars`** and **`backend.hcl`** are gitignored).

---

## 6. Security & Git hygiene

- **Never commit:** `.env`, `.env.local`, `.env.*.local`, AWS access keys, or session tokens.
- **`.gitignore`** excludes `.env*` variants, **`infra/cloudformation/.packaged/`**, **`infra/cloudformation/pipeline/pipeline-params.json`** (use the **`.example.json`** in git as a template), and **`.cursor/`** (editor-local; do not commit).
- Prefer **IAM roles / SSO** locally; rotate anything accidentally committed.

---

## 7. References

| Resource | URL / path |
|----------|------------|
| **GitHub repository** | [https://github.com/OrieBound/heatfx-serverless](https://github.com/OrieBound/heatfx-serverless) |
| **In-app narrative** | `/why` (Why HeatFX), `/stack` (HeatFX Stack), `/about` (user guide) |
| **Infra deep dive** | [`infra/README.md`](../infra/README.md) |
| **Terraform: clone → deploy → CloudFront** | [`infra/terraform/README.md`](../infra/terraform/README.md) |
| **Local + build notes** | [`README.md`](../README.md) |
| **Pipeline template (CloudFormation)** | [`infra/cloudformation/pipeline/pipeline.yaml`](../infra/cloudformation/pipeline/pipeline.yaml) |
| **CI build spec (CloudFormation)** | [`buildspec.yml`](../buildspec.yml) |
| **CI build spec (Terraform)** | [`buildspec.terraform.yml`](../buildspec.terraform.yml) |
| **Architecture diagram (image)** | [`docs/heatfx-serverless-architecture.jpg`](heatfx-serverless-architecture.jpg) (also embedded in root [`README.md`](../README.md)) |

---

## 8. Using this spec on your public website

Pull **short, accurate** lines from **§1** (what it is + recording caps), **§2** (themes table or opening question), and **§3.1** (one stack paragraph). Suggested guardrails:

- **Do say:** event-based replay (not video), heatmap + replay + details, serverless on AWS (static site + API + auth + storage), open source / self-hostable, optional GitHub → pipeline.
- **Do not say:** a single fixed “60 second” cap for everyone—use **§1** caps instead.
- **Soften:** absolute “zero cost” / “always free tier”—use **economics** wording from the updated theme row or “very low cost at modest traffic.”
- **Link:** GitHub repo + `/why`, `/stack`, `/about` for depth; root **README** for clone/build; **infra** READMEs for deploy only if you have a “Technical” page.
