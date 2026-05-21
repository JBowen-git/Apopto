# Frontend Dashboard Shell

Phase 22 adds the first protected client portal shell at:

```text
/dashboard
```

The route is a client-side React route protected by `ProtectedRoute`. It calls:

```text
GET /api/me
```

through the tokenized API client, validates the response with the shared
`MeResponseSchema`, and renders only minimal user, client, membership, status,
and feature-flag information.

## SPA Fallback Requirement

`/dashboard` is intentionally not added to `Frontend/ssr-routes.json`. It should
not be prerendered as public static content because it is an authenticated route.

Production and staging must keep the existing SPA fallback behavior for direct
loads and refreshes:

```text
/dashboard -> index.html -> React Router -> ProtectedRoute
```

The current Terraform CloudFront custom error responses for S3 `403` and `404`
to `/index.html` support this. If those fallbacks are removed or replaced,
direct navigation to `/dashboard` can fail before React Router loads.

Local Vite development already supports this route through the dev server
history fallback.

## Deferred

- No dashboard modules beyond `/api/me` context.
- No intake UI.
- No files, messages, billing, or admin UI.
- No admin scopes.
