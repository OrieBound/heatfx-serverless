# HeatFX AWS infrastructure

Infrastructure as Code for the HeatFX static app (S3/CloudFront), Cognito auth, API Gateway HTTP API + Lambda, DynamoDB session index, and S3 recording payloads.

## How deploy works

You keep **all templates in the repo** (local paths). **One** logical deploy uses:

1. **`aws cloudformation package`** — uploads nested stack templates and the Lambda zip to an **S3 bucket in your account**, rewrites `TemplateURL` / `Code` to those S3 keys, and writes a **packaged** parent template (default: `infra/cloudformation/.packaged/parent.yaml`, gitignored).
2. **`aws cloudformation deploy`** — creates or updates **one parent stack** (e.g. `heatfx-dev`). That stack creates four **nested** stacks: data, auth, API, frontend.

No dependency on anyone else’s bucket. The **packaging** bucket is yours; choose any globally unique bucket name you control.

## Directory layout

```
infra/
├── README.md                 # This file
├── cloudformation/
│   ├── parent.yaml           # Root stack (nested children)
│   ├── stacks/               # Nested templates (data, auth, frontend)
│   │   ├── data.yaml
│   │   ├── auth.yaml
│   │   └── frontend.yaml
│   ├── nested/
│   │   └── api.yaml          # HTTP API + Lambda (plain CloudFormation)
│   ├── api/
│   │   └── src/              # Lambda handler (Node 20)
│   └── .gitignore            # ignores .packaged/
└── terraform/                # Reserved (see terraform/README.md)
```

## What gets created

| Nested stack | Template | Resources |
|--------------|----------|-----------|
| **Data** | `stacks/data.yaml` | Private S3 recordings bucket; DynamoDB `heatfx-{env}-sessions` (`pk` / `sk`). |
| **Auth** | `stacks/auth.yaml` | Cognito User Pool + SPA client; Hosted UI domain prefix. |
| **API** | `nested/api.yaml` | HTTP API (JWT authorizer), Lambda (`GET /health`, `ANY /api/{proxy+}`). |
| **Frontend** | `stacks/frontend.yaml` | Static site bucket; CloudFront + OAC. |

## Prerequisites

- AWS CLI v2, authenticated (e.g. `aws sso login --profile your-profile`).
- An S3 bucket name chosen for CloudFormation artifact uploads (`PACKAGING_BUCKET`). **The script creates it** in your account if it does not exist — no manual step needed. All app infrastructure (recordings bucket, site bucket, DynamoDB, etc.) is created by the stacks themselves.

## Recommended: script from repo root

```bash
export AWS_PROFILE=your-profile
export AWS_REGION=us-east-1
export ENV=dev
export PACKAGING_BUCKET=your-cfn-artifacts-bucket
export COGNITO_DOMAIN_PREFIX=heatfx-yourname-dev   # globally unique

./scripts/deploy-aws.sh
```

PowerShell: set `env:PACKAGING_BUCKET`, `env:COGNITO_DOMAIN_PREFIX`, then `.\scripts\deploy-aws.ps1`.

Parent stack name: **`heatfx-${ENV}`** (for example `heatfx-dev`).

## Manual: package + deploy

From **repo root**:

```bash
export AWS_REGION=us-east-1
export PACKAGING_BUCKET=your-cfn-artifacts-bucket
mkdir -p infra/cloudformation/.packaged

aws cloudformation package \
  --template-file infra/cloudformation/parent.yaml \
  --s3-bucket "${PACKAGING_BUCKET}" \
  --region "${AWS_REGION}" \
  --output-template-file infra/cloudformation/.packaged/parent.yaml

aws cloudformation deploy \
  --stack-name heatfx-dev \
  --template-file infra/cloudformation/.packaged/parent.yaml \
  --parameter-overrides \
    Environment=dev \
    CognitoDomainPrefix=YOUR_UNIQUE_PREFIX \
    AppCallbackUrls=http://localhost:3000/auth/callback \
    AppLogoutUrls=http://localhost:3000/ \
    CorsAllowOrigin=* \
  --capabilities CAPABILITY_IAM \
  --region "${AWS_REGION}"
```

After you have a CloudFront URL, update **Auth** callback/logout URLs (redeploy with new `AppCallbackUrls` / `AppLogoutUrls`) and set **`CorsAllowOrigin`** to that origin for tighter CORS.

## Publish the static site

```bash
npm run build
aws cloudformation describe-stacks --stack-name heatfx-prod --query "Stacks[0].Outputs" --output table
# Sync out/ to SiteBucketName; invalidate CloudFrontDistributionId
aws s3 sync out/ "s3://SITE_BUCKET/" --delete
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"
```

## Outputs

```bash
aws cloudformation describe-stacks --stack-name heatfx-prod \
  --query "Stacks[0].Outputs" --output table
```

Use **HttpApiUrl**, **UserPoolId**, **UserPoolClientId**, **CloudFrontDomainName**, and bucket names in `.env.local` / CI.

## CodePipeline (prod, us-east-1)

Template **[cloudformation/pipeline/pipeline.yaml](cloudformation/pipeline/pipeline.yaml)** creates **CodePipeline** + **CodeBuild** using your **CodeConnections** GitHub link. **`buildspec.yml`** (repo root) deploys **`heatfx-prod`**, then builds Next.js from **stack outputs**, syncs **`out/`**, invalidates CloudFront.

1. Use **prod** credentials: `aws sts get-caller-identity` should show account **809575175638** (or your current prod).
2. Copy **[cloudformation/pipeline/pipeline-params.example.json](cloudformation/pipeline/pipeline-params.example.json)** → **`pipeline-params.json`**; set a **globally unique** **`CognitoDomainPrefix`**; confirm **ConnectionArn** and **FullRepositoryId**.
3. Deploy: **`./scripts/deploy-pipeline.sh`** or **`.\scripts\deploy-pipeline.ps1`**. The script **refuses to run** unless `sts get-caller-identity` is account **809575175638** (override with **`HEATFX_EXPECT_PIPELINE_ACCOUNT`** or **`HEATFX_SKIP_PIPELINE_ACCOUNT_CHECK=1`** if you know what you are doing). Raw **`aws cloudformation deploy`** has no such guard.

Push to **`main`** to run the pipeline, or **Release change** in the console. After the first app URL exists, add CloudFront **https** URLs to **`AppCallbackUrls` / `AppLogoutUrls` / `CorsAllowOrigin`** in **`pipeline-params.json`** and redeploy the **heatfx-pipeline** stack.

## Tear down

Delete the **parent** stack (`heatfx-prod`). CloudFormation removes nested stacks and their resources. Empty the recordings bucket if versioning/objects block deletion. Delete **heatfx-pipeline** separately if you created it.
