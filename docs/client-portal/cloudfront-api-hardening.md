# CloudFront API Hardening

Phase 12 hardens the existing `/api/*` CloudFront behavior for authenticated
portal traffic.

## API Behavior

The ordered CloudFront behavior for:

```text
/api/*
```

continues to route traffic to API Gateway and uses the managed
`CachingDisabled` cache policy. Authenticated API responses must not be cached
at CloudFront.

Allowed methods:

```text
GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
```

Cached methods remain:

```text
GET, HEAD, OPTIONS
```

Because the cache policy is `CachingDisabled`, TTLs are zero even for those
methods.

## Forwarded Request Data

CloudFront's Free pricing plan rejects custom origin request policies, so
Terraform uses the AWS-managed policy:

```text
Managed-AllViewerExceptHostHeader
```

It forwards:

```text
Authorization
Origin
Access-Control-Request-Headers
Access-Control-Request-Method
all query strings
all viewer cookies
```

It does not forward the viewer `Host` header, which keeps the API Gateway
origin compatible with CloudFront. Cookies are broader than the custom policy
would have allowed, but API responses are still protected by the managed
`CachingDisabled` cache policy and backend `Cache-Control: no-store` defaults.
Do not rely on cookies for portal authentication; the API should continue to use
Auth0 bearer tokens.

## Backend Response Defaults

The backend JSON response helper sets:

```text
Cache-Control: no-store
```

by default. Individual handlers can override headers only when a phase
explicitly documents that caching is safe. Portal data, placeholders,
authorization errors, and private API responses should keep `no-store`.

## Plan Review Notes

For Phase 12, expected Terraform changes include:

```text
update aws_cloudfront_distribution.website /api/* origin_request_policy_id
```

If Phase 11 has not already been applied, the same plan may also include the
Auth0 JWT authorizer and protected placeholder route.

When running local plans, set staged asset roots to avoid misleading deletions
of site-renderer objects:

```bash
AWS_PROFILE=apopto \
TF_VAR_site_asset_root=.artifacts/site \
TF_VAR_site_renderer_asset_root=.artifacts/site-renderer \
terraform -chdir=Terraform/App plan \
  -input=false \
  -var-file=environments/staging.tfvars \
  -out=staging-phase12-api-hardening.tfplan
```

Do not apply a plan that shows unrelated CloudFront distribution drift, Web ACL
removal, price class changes, or site-renderer object destruction unless that
drift is intentionally reviewed.

## WAF Rate Limiting

Phase 45 adds optional WAF rate-limit rules for `/api/*`, upload presign, and
message routes. See `security.md` for the flat-rate Web ACL attachment caution:
the current distribution must keep its required Web ACL, so Terraform should not
replace the association without a specific import/adoption plan.
