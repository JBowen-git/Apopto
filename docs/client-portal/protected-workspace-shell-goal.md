# Protected Workspace Shell Goal

The client portal and internal admin screens should move toward a dedicated
workspace experience inspired by the Xavier ecommerce admin design. Protected
routes should feel separate from the public marketing site while still using the
Apopto visual language.

## Goal

Create a shared protected workspace shell for client and admin routes with:

- a route-specific navigation bar separate from the main site navigation,
- an Apopto home button in the top-left that returns to `/`,
- desktop pages that are viewport-locked with scrolling contained inside panels,
- mobile pages that keep natural document scrolling,
- square, non-rounded workspace panels,
- dark Apopto colors with cyan/blue interaction states and restrained gold
  accents.

## Target Routes

Client workspace routes:

```text
/dashboard
/intake
/files
/messages
/messages/:threadId
/billing
```

Admin workspace routes:

```text
/admin/clients
/admin/clients/:clientId
```

## Design Reference

Use the Xavier ecommerce admin shell as the structural reference:

```text
/home/jake/XavierWebsite/ReactFrontend/src/components/admin/NewAdminShell.tsx
/home/jake/XavierWebsite/ReactFrontend/src/components/admin/NewAdminToolbar.tsx
```

The reference behavior to preserve is:

- a dedicated protected-app toolbar,
- home button at top-left,
- workspace navigation inside the protected shell,
- fixed desktop viewport with internal scroll regions,
- mobile bottom navigation and natural mobile page flow.

Do not copy Xavier branding, copy, ecommerce nav labels, or exact palette.

## Implementation Direction

Build toward a shared `PortalWorkspaceShell` in the frontend layout layer. The
shell should own protected-route chrome, background, navigation, desktop
viewport locking, mobile navigation, and sign-out/account actions. Existing
page components should keep their data fetching and mutations but render inside
workspace panels instead of the public `account-page` card layout.

The first implementation pass should avoid backend, schema, Auth0, and
Terraform changes. This is a frontend design-system and layout goal.

## Acceptance Criteria

- Public marketing pages still use the existing marketing header and footer.
- Protected client/admin routes no longer show the marketing header/footer.
- Desktop workspace pages do not scroll at the document level.
- Lists, forms, detail panes, and long activity panels scroll internally.
- Mobile protected routes remain usable with normal vertical scrolling.
- The admin and client workspaces feel like one family, with admin retaining a
  more operational tone.
