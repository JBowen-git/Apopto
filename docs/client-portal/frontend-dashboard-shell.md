# Frontend Portal Routes

The frontend keeps public marketing pages and authenticated portal pages in the
same Vite app. `Frontend/src/App.jsx` imports route components lazily, and
`Frontend/src/routes/AppRoutes.jsx` owns the route table.

## Protected Routes

Protected portal routes:

```text
/dashboard
/intake
/files
/messages
/messages/:threadId
/billing
/admin/clients
/admin/clients/:clientId
```

`ProtectedRoute` handles login/session loading states. API calls use the
central tokenized API client so requests include:

```text
Authorization: Bearer <access-token>
```

## Workspace Shell Goal

Protected client and admin routes should move toward a dedicated workspace
shell inspired by the Xavier ecommerce admin design. The goal is documented in
`protected-workspace-shell-goal.md`.

At a high level, protected routes should eventually use a separate workspace
navigation bar with a top-left home button, avoid the public marketing
header/footer, and lock desktop pages to the viewport while allowing internal
panel scrolling.

## Dashboard Behavior

`/dashboard` calls:

```text
GET /api/dashboard
```

The backend returns client status, feature flags, next steps, and bounded
summary slices. The frontend renders modules based on backend feature flags:

```text
canEditIntake
canSendMessages
canUploadFiles
canViewBilling
canViewProjects
canAccessAdmin
```

The frontend should hide unavailable modules, but backend authorization remains
the source of enforcement.

## SPA Fallback Requirement

Authenticated portal routes are intentionally not prerendered as public static
content. Direct navigation should fall through to `index.html` and then React
Router:

```text
/dashboard -> index.html -> React Router -> ProtectedRoute
```

The current CloudFront custom error responses for S3 `403` and `404` support
this. If those fallbacks change, direct loads of authenticated routes can fail
before React Router runs.

## File Structure Rule

Keep `App.jsx` focused on lazy page imports and route wiring. New portal UI
should live in page/component files, with reusable logic in feature-specific
component directories or hooks. See `frontend-structure.md`.
