# Deployment Artifact Audit

This document records how deployment artifacts are built, where they are
staged, and what Terraform expects before plan/apply.

## Current Artifact Flow

The current release artifact flow is centered on
`scripts/cicd/package_release_artifacts.sh`.

High-level sequence:

```text
Frontend npm install
  -> Frontend SSR/prerender build
  -> stage public site files into Terraform/App/.artifacts/site
  -> stage private renderer files into Terraform/App/.artifacts/site-renderer
  -> discover the first publishable Backend/*.csproj
  -> dotnet restore
  -> dotnet publish --framework net10.0
  -> zip publish output to Backend/artifacts/{environment}-backend.zip
  -> install/build Shared and Backend TypeScript packages
  -> stage TypeScript Lambda runtime files into Backend/artifacts/{environment}/portal-api
  -> zip TypeScript Lambda runtime files to Backend/artifacts/{environment}-portal-api.zip
  -> zip Terraform/App/Renderer/index.mjs to Terraform/App/lambda_packages/site-renderer.zip
```

The deployment script then runs Terraform from `Terraform/App`, using the
selected environment backend config and tfvars file.

The package script now fails early if expected artifacts are missing or empty.
See `ci-validation.md` for the validation order and PR behavior.

## Scripts Inspected

```text
scripts/cicd/package_release_artifacts.sh
scripts/cicd/deploy_app_stack.sh
scripts/cicd/run_repo_validation.sh
.github/workflows/pr-checks.yml
.github/workflows/deploy-staging.yml
.github/workflows/release-production.yml
```

## .NET Rollback Packaging

`scripts/cicd/package_release_artifacts.sh` still produces the `.NET` backend
zip as a rollback artifact in these places:

```text
BACKEND_PROJECT_PATH defaults to Backend
BACKEND_PUBLISH_PROJECT_PATH may override the project path
resolve_backend_publish_project searches for the first non-test *.csproj
dotnet restore
dotnet publish --configuration Release --framework net10.0
zip publish output to Backend/artifacts/{environment}-backend.zip
```

The `.NET` backend project that this resolves to is:

```text
Backend/Apopto.Backend/Apopto.Backend.csproj
```

Before Phase 9, the deployed Lambda handler configured by tfvars was:

```text
Apopto.Backend::Apopto.Backend.Function::Health
```

## TypeScript Backend Artifact

The TypeScript/Node artifact is the current portal API Lambda artifact. The
`.NET` artifact remains available as a rollback package.

The package script now accepts these TypeScript packaging settings:

```text
SHARED_PACKAGE_PATH = Shared
BACKEND_TYPESCRIPT_PACKAGE_PATH = Backend
BACKEND_TYPESCRIPT_ARTIFACT_BASENAME = portal-api
PACKAGE_TYPESCRIPT_BACKEND = true
```

Set `PACKAGE_TYPESCRIPT_BACKEND=false` to skip the TypeScript artifact in an
emergency without changing the `.NET` publish path.

The TypeScript packaging sequence is:

```text
npm --prefix Shared ci
npm --prefix Shared run build
npm --prefix Backend ci
npm --prefix Backend run build
copy Backend/dist into Backend/artifacts/{environment}/portal-api
copy Shared/dist into Backend/artifacts/{environment}/portal-api/node_modules/@apopto/shared
copy the current shared runtime dependency zod into Backend/artifacts/{environment}/portal-api/node_modules/zod
create Backend/artifacts/{environment}-portal-api.zip with normalized timestamps and sorted file order
```

Artifact paths:

```text
APP_ENVIRONMENT=staging
  .NET health Lambda:
    Backend/artifacts/staging-backend.zip
  TypeScript backend Lambda:
    Backend/artifacts/staging-portal-api.zip
  TypeScript staging directory:
    Backend/artifacts/staging/portal-api

APP_ENVIRONMENT=production
  .NET health Lambda:
    Backend/artifacts/production-backend.zip
  TypeScript backend Lambda:
    Backend/artifacts/production-portal-api.zip
  TypeScript staging directory:
    Backend/artifacts/production/portal-api
```

The staged TypeScript artifact exposes handler paths such as:

```text
handlers/health.handler
handlers/identityIntake.handler
handlers/files.handler
handlers/messages.handler
handlers/billing.handler
handlers/admin.handler
```

Terraform points the portal Lambda functions at this artifact.

## Frontend And Site Renderer Artifacts

The package script also owns frontend and site renderer artifact staging.

