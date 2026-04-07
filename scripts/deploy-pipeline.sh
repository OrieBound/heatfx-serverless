#!/usr/bin/env bash
# Deploy heatfx-pipeline stack (CodePipeline + CodeBuild) in the CURRENT AWS account/region.
# Prerequisites: AWS CLI v2, prod profile; CodeConnections GitHub link available; buildspec.yml on branch.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGION="${AWS_REGION:-us-east-1}"
PARAMS="${ROOT}/infra/cloudformation/pipeline/pipeline-params.json"
EXAMPLE="${ROOT}/infra/cloudformation/pipeline/pipeline-params.example.json"

AWS_ARGS=(--region "$REGION")
if [[ -n "${AWS_PROFILE:-}" ]]; then
  AWS_ARGS+=(--profile "$AWS_PROFILE")
fi

ACCOUNT="$(aws sts get-caller-identity --query Account --output text "${AWS_ARGS[@]}")"
EXPECT="${HEATFX_EXPECT_PIPELINE_ACCOUNT:-809575175638}"
echo "Account (caller): $ACCOUNT"
echo "Region: $REGION"

if [[ -z "${HEATFX_SKIP_PIPELINE_ACCOUNT_CHECK:-}" && "$ACCOUNT" != "$EXPECT" ]]; then
  echo "ERROR: Wrong AWS account ($ACCOUNT). This pipeline is meant for prod account $EXPECT."
  echo "Log in with your prod SSO profile, or set HEATFX_EXPECT_PIPELINE_ACCOUNT to match your target account,"
  echo "or HEATFX_SKIP_PIPELINE_ACCOUNT_CHECK=1 to override (not recommended)."
  exit 1
fi

if [[ ! -f "$PARAMS" ]]; then
  if [[ ! -f "$EXAMPLE" ]]; then
    echo "Missing $PARAMS and $EXAMPLE"
    exit 1
  fi
  cp "$EXAMPLE" "$PARAMS"
  echo "Created $PARAMS from pipeline-params.example.json — edit if needed."
fi

# Git Bash on Windows: use file://D:/path (two slashes after "file:"). file:///D:/... becomes /D:/... and breaks (Errno 22).
PARAMS_URI="file://$PARAMS"
if command -v cygpath >/dev/null 2>&1; then
  W="$(cygpath -w "$PARAMS" 2>/dev/null || true)"
  if [[ -n "$W" ]]; then
    W="${W//\\//}"
    PARAMS_URI="file://$W"
  fi
fi

aws cloudformation deploy \
  --stack-name heatfx-pipeline \
  --template-file "$ROOT/infra/cloudformation/pipeline/pipeline.yaml" \
  --capabilities CAPABILITY_NAMED_IAM CAPABILITY_IAM \
  --parameter-overrides "$PARAMS_URI" \
  "${AWS_ARGS[@]}"

echo ""
aws cloudformation describe-stacks \
  --stack-name heatfx-pipeline \
  --query "Stacks[0].Outputs" \
  --output table \
  "${AWS_ARGS[@]}"
