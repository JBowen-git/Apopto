# Shared Schemas

Phase 5 adds shared Zod schemas for client portal request and response
contracts. These schemas live in `Shared/src/schemas` and are exported from
`@apopto/shared`.

## Intake Schema

`IntakeFormDataSchema` is the canonical shape for the first customer intake
workflow. It includes:

- business and contact basics
- project type, goals, target audience, and desired features
- design preferences and reference sites
- content readiness and branding readiness
- current hosting/domain/email/analytics context
- integrations and data sensitivity
- budget, timeline, must-have/nice-to-have features, and maintenance interest
- optional notes
- required no-secrets and terms acknowledgements

`acceptedNoSecretsWarning` and `acceptedTerms` must both be `true`.

Optional URL fields allow blank strings at form boundaries but validate non-empty
values as URLs. Optional text fields also normalize blank strings to
`undefined`.

## Request And Response Families

The shared package now includes initial contracts for:

- `UpdateIntakeRequestSchema`
- `UpdateClientProfileRequestSchema`
- intake get/update responses
- file upload/list/download requests and responses
- message thread/message requests and summaries
- billing invoice and Stripe portal session responses
- admin client status/project request schemas

These are validation/type contracts only. Phase 5 does not implement UI,
backend handlers, database access, S3 uploads, billing, messages, or admin
routes.
