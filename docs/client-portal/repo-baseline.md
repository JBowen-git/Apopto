# Client Portal Repository Baseline

Phase 1 baseline inventory for the client portal MVP work.

This document records the current repository shape before portal implementation
begins. Future phases should preserve the existing top-level `Frontend`,
`Backend`, and `Terraform` folders, keep the current marketing pages building,
and reconcile existing uncommitted frontend/Auth0 work instead of overwriting it.

## Current Worktree Notes

At the time of this baseline, the worktree already contains user/frontend work
outside this documentation phase:

```text
 M Frontend/README.md
 M Frontend/package-lock.json
 M Frontend/package.json
 M Frontend/src/App.jsx
 M Frontend/src/entry-server.jsx
 M Frontend/src/index.css
 M Frontend/src/main.jsx
 M Frontend/ssr-routes.json
?? Frontend/.env.example
?? Frontend/src/auth.jsx
?? client-portal-codex-mvp-phase-plan.md
```

Those changes are treated as existing work. Later phases should inspect and
adapt to them rather than reverting or duplicating them.

## Top-Level Layout

```text
Frontend/     React/Vite app and public marketing site
Backend/      Current .NET Lambda health API project and backend artifacts
Terraform/    Bootstrap and App Terraform roots
scripts/      CI/CD packaging, validation, and deployment scripts
.github/      PR, staging deploy, and production release workflows
```

No root `package.json` exists yet. Frontend package management currently happens
inside `Frontend/`.

## Frontend Baseline

`Frontend/` is a Vite React app using JavaScript/JSX today.

Important files:

```text
Frontend/package.json
Frontend/package-lock.json
Frontend/vite.config.js
Frontend/src/App.jsx
Frontend/src/main.jsx
Frontend/src/entry-server.jsx
Frontend/src/auth.jsx
Frontend/scripts/prerender.mjs
Frontend/ssr-routes.json
Frontend/public/assets/
```

Current scripts from `Frontend/package.json`:

```json
{
  "dev": "vite",
  "build": "vite build",
  "build:ssr": "vite build && vite build --ssr src/entry-server.jsx --outDir dist/server --emptyOutDir false && node scripts/prerender.mjs",
  "preview": "vite preview"
}
```

Current frontend dependencies include React 19, React Router 7, MUI 9,
Emotion, Vite 7, and `@auth0/auth0-react`.

The frontend has SSR/prerender support:

- `Frontend/src/entry-server.jsx` renders routes with `StaticRouter`.
- `Frontend/scripts/prerender.mjs` reads `Frontend/ssr-routes.json`, renders
  configured routes, writes static HTML, and emits `sitemap.xml`, `robots.txt`,
  `llms.txt`, `site-renderer-template.html`, and
  `site-renderer-manifest.json`.
- `Frontend/vite.config.js` sets the dev server to port `5173` and proxies
  `/api` to `VITE_DEV_API_PROXY_TARGET` or a default example API Gateway URL.

Current public/prerendered routes include:

```text
/
/solutions
/portfolio
/portfolio/all-work
/portfolio/build-breakdowns
/portfolio/concept-builds
/portfolio/individual-project-pages
/about
/insights
/contact
/start-a-project
/account
/error
```

Existing partial Auth0 account wiring:

- `Frontend/src/auth.jsx` wraps `@auth0/auth0-react`.
- `Frontend/src/main.jsx` and `Frontend/src/entry-server.jsx` wrap the app in
  `ApoptoAuthProvider`.
- The current callback/return route is `/account`, not the future portal
  `/callback` route in the MVP plan.
- Future Auth0 phases should reconcile this existing account/auth code instead
  of adding a second disconnected auth layer.

## Backend Baseline

`Backend/` currently contains a .NET Lambda project:

```text
Backend/Apopto.Backend/Apopto.Backend.csproj
Backend/Apopto.Backend/Function.cs
Backend/artifacts/staging-backend.zip
Backend/artifacts/production-backend.zip
```

`Backend/Apopto.Backend/Apopto.Backend.csproj` targets `net10.0` and uses:

```text
Amazon.Lambda.APIGatewayEvents
Amazon.Lambda.Core
Amazon.Lambda.Serialization.SystemTextJson
```

The current Lambda handler is:

```text
Apopto.Backend::Apopto.Backend.Function::Health
```

`Function.Health` returns an HTTP API v2 proxy response with:

- status code `200`
- JSON body containing `status`, `environment`, and `requestId`
- `content-type: application/json`
- `cache-control: no-store`

The health function reads `DOTNET_ENVIRONMENT` or
`ASPNETCORE_ENVIRONMENT`.

## Terraform Baseline

