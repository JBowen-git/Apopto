#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_ENVIRONMENT="${APP_ENVIRONMENT:-staging}"
FRONTEND_DIR="${FRONTEND_DIR:-Frontend}"
BACKEND_PROJECT_PATH="${BACKEND_PROJECT_PATH:-Backend}"
BACKEND_PUBLISH_PROJECT_PATH="${BACKEND_PUBLISH_PROJECT_PATH:-}"
SHARED_PACKAGE_PATH="${SHARED_PACKAGE_PATH:-Shared}"
BACKEND_TYPESCRIPT_PACKAGE_PATH="${BACKEND_TYPESCRIPT_PACKAGE_PATH:-Backend}"
BACKEND_TYPESCRIPT_ARTIFACT_BASENAME="${BACKEND_TYPESCRIPT_ARTIFACT_BASENAME:-portal-api}"
PACKAGE_TYPESCRIPT_BACKEND="${PACKAGE_TYPESCRIPT_BACKEND:-true}"
APP_STACK_DIRECTORY="${APP_STACK_DIRECTORY:-Terraform/App}"
SHARED_PACKAGE_BUILT=false

source "${ROOT_DIR}/scripts/cicd/aws_runtime.sh"

require_non_empty_file() {
  local file_path="$1"

  if [ ! -s "${file_path}" ]; then
    echo "Expected artifact was not created or is empty: ${file_path}" >&2
    return 1
  fi
}

require_directory_with_files() {
  local directory_path="$1"

  if [ ! -d "${directory_path}" ]; then
    echo "Expected artifact directory was not created: ${directory_path}" >&2
    return 1
  fi

  if ! find "${directory_path}" -type f -print -quit | grep -q .; then
    echo "Expected artifact directory contains no files: ${directory_path}" >&2
    return 1
  fi
}

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

  if [ "${SHARED_PACKAGE_BUILT}" = "true" ]; then
    return 0
  fi

  if [ ! -f "${shared_package_dir}/package.json" ]; then
    echo "Shared package was not found: ${shared_package_dir}/package.json" >&2
    return 1
  fi

  npm --prefix "${shared_package_dir}" ci
  npm --prefix "${shared_package_dir}" run build

  SHARED_PACKAGE_BUILT=true
}

create_deterministic_zip() {
  local source_dir="$1"
  local output_zip="$2"

  mkdir -p "$(dirname "${output_zip}")"
  rm -f "${output_zip}"

  (
    cd "${source_dir}"
    find . -exec touch -t 198001010000.00 {} +
    find . -type f | LC_ALL=C sort | sed 's#^\./##' | zip -X -q "${output_zip}" -@
  )
}

package_typescript_backend() {
  local backend_typescript_dir="${ROOT_DIR}/${BACKEND_TYPESCRIPT_PACKAGE_PATH}"
  local shared_package_dir="${ROOT_DIR}/${SHARED_PACKAGE_PATH}"
  local node_publish_dir="$1"
  local node_zip_path="$2"

  if [ "${PACKAGE_TYPESCRIPT_BACKEND}" != "true" ]; then
    echo "Skipping TypeScript backend packaging because PACKAGE_TYPESCRIPT_BACKEND=${PACKAGE_TYPESCRIPT_BACKEND}."
    return 0
  fi

  if [ ! -f "${backend_typescript_dir}/package.json" ]; then
    echo "TypeScript backend package was not found: ${backend_typescript_dir}/package.json" >&2
    return 1
  fi

  build_shared_package
  npm --prefix "${backend_typescript_dir}" ci
  npm --prefix "${backend_typescript_dir}" run build

  rm -rf "${node_publish_dir}" "${node_zip_path}"
  mkdir -p "${node_publish_dir}/node_modules/@apopto"

  cp -R "${backend_typescript_dir}/dist/." "${node_publish_dir}/"

  printf '%s\n' \
    '{' \
    '  "name": "@apopto/backend-lambda-artifact",' \
    '  "private": true,' \
    '  "type": "module",' \
    '  "main": "./handlers/health.js"' \
    '}' >"${node_publish_dir}/package.json"

  mkdir -p "${node_publish_dir}/node_modules/@apopto/shared"
  cp "${shared_package_dir}/package.json" "${node_publish_dir}/node_modules/@apopto/shared/package.json"
  cp -R "${shared_package_dir}/dist" "${node_publish_dir}/node_modules/@apopto/shared/dist"

  if [ ! -d "${shared_package_dir}/node_modules/zod" ]; then
    echo "Shared runtime dependency was not found: ${shared_package_dir}/node_modules/zod" >&2
    return 1
  fi

  cp -R "${shared_package_dir}/node_modules/zod" "${node_publish_dir}/node_modules/zod"

  create_deterministic_zip "${node_publish_dir}" "${node_zip_path}"
}

