#!/usr/bin/env bash

set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_ENVIRONMENT="${APP_ENVIRONMENT:-staging}"
FRONTEND_DIR="${FRONTEND_DIR:-Frontend}"
BACKEND_PROJECT_PATH="${BACKEND_PROJECT_PATH:-Backend}"
BACKEND_PUBLISH_PROJECT_PATH="${BACKEND_PUBLISH_PROJECT_PATH:-}"
SHARED_PACKAGE_PATH="${SHARED_PACKAGE_PATH:-Shared}"
RUN_ARTIFACT_PACKAGE_VALIDATION="${RUN_ARTIFACT_PACKAGE_VALIDATION:-true}"
TERRAFORM_VALIDATION_DATA_DIR="$(mktemp -d "${TMPDIR:-/tmp}/apopto-terraform-validation.XXXXXX")"

cleanup() {
  rm -rf "${TERRAFORM_VALIDATION_DATA_DIR}"
}

trap cleanup EXIT

resolve_backend_publish_project() {
  local candidate="${BACKEND_PUBLISH_PROJECT_PATH:-${ROOT_DIR}/${BACKEND_PROJECT_PATH}}"
  local project

  if [ -f "${candidate}" ]; then
    printf '%s\n' "${candidate}"
    return 0
  fi

  if [ ! -d "${candidate}" ]; then
    echo "Backend project path was not found: ${candidate}" >&2
    return 1
  fi

  project="$(find "${candidate}" \
    -path '*/bin' -prune -o \
    -path '*/obj' -prune -o \
    -name '*Tests.csproj' -prune -o \
    -name '*.csproj' -print | sort | head -n 1)"

  if [ -z "${project}" ]; then
    echo "No publishable backend .csproj was found under ${candidate}." >&2
    return 1
  fi

  printf '%s\n' "${project}"
}

build_shared_package() {
  local shared_package_dir="${ROOT_DIR}/${SHARED_PACKAGE_PATH}"

  if [ ! -f "${shared_package_dir}/package.json" ]; then
    echo "Shared package was not found: ${shared_package_dir}/package.json" >&2
    return 1
  fi

  npm --prefix "${shared_package_dir}" ci
  npm --prefix "${shared_package_dir}" run build
  npm --prefix "${shared_package_dir}" run typecheck
  npm --prefix "${shared_package_dir}" run test
}

validate_typescript_backend() {
  local backend_package_dir="${ROOT_DIR}/${BACKEND_PROJECT_PATH}"

  if [ ! -f "${backend_package_dir}/package.json" ]; then
    echo "Skipping TypeScript backend validation because ${backend_package_dir}/package.json was not found."
    return 0
  fi

  npm --prefix "${backend_package_dir}" ci
  npm --prefix "${backend_package_dir}" run build
  npm --prefix "${backend_package_dir}" run typecheck
  npm --prefix "${backend_package_dir}" run test
}

validate_frontend() {
  local frontend_dir="${ROOT_DIR}/${FRONTEND_DIR}"

  npm --prefix "${frontend_dir}" ci
  npm --prefix "${frontend_dir}" run lint --if-present
  npm --prefix "${frontend_dir}" run typecheck
  npm --prefix "${frontend_dir}" run test
  PRERENDER_SITE_ORIGIN="${PRERENDER_SITE_ORIGIN:-https://example.com}" npm --prefix "${frontend_dir}" run build:ssr
}

validate_dotnet_backend() {
  local backend_publish_project

  backend_publish_project="$(resolve_backend_publish_project)"

  dotnet build "${backend_publish_project}"

  if find "${ROOT_DIR}/${BACKEND_PROJECT_PATH}" -name '*Tests.csproj' -print -quit | grep -q .; then
    while IFS= read -r test_project; do
      dotnet test "${test_project}"
    done < <(find "${ROOT_DIR}/${BACKEND_PROJECT_PATH}" -name '*Tests.csproj' -print)
  fi
}

validate_release_packaging() {
  if [ "${RUN_ARTIFACT_PACKAGE_VALIDATION}" != "true" ]; then
    echo "Skipping artifact package validation because RUN_ARTIFACT_PACKAGE_VALIDATION=${RUN_ARTIFACT_PACKAGE_VALIDATION}."
    return 0
  fi

  APP_ENVIRONMENT="${APP_ENVIRONMENT}" \
    PRERENDER_SITE_ORIGIN="${PRERENDER_SITE_ORIGIN:-https://example.com}" \
    bash "${ROOT_DIR}/scripts/cicd/package_release_artifacts.sh"
}

validate_terraform() {
  bash "${ROOT_DIR}/scripts/cicd/install_terraform.sh" "${TERRAFORM_VERSION:-1.10.5}"

  terraform -chdir="${ROOT_DIR}" fmt -check -recursive

  mkdir -p "${TERRAFORM_VALIDATION_DATA_DIR}/bootstrap" "${TERRAFORM_VALIDATION_DATA_DIR}/app"

  TF_DATA_DIR="${TERRAFORM_VALIDATION_DATA_DIR}/bootstrap" terraform -chdir="${ROOT_DIR}/Terraform/Bootstrap" init -backend=false -input=false
  TF_DATA_DIR="${TERRAFORM_VALIDATION_DATA_DIR}/bootstrap" terraform -chdir="${ROOT_DIR}/Terraform/Bootstrap" validate

  TF_DATA_DIR="${TERRAFORM_VALIDATION_DATA_DIR}/app" terraform -chdir="${ROOT_DIR}/Terraform/App" init -backend=false -input=false
  TF_DATA_DIR="${TERRAFORM_VALIDATION_DATA_DIR}/app" terraform -chdir="${ROOT_DIR}/Terraform/App" validate
}

echo "Validating shared package..."
build_shared_package

echo "Validating TypeScript backend..."
validate_typescript_backend

echo "Validating legacy .NET backend..."
validate_dotnet_backend

echo "Validating frontend and marketing prerender build..."
validate_frontend

echo "Validating release artifact packaging..."
validate_release_packaging

echo "Validating Terraform formatting and schemas..."
validate_terraform
