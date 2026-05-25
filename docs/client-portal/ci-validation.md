# CI Validation Hardening

Phase 48 keeps validation separate from infrastructure mutation. Pull requests can prove the repo still builds, tests, packages, and validates Terraform without needing real Auth0, Stripe, SES, or AWS deployment secrets.

## Validation Order

`scripts/cicd/run_repo_validation.sh` runs the repo checks in this order:

1. Shared package install, build, typecheck, and tests.
2. TypeScript backend install, build, typecheck, and tests.
3. Legacy .NET backend build and any discovered .NET test projects.
4. Frontend install, optional lint, typecheck, tests, and SSR/prerender marketing build.
5. Release artifact packaging, unless `RUN_ARTIFACT_PACKAGE_VALIDATION=false`.
6. Terraform install, recursive `fmt -check`, and `init -backend=false` plus `validate` for both Terraform roots.

The script does not run `terraform plan` or `terraform apply`.

Infrastructure phases should produce a Terraform plan for human review before
apply. CI validation is deliberately limited to formatting, schema validation,
builds, tests, and artifact packaging.

## CI Usage

PR checks run:

```bash
bash scripts/cicd/run_repo_validation.sh
```

That includes artifact packaging so PRs catch broken frontend staging output, backend Lambda zips, TypeScript Lambda zips, and site-renderer packaging.

Staging and production workflows run the same validation before AWS credentials are configured, but with packaging validation disabled:

```bash
RUN_ARTIFACT_PACKAGE_VALIDATION=false bash scripts/cicd/run_repo_validation.sh
```

Those workflows then run `scripts/cicd/package_release_artifacts.sh` once in the deploy/release path so packaging is not duplicated.

## Packaging Assertions

`scripts/cicd/package_release_artifacts.sh` now fails if expected artifacts are missing or empty:

- `Terraform/App/.artifacts/site/index.html`
- site-renderer manifest, template, and server entry
- `.NET` backend Lambda zip
- TypeScript backend Lambda zip when enabled
- site-renderer Lambda zip

The package step still does not require Auth0, Stripe, SES, or browser-upload secrets. It only needs normal build dependencies and, if configured, SSM/AWS role access for deploy-time environment export.

## Local Commands

Full local validation:

```bash
npm run validate:repo
```

Validation without artifact packaging:

```bash
RUN_ARTIFACT_PACKAGE_VALIDATION=false npm run validate:repo
```

Artifact packaging only:

```bash
APP_ENVIRONMENT=staging PRERENDER_SITE_ORIGIN=https://example.com bash scripts/cicd/package_release_artifacts.sh
```

## Notes

- Marketing page validation remains covered by `npm --prefix Frontend run build:ssr`.
- Terraform validation uses `-backend=false` and a temporary `TF_DATA_DIR`, so it should not touch remote state.
- Deploy workflows still control whether Terraform plans or applies. This validation phase does not change deploy behavior.
