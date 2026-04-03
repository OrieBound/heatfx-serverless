#!/usr/bin/env bash
# Deploy the HeatFX CloudFormation parent stack.
# Usage:
#   export AWS_PROFILE=orie-dev
#   export COGNITO_DOMAIN_PREFIX=heatfx-yourname-dev
#   ./scripts/deploy-aws.sh
set -euo pipefail

ENV="${ENV:-dev}"
AWS_REGION="${AWS_REGION:-us-east-1}"
PACKAGING_BUCKET="${PACKAGING_BUCKET:-heatfx-cfn-artifacts}"
COGNITO_DOMAIN_PREFIX="${COGNITO_DOMAIN_PREFIX:?'Set COGNITO_DOMAIN_PREFIX env var'}"
APP_CALLBACK_URLS="${APP_CALLBACK_URLS:-http://localhost:3000/auth/callback}"
APP_LOGOUT_URLS="${APP_LOGOUT_URLS:-http://localhost:3000/}"
CORS_ALLOW_ORIGIN="${CORS_ALLOW_ORIGIN:-*}"
STACK_NAME="heatfx-${ENV}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_DIR="$REPO_ROOT/infra/cloudformation"
PACKAGED_TPL="$TEMPLATE_DIR/.packaged/parent.yaml"

# Build common aws cli args (--profile is optional)
AWS_ARGS=(--region "$AWS_REGION")
if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS_ARGS+=(--profile "$AWS_PROFILE")
fi

echo ""
echo "==> Config"
echo "    Environment         : $ENV"
echo "    Region              : $AWS_REGION"
echo "    Profile             : ${AWS_PROFILE:-'(default)'}"
echo "    PackagingBucket     : $PACKAGING_BUCKET"
echo "    CognitoDomainPrefix : $COGNITO_DOMAIN_PREFIX"
echo "    Stack               : $STACK_NAME"

# ── 1. ensure packaging bucket ─────────────────────────────────────────────────
echo ""
echo "==> Ensuring packaging bucket: $PACKAGING_BUCKET"

if ! aws s3api head-bucket --bucket "$PACKAGING_BUCKET" "${AWS_ARGS[@]}" 2>/dev/null; then
  echo "    Creating bucket..."
  if [[ "$AWS_REGION" == "us-east-1" ]]; then
    aws s3api create-bucket --bucket "$PACKAGING_BUCKET" "${AWS_ARGS[@]}"
  else
    aws s3api create-bucket --bucket "$PACKAGING_BUCKET" \
      --create-bucket-configuration LocationConstraint="$AWS_REGION" \
      "${AWS_ARGS[@]}"
  fi
  echo "    OK  Bucket created."
else
  echo "    OK  Bucket already exists."
fi

# ── 2. package ─────────────────────────────────────────────────────────────────
echo ""
echo "==> Packaging templates + Lambda"
mkdir -p "$(dirname "$PACKAGED_TPL")"

aws cloudformation package \
  --template-file "$TEMPLATE_DIR/parent.yaml" \
  --s3-bucket "$PACKAGING_BUCKET" \
  --output-template-file "$PACKAGED_TPL" \
  "${AWS_ARGS[@]}"

echo "    OK  Packaged -> $PACKAGED_TPL"

# ── 3. deploy ──────────────────────────────────────────────────────────────────
echo ""
echo "==> Deploying stack: $STACK_NAME"

aws cloudformation deploy \
  --stack-name "$STACK_NAME" \
  --template-file "$PACKAGED_TPL" \
  --parameter-overrides \
    "Environment=$ENV" \
    "CognitoDomainPrefix=$COGNITO_DOMAIN_PREFIX" \
    "AppCallbackUrls=$APP_CALLBACK_URLS" \
    "AppLogoutUrls=$APP_LOGOUT_URLS" \
    "CorsAllowOrigin=$CORS_ALLOW_ORIGIN" \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  "${AWS_ARGS[@]}"

echo "    OK  Stack $STACK_NAME deployed."

# ── 4. outputs ─────────────────────────────────────────────────────────────────
echo ""
echo "==> Stack outputs"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs" \
  --output table \
  "${AWS_ARGS[@]}"
