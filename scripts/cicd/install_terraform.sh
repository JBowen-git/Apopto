#!/usr/bin/env bash

set -euo pipefail

TERRAFORM_VERSION="${1:-1.10.5}"
INSTALL_DIR="$HOME/.local/bin"
TERRAFORM_BIN="${INSTALL_DIR}/terraform"

mkdir -p "${INSTALL_DIR}"

if command -v terraform >/dev/null 2>&1; then
  current_version="$(terraform version -json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["terraform_version"])' || true)"
  if [ "${current_version}" = "${TERRAFORM_VERSION}" ]; then
    exit 0
  fi
fi

if [ -x "${TERRAFORM_BIN}" ]; then
  current_version="$("${TERRAFORM_BIN}" version -json 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin)["terraform_version"])' || true)"
  if [ "${current_version}" = "${TERRAFORM_VERSION}" ]; then
    export PATH="${INSTALL_DIR}:$PATH"
    exit 0
  fi
fi

archive_path="/tmp/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
curl -fsSL \
  "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip" \
  -o "${archive_path}"
unzip -qo "${archive_path}" -d "${INSTALL_DIR}"
chmod +x "${TERRAFORM_BIN}"
