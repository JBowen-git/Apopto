#!/usr/bin/env bash

ensure_aws_region_defaults() {
  export AWS_REGION="${AWS_REGION:-us-east-2}"
  export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-${AWS_REGION}}"
}

assume_role_if_requested() {
  local session_suffix="${1:-runtime}"

  if [ -z "${APP_DEPLOY_ROLE_ARN:-}" ]; then
    return 0
  fi

  ensure_aws_region_defaults

  read -r AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN <<<"$(aws sts assume-role \
    --role-arn "${APP_DEPLOY_ROLE_ARN}" \
    --role-session-name "site-template-${session_suffix}-${APP_ENVIRONMENT:-staging}" \
    --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \
    --output text)"

  export AWS_ACCESS_KEY_ID
  export AWS_SECRET_ACCESS_KEY
  export AWS_SESSION_TOKEN
}

export_ssm_parameters_if_requested() {
  local exports_spec="${CICD_SSM_ENV_EXPORTS:-}"
  local export_pair
  local env_name
  local parameter_name
  local parameter_value

  if [ -z "${exports_spec}" ]; then
    return 0
  fi

  ensure_aws_region_defaults

  for export_pair in ${exports_spec}; do
    env_name="${export_pair%%=*}"
    parameter_name="${export_pair#*=}"

    if [ -z "${env_name}" ] || [ -z "${parameter_name}" ] || [ "${parameter_name}" = "${export_pair}" ]; then
      echo "Invalid CICD_SSM_ENV_EXPORTS entry: ${export_pair}" >&2
      return 1
    fi

    parameter_value="$(aws ssm get-parameter \
      --name "${parameter_name}" \
      --with-decryption \
      --query 'Parameter.Value' \
      --output text)"

    export "${env_name}=${parameter_value}"
  done
}

validate_required_ssm_parameters_if_requested() {
  local parameters_spec="${REQUIRED_RUNTIME_SSM_PARAMETERS:-}"
  local parameter_name
  local parameter_value
  local missing_count=0

  if [ -z "${parameters_spec}" ]; then
    return 0
  fi

  ensure_aws_region_defaults

  for parameter_name in ${parameters_spec}; do
    if [ -z "${parameter_name}" ]; then
      continue
    fi

    if ! parameter_value="$(aws ssm get-parameter \
      --name "${parameter_name}" \
      --with-decryption \
      --query 'Parameter.Value' \
      --output text)"; then
      echo "Required SSM parameter '${parameter_name}' could not be read." >&2
      missing_count=$((missing_count + 1))
      continue
    fi

    if [[ -z "${parameter_value//[[:space:]]/}" || "${parameter_value}" = "None" ]]; then
      echo "Required SSM parameter '${parameter_name}' is empty or whitespace only." >&2
      missing_count=$((missing_count + 1))
      continue
    fi

    echo "Validated non-empty SSM parameter '${parameter_name}'."
  done

  if [ "${missing_count}" -gt 0 ]; then
    echo "One or more required runtime SSM parameters are missing or empty." >&2
    return 1
  fi
}