Terraform has two roots:

```text
Terraform/Bootstrap/
Terraform/App/
```

`Terraform/Bootstrap` creates remote state and GitHub/OIDC deployment support.
`Terraform/App` owns the application environment.

`Terraform/App` currently creates:

- private S3 website bucket
- Terraform-managed website/SSR S3 objects
- CloudFront distribution with Origin Access Control
- CloudFront Function for directory index behavior
- HTTP API Gateway
- .NET health Lambda at `GET /api/health`
- Node.js site renderer Lambda
- SQS queue and DLQ for site renderer refresh

Environment files:

```text
Terraform/App/environments/staging.tfvars
Terraform/App/environments/production.tfvars
```

Both environments currently set:

```text
lambda_handler = "Apopto.Backend::Apopto.Backend.Function::Health"
```

The Lambda artifact paths are:

```text
staging:    ../../Backend/artifacts/staging-backend.zip
production: ../../Backend/artifacts/production-backend.zip
```

The main health Lambda resource is `aws_lambda_function.health` in
`Terraform/App/main.tf`. It uses:

```text
handler          = var.lambda_handler
runtime          = var.lambda_runtime
filename         = var.lambda_zip_path
source_code_hash = filebase64sha256(var.lambda_zip_path)
```

`var.lambda_runtime` defaults to `dotnet10`.

## API Gateway And CloudFront Baseline

The current public backend route is:

```http
GET /api/health
```

Terraform resources involved:

```text
aws_apigatewayv2_api.app
aws_apigatewayv2_integration.health
aws_apigatewayv2_route.health
aws_apigatewayv2_stage.default
aws_lambda_permission.allow_api_gateway_health
```

CloudFront has two origins:

- website S3 origin
- API Gateway origin

The default cache behavior serves the website S3 origin and uses the managed
caching optimized policy.

The ordered cache behavior for `/api/*` routes API traffic to API Gateway:

```text
path_pattern             = "/api/*"
target_origin_id         = local.api_origin_id
viewer_protocol_policy   = "redirect-to-https"
allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
cached_methods           = ["GET", "HEAD", "OPTIONS"]
cache_policy_id          = Managed-CachingDisabled
origin_request_policy_id = Managed-AllViewerExceptHostHeader
```

The CloudFront distribution has custom 403/404 responses mapped to
`/index.html`, which supports SPA-style browser refreshes for unknown/static
routes.

The distribution currently ignores `web_acl_id` drift because the CloudFront
flat-rate/free pricing plan can attach or require a Web ACL outside this
Terraform configuration.

## CI And Artifact Packaging Baseline

Important scripts:

```text
scripts/cicd/run_repo_validation.sh
scripts/cicd/package_release_artifacts.sh
scripts/cicd/deploy_app_stack.sh
scripts/cicd/install_terraform.sh
scripts/cicd/aws_runtime.sh
```

`scripts/cicd/run_repo_validation.sh` currently:

1. installs Terraform `1.10.5`
2. runs `npm ci` in `Frontend`
3. runs optional frontend lint
4. runs `npm run build:ssr`
5. builds the first non-test `.csproj` under `Backend`
6. runs backend test projects if any exist
7. runs recursive Terraform format check
8. initializes and validates both Terraform roots with local `TF_DATA_DIR`

`scripts/cicd/package_release_artifacts.sh` currently:

1. runs `npm ci` in `Frontend`
2. runs `npm run build:ssr`
3. stages public frontend output under `Terraform/App/.artifacts/site`
4. removes private server/renderer files from public site staging
5. stages renderer manifest/template/server files under
   `Terraform/App/.artifacts/site-renderer`
6. finds the first publishable non-test `.csproj` under `Backend`
7. runs `dotnet restore`
8. runs `dotnet publish --configuration Release --framework net10.0`
9. zips the publish output to `Backend/artifacts/{environment}-backend.zip`
10. zips `Terraform/App/Renderer/index.mjs` to
    `Terraform/App/lambda_packages/site-renderer.zip`

`scripts/cicd/deploy_app_stack.sh` currently:

1. uses `Terraform/App` by default
2. runs `terraform init`
3. runs `terraform apply` by default, or `terraform plan` when requested
4. passes the selected backend config and tfvars files
5. uses staged frontend assets from `Terraform/App/.artifacts`
6. optionally creates a CloudFront invalidation
7. optionally sends an SQS message to trigger the site renderer

GitHub workflows:

- `.github/workflows/pr-checks.yml` runs repository validation on pull requests.
- `.github/workflows/deploy-staging.yml` deploys staging from `main`.
- `.github/workflows/release-production.yml` manually runs production plan/apply.

