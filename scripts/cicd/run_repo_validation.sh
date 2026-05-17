#!/usr/bin/env bash

set -euo pipefail

export PATH="$HOME/.local/bin:$PATH"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FRONTEND_DIR="${FRONTEND_DIR:-Frontend}"
BACKEND_PROJECT_PATH="${BACKEND_PROJECT_PATH:-Backend}"
BACKEND_PUBLISH_PROJECT_PATH="${BACKEND_PUBLISH_PROJECT_PATH:-}"
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

bash "${ROOT_DIR}/scripts/cicd/install_terraform.sh" "${TERRAFORM_VERSION:-1.10.5}"

pushd "${ROOT_DIR}/${FRONTEND_DIR}" >/dev/null
npm ci
npm run lint --if-present
PRERENDER_SITE_ORIGIN="${PRERENDER_SITE_ORIGIN:-https://example.com}" npm run build:ssr
popd >/dev/null

dotnet build "$(resolve_backend_publish_project)"

if find "${ROOT_DIR}/${BACKEND_PROJECT_PATH}" -name '*Tests.csproj' -print -quit | grep -q .; then
  while IFS= read -r test_project; do
    dotnet test "${test_project}"
  done < <(find "${ROOT_DIR}/${BACKEND_PROJECT_PATH}" -name '*Tests.csproj' -print)
fi

terraform -chdir="${ROOT_DIR}" fmt -check -recursive

mkdir -p "${TERRAFORM_VALIDATION_DATA_DIR}/bootstrap" "${TERRAFORM_VALIDATION_DATA_DIR}/app"

TF_DATA_DIR="${TERRAFORM_VALIDATION_DATA_DIR}/bootstrap" terraform -chdir="${ROOT_DIR}/Terraform/Bootstrap" init -backend=false -input=false
TF_DATA_DIR="${TERRAFORM_VALIDATION_DATA_DIR}/bootstrap" terraform -chdir="${ROOT_DIR}/Terraform/Bootstrap" validate

TF_DATA_DIR="${TERRAFORM_VALIDATION_DATA_DIR}/app" terraform -chdir="${ROOT_DIR}/Terraform/App" init -backend=false -input=false
TF_DATA_DIR="${TERRAFORM_VALIDATION_DATA_DIR}/app" terraform -chdir="${ROOT_DIR}/Terraform/App" validate