Frontend build runs `npm ci` and `npm run build:ssr` inside `Frontend`.

Public website staging copies `Frontend/dist` into
`Terraform/App/.artifacts/site`, then removes the private server bundle and
renderer manifest/template from public staging.

Private site renderer staging copies the renderer manifest, renderer template,
and server bundle into `Terraform/App/.artifacts/site-renderer`.

The site renderer Lambda zip is written to:

```text
Terraform/App/lambda_packages/site-renderer.zip
```

The site renderer Lambda is already Node.js and is separate from the portal API
Lambdas.

## Artifact Assertions

Packaging fails if any of these are missing or empty:

```text
Terraform/App/.artifacts/site/index.html
Terraform/App/.artifacts/site-renderer/site-renderer-manifest.json
Terraform/App/.artifacts/site-renderer/site-renderer-template.html
Terraform/App/.artifacts/site-renderer/server/entry-server.js
Backend/artifacts/{environment}-backend.zip
Backend/artifacts/{environment}-portal-api.zip
Terraform/App/lambda_packages/site-renderer.zip
```

## Terraform Artifact Contract

Terraform expects Lambda zip files to exist before plan/apply can fully
evaluate the Lambda resources because `source_code_hash` calls
`filebase64sha256(...)`.

Infrastructure phases should review the Terraform plan before apply, especially
when package hashes change Lambda functions.

### Health Lambda

Resource:

```text
Terraform/App/main.tf
aws_lambda_function.health
```

Current settings:

```hcl
handler          = var.lambda_handler
runtime          = var.lambda_runtime
filename         = var.lambda_zip_path
source_code_hash = filebase64sha256(var.lambda_zip_path)
```

Variables:

```text
var.lambda_handler:
  "Lambda handler for the health check function."

var.lambda_runtime:
  default = "nodejs22.x"

var.lambda_zip_path:
  path to the published Lambda zip file, relative to Terraform/App
```

Environment tfvars:

```text
Terraform/App/environments/staging.tfvars:
  lambda_handler  = "handlers/health.handler"
  lambda_runtime  = "nodejs22.x"
  lambda_zip_path = "../../Backend/artifacts/staging-portal-api.zip"

Terraform/App/environments/production.tfvars:
  lambda_handler  = "handlers/health.handler"
  lambda_runtime  = "nodejs22.x"
  lambda_zip_path = "../../Backend/artifacts/production-portal-api.zip"
```

The artifact path generated by `package_release_artifacts.sh` matches these
tfvars paths:

```text
APP_ENVIRONMENT=staging
  -> Backend/artifacts/staging-portal-api.zip
  -> Terraform/App sees ../../Backend/artifacts/staging-portal-api.zip

APP_ENVIRONMENT=production
  -> Backend/artifacts/production-portal-api.zip
  -> Terraform/App sees ../../Backend/artifacts/production-portal-api.zip
```

The `.NET` zip path is still produced as a rollback artifact, but current
tfvars no longer point the health Lambda at it.

### Site Renderer Lambda

Resource:

```text
Terraform/App/renderer.tf
aws_lambda_function.site_renderer
```

Current settings:

```hcl
handler          = "index.handler"
runtime          = var.site_renderer_lambda_runtime
filename         = var.site_renderer_lambda_zip_path
source_code_hash = filebase64sha256(var.site_renderer_lambda_zip_path)
```

Environment tfvars:

```text
site_renderer_lambda_zip_path = "lambda_packages/site-renderer.zip"
```

The package script generates:

```text
Terraform/App/lambda_packages/site-renderer.zip
```

## Deployment Script Handoff

`scripts/cicd/deploy_app_stack.sh` uses `Terraform/App` by default:

```text
APP_STACK_DIRECTORY="${APP_STACK_DIRECTORY:-Terraform/App}"
APP_STACK_PATH="${ROOT_DIR}/${APP_STACK_DIRECTORY}"
```

It initializes Terraform with:

```text
terraform -chdir="${APP_STACK_PATH}" init -input=false -backend-config="${BACKEND_CONFIG_FILE}"
```

It then runs the chosen action:

```text
terraform -chdir="${APP_STACK_PATH}" "${TERRAFORM_ACTION}" -input=false -var-file="${TFVARS_FILE}"
```

Default action is `apply`. Production workflow can choose `plan` or `apply`.

When staged frontend artifact directories exist, the deploy script exports:

