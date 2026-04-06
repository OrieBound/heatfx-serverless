# HeatFX — Product & technical specification

**Status:** Development / portfolio reference — suitable for personal prod testing; backend–frontend integration is still evolving (see *Current limitations*).  
**Source:** [github.com/OrieBound/heatfx-serverless](https://github.com/OrieBound/heatfx-serverless)

---

## 1. What HeatFX is

HeatFX is a **serverless web application** that lets a user **record mouse activity** on a grid (up to about **60 seconds**), then inspect the session as a **heatmap** and a **time-based replay** of the cursor. The goal is to make interaction data **visible and replayable** without capturing screen video—only **events** (positions, clicks, drags, timestamps, etc.).

The same project doubles as a **reference architecture**: static site on **S3 + CloudFront**, **API Gateway + Lambda**, **DynamoDB**, **S3** for payloads, **Cognito** for auth, all defined in **CloudFormation** and deployable from the repo.

---

## 2. Why HeatFX exists (“Why” page — themes)

These themes align with the copy on the in-app **Why HeatFX** page (`/why`).

| Theme | Summary |
|--------|--------|
| **Invisible data, made visible** | Pointer events are generated constantly; HeatFX surfaces them as heatmaps and replays without embedding traditional page analytics. |
| **Replay without video** | Stores **event streams**, not pixels—lightweight, no screen capture, replay driven by timestamps (e.g. `requestAnimationFrame` on the client). |
| **Serverless reference** | End-to-end example: auth, API, DB, object storage, CDN, IaC wired together—not a single isolated Lambda demo. |
| **Serverless economics** | Pay-per-use services; low traffic can sit near **zero** when idle (free-tier framing as in the app copy). |
| **Usability and polish** | Intended to be **fun to use** (themes, replay, interaction) as well as technically interesting. |
| **Open & self-hostable** | Full source and templates on GitHub; deploy into **your** AWS account. |

**Opening question (from the app):** *Can you replay exactly what a user did on a page—without recording a video?* HeatFX implements that idea and expands it into a full cloud stack.

---

## 3. How it’s built (“Stack” page + repo layout)

### 3.1 Architecture overview

- **Frontend:** **Next.js 14** (App Router), **TypeScript**, **React 18**, **static export** (`output: 'export'`) → plain files in `out/` served from **S3** behind **CloudFront** (no Node server at runtime for the UI).
- **Backend:** One **Node.js 20** **Lambda** behind **API Gateway (HTTP API)**; **JWT authorizer** can validate **Cognito** tokens before the handler runs.
- **Data:** **DynamoDB** for session **metadata**; **S3** for **raw event JSON** (e.g. under session-oriented keys); presigned URLs for controlled reads where implemented.
- **Auth:** **Amazon Cognito** User Pool + app client; the in-app **Stack** page describes **custom auth pages** and SRP via **`amazon-cognito-identity-js`**; CloudFormation still provisions a **Cognito domain prefix** (Hosted UI–related) for flexibility and OAuth-style configuration.
- **Infrastructure:** **CloudFormation** **parent stack** with **four nested stacks**: **data**, **auth**, **api**, **frontend**. Templates live under `infra/cloudformation/` (see `parent.yaml`, `stacks/`, `nested/`).

### 3.2 Frontend (high level)

- **Canvas** for heatmap rendering; **replay loop** driven by timestamps, not video decode.
- **Inline / CSS variables** for theming (no large CSS framework in the Stack page description).
- **Contexts** for shared state (e.g. recording settings, cursor color).

### 3.3 Repository map (conceptual)

| Area | Location |
|------|----------|
| Next.js app | `app/`, `components/`, `contexts/` |
| IaC | `infra/cloudformation/` |
| Lambda source | `infra/cloudformation/api/src/` |
| Deploy automation | `scripts/deploy-aws.sh`, `scripts/deploy-aws.ps1` |
| Infra narrative | `infra/README.md` |

### 3.4 Current limitations (honest status)

The root **README** implementation table still lists items such as **full backend session ingest/finalize**, **results loading from API**, and **complete auth/session management UX** as **pending** or **partial**, with **sessionStorage** used for some flows until wiring is complete. Treat production use as **your own validation** until those milestones match your needs.

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
2. Move, click, and drag in the **grid** for up to **~60 seconds** (or stop early).
3. Open **View results**.
4. **Heatmap** tab: density and related controls.
5. **Replay** tab: playback speed, scrubber, timestamp-driven cursor motion.

Copy **`.env.example`** to **`.env.local`** and set **`NEXT_PUBLIC_*`** when pointing at a deployed API and Cognito (see deploy outputs below). **Do not commit** `.env.local` (it is gitignored).

---

## 5. Deploying HeatFX in another AWS account

This is the **minimal path** a third party would follow; details match **`infra/README.md`** and the deploy scripts.

### 5.1 Prerequisites

- **AWS account** they control.
- **AWS CLI v2** installed and authenticated (e.g. `aws sso login --profile <profile>`).
- **Node.js** for `npm run build`.
- A **globally unique** S3 bucket name for CloudFormation **artifact uploads** (`PACKAGING_BUCKET`). The script can **create** this bucket if it does not exist.
- A **globally unique** **`COGNITO_DOMAIN_PREFIX`** (Cognito hosted domain prefix requirement).

### 5.2 One-command infrastructure deploy (recommended)

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
3. Runs **`aws cloudformation deploy`** on **`heatfx-${ENV}`** (e.g. `heatfx-dev`).

### 5.3 Parameters they should plan for

| Parameter | Role |
|-----------|------|
| `Environment` | Suffix for naming (default `dev`). |
| `CognitoDomainPrefix` | **Required**, globally unique. |
| `AppCallbackUrls` / `AppLogoutUrls` | OAuth/Cognito redirects; start with localhost; after CloudFront exists, **redeploy** with production URLs. |
| `CorsAllowOrigin` | API CORS; `*` for early dev; tighten to the **CloudFront HTTPS origin** for production. |

### 5.4 Publish the static frontend

After the stack succeeds:

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

### 5.5 Tear-down

Delete the **parent** stack (e.g. `heatfx-dev`). Empty **S3** buckets if deletion is blocked by contents.

---

## 6. Security & Git hygiene

- **Never commit:** `.env`, `.env.local`, `.env.*.local`, AWS access keys, or session tokens.
- **`.gitignore`** already excludes `.env*` variants and **`infra/cloudformation/.packaged/`**.
- Prefer **IAM roles / SSO** locally; rotate anything accidentally committed.

---

## 7. References

| Resource | URL / path |
|----------|------------|
| **GitHub repository** | [https://github.com/OrieBound/heatfx-serverless](https://github.com/OrieBound/heatfx-serverless) |
| **In-app narrative** | `/why` (Why HeatFX), `/stack` (HeatFX Stack) |
| **Infra deep dive** | [`infra/README.md`](../infra/README.md) |
| **Local + build notes** | [`README.md`](../README.md) |
