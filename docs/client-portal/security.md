# Client Portal Security Notes

Security-sensitive infrastructure phases must stop at a Terraform plan for
human review before apply. Do not apply WAF, CloudFront, IAM, S3 bucket policy,
GuardDuty, or DynamoDB deletion-protection changes without explicit approval.

## CloudFront WAF Rate Limiting

Phase 45 adds an optional CloudFront-scope AWS WAF Web ACL with rate-based rules
for authenticated API traffic. The rules are disabled by default so Terraform
does not create or attach WAF resources without explicit review.

The optional Web ACL includes:

- `RateLimitApi` for all `/api/*` requests.
- `RateLimitUploadPresign` for `/api/files/presign-upload`.
- `RateLimitMessages` for `/api/threads` message routes.

Configuration variables:

```hcl
cloudfront_waf_rate_limiting_enabled     = false
cloudfront_waf_rate_limit_action         = "block"
cloudfront_waf_api_rate_limit            = 2000
cloudfront_waf_upload_presign_rate_limit = 300
cloudfront_waf_messages_rate_limit       = 600
```

Set a stricter route threshold to `0` to omit that specific rule. The action
can be set to `count` during a tuning period before switching to `block`.

## Flat-Rate CloudFront Web ACL Caution

The current CloudFront distribution is on a flat-rate pricing plan. That plan
requires an attached Web ACL, and CloudFront has rejected prior updates that
attempted to remove or replace the association.

For that reason, Terraform currently keeps:

```hcl
lifecycle {
  ignore_changes = [web_acl_id]
}
```

on `aws_cloudfront_distribution.website`. Phase 45 does not blindly attach a
new Web ACL because that could be interpreted by CloudFront as replacing the
required flat-rate Web ACL.

Before making WAF rate limiting active, choose one of these reviewed paths:

- Import/adopt the existing flat-rate Web ACL into Terraform and add equivalent
  rate-based rules while preserving any existing rules.
- Coordinate a safe Web ACL replacement path outside of a normal deploy.
- Keep the optional Terraform Web ACL disabled and manage rate rules in the
  existing Web ACL manually until the import path is ready.

Any plan that shows CloudFront `web_acl_id` removal or replacement should be
stopped and reviewed before apply.

## Deferred IAM

If GitHub Actions will manage WAF resources later, the deploy role will need
scoped WAF permissions such as `wafv2:CreateWebACL`, `wafv2:UpdateWebACL`,
`wafv2:GetWebACL`, `wafv2:DeleteWebACL`, `wafv2:ListTagsForResource`, and
CloudFront update permissions if the distribution association is intentionally
changed.