ensure_aws_region_defaults
assume_role_if_requested "package"
export_ssm_parameters_if_requested
build_shared_package

pushd "${ROOT_DIR}/${FRONTEND_DIR}" >/dev/null
npm ci
PRERENDER_SITE_ORIGIN="${PRERENDER_SITE_ORIGIN:-https://example.com}" npm run build:ssr
popd >/dev/null

staged_site_root="${ROOT_DIR}/${APP_STACK_DIRECTORY}/.artifacts/site"
staged_renderer_root="${ROOT_DIR}/${APP_STACK_DIRECTORY}/.artifacts/site-renderer"

rm -rf "${staged_site_root}" "${staged_renderer_root}"
mkdir -p "${staged_site_root}"
cp -R "${ROOT_DIR}/${FRONTEND_DIR}/dist/." "${staged_site_root}/"
rm -rf "${staged_site_root}/server"
rm -f "${staged_site_root}/site-renderer-manifest.json" "${staged_site_root}/site-renderer-template.html"

if [ -f "${ROOT_DIR}/${APP_STACK_DIRECTORY}/site/error.html" ] && [ ! -f "${staged_site_root}/error.html" ]; then
  cp "${ROOT_DIR}/${APP_STACK_DIRECTORY}/site/error.html" "${staged_site_root}/error.html"
fi

renderer_manifest="${ROOT_DIR}/${FRONTEND_DIR}/dist/site-renderer-manifest.json"
renderer_template="${ROOT_DIR}/${FRONTEND_DIR}/dist/site-renderer-template.html"
renderer_server_dir="${ROOT_DIR}/${FRONTEND_DIR}/dist/server"

if [ -f "${renderer_manifest}" ] && [ -f "${renderer_template}" ] && [ -d "${renderer_server_dir}" ]; then
  mkdir -p "${staged_renderer_root}"
  cp "${renderer_manifest}" "${staged_renderer_root}/site-renderer-manifest.json"
  cp "${renderer_template}" "${staged_renderer_root}/site-renderer-template.html"
  cp -R "${renderer_server_dir}" "${staged_renderer_root}/server"
else
  echo "Site renderer assets were not found in ${ROOT_DIR}/${FRONTEND_DIR}/dist." >&2
fi

publish_dir="${ROOT_DIR}/Backend/artifacts/${APP_ENVIRONMENT}/publish"
zip_path="${ROOT_DIR}/Backend/artifacts/${APP_ENVIRONMENT}-backend.zip"
typescript_publish_dir="${ROOT_DIR}/Backend/artifacts/${APP_ENVIRONMENT}/${BACKEND_TYPESCRIPT_ARTIFACT_BASENAME}"
typescript_zip_path="${ROOT_DIR}/Backend/artifacts/${APP_ENVIRONMENT}-${BACKEND_TYPESCRIPT_ARTIFACT_BASENAME}.zip"
renderer_zip_dir="${ROOT_DIR}/${APP_STACK_DIRECTORY}/lambda_packages"
renderer_zip_path="${renderer_zip_dir}/site-renderer.zip"

rm -rf "${publish_dir}" "${zip_path}"
mkdir -p "${publish_dir}"

backend_publish_project="$(resolve_backend_publish_project)"

dotnet restore "${backend_publish_project}"
dotnet publish "${backend_publish_project}" \
  --configuration Release \
  --framework net10.0 \
  --output "${publish_dir}"

(
  cd "${publish_dir}"
  zip -qr "${zip_path}" .
)

package_typescript_backend "${typescript_publish_dir}" "${typescript_zip_path}"

mkdir -p "${renderer_zip_dir}"
rm -f "${renderer_zip_path}"
(
  cd "${ROOT_DIR}/${APP_STACK_DIRECTORY}/Renderer"
  zip -qr "${renderer_zip_path}" index.mjs
)

require_directory_with_files "${staged_site_root}"
require_non_empty_file "${staged_site_root}/index.html"
require_directory_with_files "${staged_renderer_root}"
require_non_empty_file "${staged_renderer_root}/site-renderer-manifest.json"
require_non_empty_file "${staged_renderer_root}/site-renderer-template.html"
require_non_empty_file "${staged_renderer_root}/server/entry-server.js"
require_non_empty_file "${zip_path}"
if [ "${PACKAGE_TYPESCRIPT_BACKEND}" = "true" ]; then
  require_non_empty_file "${typescript_zip_path}"
fi
require_non_empty_file "${renderer_zip_path}"

echo "Packaged ${APP_ENVIRONMENT} frontend and Lambda artifacts."
echo ".NET backend Lambda artifact: ${zip_path}"
if [ "${PACKAGE_TYPESCRIPT_BACKEND}" = "true" ]; then
  echo "TypeScript backend Lambda artifact: ${typescript_zip_path}"
fi
echo "Site renderer Lambda artifact: ${renderer_zip_path}"