```text
TF_VAR_site_asset_root=".artifacts/site"
TF_VAR_site_renderer_asset_root=".artifacts/site-renderer"
```

This lets Terraform upload the current frontend build output to S3.

## Workflow Handoff

PR validation:

```text
.github/workflows/pr-checks.yml
  -> sets up Python 3.12, .NET 10.0.x, Node.js 22
  -> runs scripts/cicd/run_repo_validation.sh
```

Staging deploy:

```text
.github/workflows/deploy-staging.yml
  -> APP_ENVIRONMENT=staging
  -> runs scripts/cicd/run_repo_validation.sh with package validation disabled
  -> runs scripts/cicd/package_release_artifacts.sh
  -> runs scripts/cicd/deploy_app_stack.sh
     with Terraform/App, staging backend config, staging tfvars, apply
```

Production release:

```text
.github/workflows/release-production.yml
  -> APP_ENVIRONMENT=production
  -> runs scripts/cicd/run_repo_validation.sh with package validation disabled
  -> runs scripts/cicd/package_release_artifacts.sh
  -> runs scripts/cicd/deploy_app_stack.sh
     with Terraform/App, production backend config, production tfvars
  -> supports terraform_action = plan or apply
  -> uploads Terraform/App/production.tfplan for plan runs
```

## Validation Script Baseline

`scripts/cicd/run_repo_validation.sh` currently validates the repo by:

```text
Shared npm ci, build, typecheck, test
Backend TypeScript npm ci, build, typecheck, test
legacy .NET backend build and any discovered .NET tests
Frontend npm ci, optional lint, typecheck, test, SSR/prerender build
release artifact packaging unless RUN_ARTIFACT_PACKAGE_VALIDATION=false
terraform fmt -check -recursive
terraform init -backend=false and validate for Terraform/Bootstrap
terraform init -backend=false and validate for Terraform/App
```

See `ci-validation.md` for the current validation runbook.

## Migration Path Status

The Node/TypeScript health runtime migration followed this path:

1. Add a TypeScript backend build under the existing `Backend` folder without
   removing the .NET project.
2. Produce a deterministic Node Lambda zip in a new path first:

   ```text
   Backend/artifacts/{environment}-portal-api.zip
   ```

   Phase 8 now does this packaging step.

3. Keep producing the existing `.NET` zip as a rollback artifact.
4. Add packaging support behind an explicit script path or mode, rather than
   replacing the `.NET` publish path in the same change that introduces the
   TypeScript project.
5. In Phase 9, update Terraform/tfvars together:

   ```text
   lambda_runtime  -> nodejs22.x
   lambda_handler  -> handlers/health.handler
   lambda_zip_path -> ../../Backend/artifacts/{environment}-portal-api.zip
   ```

6. Keep `source_code_hash = filebase64sha256(var.lambda_zip_path)` so Terraform
   detects zip changes the same way it does today.
7. Run package generation before Terraform plan/apply so the new zip exists and
   can be hashed.
8. Produce a human-reviewed Terraform plan before apply. The plan should show
   only the intended health/API Lambda runtime, handler, filename, environment,
   and source hash changes for that phase.
9. After the Node health/API Lambda is deployed and stable, remove or archive
   the old `.NET` project only in a later cleanup phase.

## Specific Risks

- `source_code_hash` requires artifact files to exist locally when Terraform
  evaluates the Lambda resources.
- The current package script deletes and recreates
  `Backend/artifacts/{environment}/publish` and
  `Backend/artifacts/{environment}-backend.zip`; the TypeScript artifact uses
  a separate `Backend/artifacts/{environment}-portal-api.zip` path so it does
  not conflict before the switchover phase.
- The current validation script still runs `dotnet build`; a TypeScript backend
  phase needs to either keep `.NET` build compatibility or update validation in
  a dedicated CI hardening phase.
- Site renderer packaging is already Node.js but is unrelated to the backend
  API runtime. Changes to backend packaging should not break
  `Terraform/App/lambda_packages/site-renderer.zip`.
- Deployment scripts default to `terraform apply`; infrastructure migration
  phases should run plan for human review before apply.

## Commands Run For This Audit

Inspection:

