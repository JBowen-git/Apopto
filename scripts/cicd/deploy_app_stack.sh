#!/usr/bin/env bash

set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_ENVIRONMENT="${APP_ENVIRONMENT:-staging}"
APP_STACK_DIRECTORY="${APP_STACK_DIRECTORY:-Terraform/App}"
APP_STACK_PATH="${ROOT_DIR}/${APP_STACK_DIRECTORY}"
BACKEND_CONFIG_FILE="${BACKEND_CONFIG_FILE:-backends/${APP_ENVIRONMENT}.hcl}"
TFVARS_FILE="${TFVARS_FILE:-environments/${APP_ENVIRONMENT}.tfvars}"
TERRAFORM_ACTION="${TERRAFORM_ACTION:-apply}"
RUN_CLOUDFRONT_INVALIDATION="${RUN_CLOUDFRONT_INVALIDATION:-false}"

source "${ROOT_DIR}/scripts/cicd/aws_runtime.sh"

use_staged_frontend_assets_if_available() {
  local staged_site_root="${APP_STACK_PATH}/.artifacts/site"
  local staged_renderer_root="${APP_STACK_PATH}/.artifacts/site-renderer"

  if [ -d "${staged_site_root}" ] && [ -z "${TF_VAR_site_asset_root:-}" ]; then
    export TF_VAR_site_asset_root=".artifacts/site"
    echo "Using staged frontend assets from ${staged_site_root}."
  fi

  if [ -d "${staged_renderer_root}" ] && [ -z "${TF_VAR_site_renderer_asset_root:-}" ]; then
    export TF_VAR_site_renderer_asset_root=".artifacts/site-renderer"
    echo "Using staged site renderer assets from ${staged_renderer_root}."
  fi
}

trigger_site_renderer_if_requested() {
  local queue_url
  local build_id
  local published_at
  local message_body

  if [ "${RUN_SITE_RENDERER:-false}" != "true" ]; then
    return 0
  fi

  queue_url="$(terraform -chdir="${APP_STACK_PATH}" output -raw site_renderer_queue_url 2>/dev/null || true)"
  build_id="$(terraform -chdir="${APP_STACK_PATH}" output -raw site_renderer_build_id 2>/dev/null || true)"

  if [ -z "${queue_url}" ] || [ -z "${build_id}" ] || [ "${build_id}" = "null" ]; then
    echo "Skipping site renderer trigger because queue URL or build ID was not available."
    return 0
  fi

  published_at="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  message_body="{\"buildId\":\"${build_id}\",\"publishedAt\":\"${published_at}\",\"trigger\":\"github-actions-${APP_ENVIRONMENT}\"}"

  aws sqs send-message \
    --queue-url "${queue_url}" \
    --message-body "${message_body}" >/dev/null

  echo "Queued site renderer build ${build_id} for ${APP_ENVIRONMENT}."
}

ensure_aws_region_defaults
bash "${ROOT_DIR}/scripts/cicd/install_terraform.sh" "${TERRAFORM_VERSION:-1.10.5}"
assume_role_if_requested "${TERRAFORM_ACTION}"
export_ssm_parameters_if_requested
validate_required_ssm_parameters_if_requested
use_staged_frontend_assets_if_available

export TF_IN_AUTOMATION=1

terraform -chdir="${APP_STACK_PATH}" init -input=false -backend-config="${BACKEND_CONFIG_FILE}"

terraform_command=(terraform "-chdir=${APP_STACK_PATH}" "${TERRAFORM_ACTION}" -input=false "-var-file=${TFVARS_FILE}")

if [ "${TERRAFORM_ACTION}" = "apply" ] && [ "${TERRAFORM_AUTO_APPROVE:-true}" = "true" ]; then
  terraform_command+=(-auto-approve)
fi

if [ "${TERRAFORM_ACTION}" = "plan" ] && [ -n "${TERRAFORM_PLAN_OUT:-}" ]; then
  terraform_command+=("-out=${TERRAFORM_PLAN_OUT}")
fi

"${terraform_command[@]}"

if [ "${TERRAFORM_ACTION}" != "apply" ]; then
  exit 0
fi

if [ "${RUN_CLOUDFRONT_INVALIDATION}" = "true" ]; then
  DISTRIBUTION_ID="$(terraform -chdir="${APP_STACK_PATH}" output -raw cloudfront_distribution_id)"
  if [ -n "${DISTRIBUTION_ID}" ]; then
    IFS=' ' read -r -a INVALIDATION_PATHS <<<"${CLOUDFRONT_INVALIDATION_PATHS:-/ /index.html /sitemap.xml /robots.txt /llms.txt /assets/* /about /about/* /contact /contact/*}"

    aws cloudfront create-invalidation \
      --distribution-id "${DISTRIBUTION_ID}" \
      --paths "${INVALIDATION_PATHS[@]}"
  fi
fi

trigger_site_renderer_if_requested