Workflow runtimes:

```text
Python 3.12
.NET 10.0.x
Node.js 22
Terraform 1.10.5 through scripts/cicd/install_terraform.sh
```

## Commands Run For This Baseline

Discovery and inspection:

```bash
find . -maxdepth 3 -type f | sort | sed 's#^./##' | head -260
git status --short
git ls-files | sort | head -260
sed -n '296,354p' client-portal-codex-mvp-phase-plan.md
sed -n '1,220p' Frontend/package.json
sed -n '1,260p' Backend/Apopto.Backend/Function.cs
sed -n '1,180p' Backend/Apopto.Backend/Apopto.Backend.csproj
rg -n "aws_lambda_function|aws_apigatewayv2|aws_cloudfront_distribution|ordered_cache_behavior|default_cache_behavior|api_origin_id|lambda_runtime|lambda_handler|lambda_zip_path|origin_request_policy|cache_policy|allowed_methods|Authorization|web_acl_id|price_class" Terraform/App/main.tf Terraform/App/variables.tf Terraform/App/renderer.tf Terraform/App/outputs.tf
sed -n '40,160p' Terraform/App/variables.tf
sed -n '180,270p' Terraform/App/main.tf
sed -n '278,370p' Terraform/App/main.tf
sed -n '1,220p' Terraform/App/renderer.tf
sed -n '1,220p' Terraform/App/environments/staging.tfvars
sed -n '1,220p' Terraform/App/environments/production.tfvars
sed -n '1,220p' Terraform/App/README.md
sed -n '1,220p' scripts/cicd/deploy_app_stack.sh
sed -n '1,260p' scripts/cicd/package_release_artifacts.sh
sed -n '1,220p' scripts/cicd/run_repo_validation.sh
sed -n '1,260p' .github/workflows/pr-checks.yml
sed -n '1,260p' .github/workflows/deploy-staging.yml
sed -n '1,300p' .github/workflows/release-production.yml
sed -n '1,220p' Frontend/vite.config.js
sed -n '1,240p' Frontend/scripts/prerender.mjs
sed -n '1,220p' Frontend/ssr-routes.json
sed -n '1,220p' Frontend/src/main.jsx
sed -n '1,180p' Frontend/src/entry-server.jsx
sed -n '1,220p' Frontend/src/auth.jsx
sed -n '1,200p' README.md
sed -n '1,220p' Frontend/README.md
rg -n "<Route|path=|BrowserRouter|Routes|account|insights|start-a-project" Frontend/src/App.jsx
sed -n '1,220p' .gitignore
```

Tool/version checks:

```bash
node --version
npm --prefix Frontend pkg get scripts
dotnet --version
terraform version
```

Results:

```text
node:      v22.22.0
dotnet:    10.0.103
terraform: 1.10.5
```

Terraform checks:

```bash
terraform -chdir=Terraform/App fmt -check
terraform -chdir=Terraform/Bootstrap fmt -check
terraform -chdir=Terraform/App validate
terraform -chdir=Terraform/Bootstrap validate
```

Results:

- `terraform fmt -check` passed for both `Terraform/App` and
  `Terraform/Bootstrap`.
- `terraform validate` failed for both Terraform roots because the local AWS
  provider plugin could not load:

```text
Failed to load plugin schemas
Could not load the schema for provider registry.terraform.io/hashicorp/aws
failed to instantiate provider
Unrecognized remote plugin message
Failed to read any lines from plugin's stdout
```

## Validation Notes

No frontend build was run during this baseline implementation. The normal
frontend SSR build writes generated output under `Frontend/dist`, and this phase
is intended to document current state without changing generated site output.

No Terraform plan or apply was run. This phase does not change Terraform
configuration.

## Known Risks And Follow-Up Notes

- Phase 2 should inspect deployment packaging in more depth before changing any
  runtime or artifact behavior.
- The current packaging path assumes `.NET` backend publishing and must be
  migrated carefully before Node/TypeScript Lambda artifacts are deployed.
- Future Auth0 phases must reconcile the existing `/account` Auth0 wiring with
  the planned `/callback` and protected portal routes.
- Future frontend portal routes must account for the existing SSR/prerender and
  site-renderer flow.
- Future Terraform work should run from `Terraform/App` for app resources and
  should produce a human-reviewed plan before apply.
- The local Terraform provider plugin issue should be resolved before relying on
  local `terraform validate` results.

## Deferred From Phase 1

- No TypeScript workspace setup.
- No shared schema package.
- No backend runtime migration.
- No Terraform resource changes.
- No Auth0 portal-route implementation.
- No DynamoDB, S3 upload, messages, billing, or admin portal implementation.