```bash
sed -n '355,410p' client-portal-codex-mvp-phase-plan.md
nl -ba scripts/cicd/package_release_artifacts.sh | sed -n '1,180p'
nl -ba Terraform/App/main.tf | sed -n '180,260p'
nl -ba Terraform/App/variables.tf | sed -n '45,85p'
nl -ba Terraform/App/environments/staging.tfvars | sed -n '1,40p'
nl -ba Terraform/App/environments/production.tfvars | sed -n '1,40p'
nl -ba Terraform/App/renderer.tf | sed -n '120,155p'
nl -ba scripts/cicd/deploy_app_stack.sh | sed -n '1,115p'
nl -ba .github/workflows/pr-checks.yml | sed -n '1,90p'
nl -ba .github/workflows/deploy-staging.yml | sed -n '60,90p'
nl -ba .github/workflows/release-production.yml | sed -n '75,115p'
nl -ba scripts/cicd/run_repo_validation.sh | sed -n '47,72p'
```

Validation:

```bash
bash -n scripts/cicd/package_release_artifacts.sh
bash -n scripts/cicd/deploy_app_stack.sh
bash -n scripts/cicd/run_repo_validation.sh
git status --short
```

Results:

```text
bash -n scripts/cicd/package_release_artifacts.sh passed
bash -n scripts/cicd/deploy_app_stack.sh passed
bash -n scripts/cicd/run_repo_validation.sh passed
```

During the original Phase 2 audit, no builds, Terraform plans, Terraform
applies, runtime changes, Lambda code changes, or Terraform resource edits were
performed.

## Phase 8 Validation

Commands run:

```bash
bash -n scripts/cicd/package_release_artifacts.sh
APP_ENVIRONMENT=staging scripts/cicd/package_release_artifacts.sh
unzip -l Backend/artifacts/staging-portal-api.zip
node -e "..." # imported handlers/health.js from an extracted portal-api zip
```

The first package script run inside the sandbox failed during the frontend
`npm ci` esbuild postinstall with an `EPERM` sandbox execution error. The same
command was rerun with escalation and completed successfully.

Observed staging outputs:

```text
Backend/artifacts/staging-backend.zip
Backend/artifacts/staging-portal-api.zip
Terraform/App/lambda_packages/site-renderer.zip
```

Observed TypeScript artifact smoke test:

```text
200
true
true
```

## Still Deferred After Phase 8

- No API Gateway or CloudFront routing changes.
- No CI workflow changes.
- No removal of the .NET Lambda project.
- No portal API route implementation.

## Phase 9 Node Health Lambda Replacement

Phase 9 switches only the existing health Lambda configuration to the
TypeScript artifact. The existing API Gateway route remains:

```text
GET /api/health
```

The intended Terraform health Lambda changes are limited to:

```text
lambda_handler:
  Apopto.Backend::Apopto.Backend.Function::Health
  -> handlers/health.handler

lambda_runtime:
  dotnet10
  -> nodejs22.x

lambda_zip_path:
  ../../Backend/artifacts/{environment}-backend.zip
  -> ../../Backend/artifacts/{environment}-portal-api.zip

environment variables:
  ASPNETCORE_ENVIRONMENT / DOTNET_ENVIRONMENT
  -> APP_ENVIRONMENT
```

`source_code_hash = filebase64sha256(var.lambda_zip_path)` remains in place on
`aws_lambda_function.health`, so Terraform will detect TypeScript zip changes
the same way it detected `.NET` zip changes.

Phase 9 validation commands:

```bash
npm run build:shared
npm run build:backend
npm run typecheck:backend
APP_ENVIRONMENT=staging scripts/cicd/package_release_artifacts.sh
bash -n scripts/cicd/package_release_artifacts.sh
terraform -chdir=Terraform/App fmt -check
terraform -chdir=Terraform/App validate
terraform -chdir=Terraform/App plan -input=false -var-file=environments/staging.tfvars -out=staging-phase9-health-node.tfplan
terraform -chdir=Terraform/App plan -input=false -lock=false -var-file=environments/staging.tfvars -out=staging-phase9-health-node.tfplan
```

The staging artifact package and extracted-zip smoke test passed. Terraform
validation passed when the AWS provider plugin was allowed to run outside the
sandbox.

The staging plan could not be produced locally because the current AWS identity
`arn:aws:iam::061306742112:user/AWSCLI` is not authorized to read or lock the
remote S3 state object:

```text
s3://apopto-jbowen-git-terraform-state/app/staging/terraform.tfstate
s3://apopto-jbowen-git-terraform-state/app/staging/terraform.tfstate.tflock
```

Rerun the same plan command with the deploy role or an identity that can read
and lock the staging Terraform state. Do not apply until the plan shows only
the intended health Lambda runtime, handler, filename, source hash, and
environment variable changes.
