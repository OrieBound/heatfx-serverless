#!/usr/bin/env bash
# Run Terraform for the correct root from anywhere inside this git repo.
# Usage:
#   bash scripts/tf.sh pipeline init
#   bash scripts/tf.sh pipeline apply -var-file=terraform.tfvars
#   bash scripts/tf.sh app init -backend-config=backend.hcl
#   bash scripts/tf.sh app plan -var-file=terraform.tfvars

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "error: not inside a git repository (git rev-parse failed)" >&2
  exit 1
}

stack="${1:-}"
if [[ -z "$stack" ]]; then
  echo "usage: $0 {pipeline|app} <terraform args...>" >&2
  echo "  pipeline  -> $ROOT/infra/terraform/pipeline" >&2
  echo "  app       -> $ROOT/infra/terraform" >&2
  exit 1
fi
shift

case "$stack" in
  pipeline)
    cd "$ROOT/infra/terraform/pipeline"
    ;;
  app)
    cd "$ROOT/infra/terraform"
    ;;
  *)
    echo "usage: first argument must be pipeline or app, got: $stack" >&2
    exit 1
    ;;
esac

exec terraform "$@"
