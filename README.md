# HeatFX

Serverless web app that records mouse interactions on a grid (up to 60s), then shows a **heatmap** and **replay**.

## Local dev

No build step needed—just run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Changes are picked up automatically.

- **Recording**: Click Start → 3-2-1 countdown → move/click/drag in the grid → Stop (or auto-stop at 60s). Then **View results**.
- **Results**: Heatmap tab (density + toggles, drag rects/path) and Replay tab (timestamp playback, speed, scrubber). Data is stored in `sessionStorage` until the backend is deployed.

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, static export for S3/CloudFront.
- **Backend**: API Gateway HTTP API, Lambda, DynamoDB, S3, Cognito. Templates live under `infra/cloudformation/`; **`aws cloudformation package`** copies them (and Lambda code) into **your** S3 bucket, then **one** parent stack deploys nested data, auth, API, and frontend. See **[infra/README.md](infra/README.md)** and **`scripts/deploy-aws.sh`** / **`scripts/deploy-aws.ps1`**. A **Terraform** alternative is planned under `infra/terraform/` (not wired yet); use **one** of CloudFormation or Terraform per environment—see infra README.

## Implementation status

| Milestone | Status |
|-----------|--------|
| Next.js UI skeleton (grid, Start/Pause/Stop, countdown) | Done |
| Event capture (normalized coords, 60/30 Hz sampling, drag rect, scroll) | Done |
| Backend: create session, ingest chunks, finalize | Pending |
| Results: fetch chunk URLs, load events | Pending (uses sessionStorage for now) |
| Heatmap tab (classic density, toggles, themes placeholder) | Done |
| Replay tab (timestamp playback, speed, scrubber) | Done |
| Cognito auth, claim, My Sessions, viewer, delete | Pending |
| CloudFormation parent stack (nested data, auth, API, frontend) + infra README | Done (app wiring still pending) |

## Build (only when deploying)

When you’re ready to deploy the static site (S3 + CloudFront from the frontend stack), run:

```bash
npm run build
```

Output is in `out/`—sync to the bucket from the frontend stack outputs (see `infra/README.md`).

## Deploy to AWS (your account)

1. Clone the repo and configure AWS CLI (e.g. SSO profile).
2. Follow **[infra/README.md](infra/README.md)** for stack order and parameters, **or** run from repo root:

```bash
export PACKAGING_BUCKET=your-cfn-artifacts-bucket
export COGNITO_DOMAIN_PREFIX=your-unique-prefix
./scripts/deploy-aws.sh
```

On Windows PowerShell: set `env:PACKAGING_BUCKET`, `env:COGNITO_DOMAIN_PREFIX`, then `.\scripts\deploy-aws.ps1`. One parent stack creates all nested infrastructure, including the static-site bucket and CloudFront distribution.
