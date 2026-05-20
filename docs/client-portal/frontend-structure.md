# Frontend File Structure Convention

The frontend should no longer grow large all-in-one files. From this point
forward, keep `Frontend/src/App.jsx` focused on app routing only.

## Current Structure

```text
Frontend/src/App.jsx              Route table only
Frontend/src/pages/               One file per route/page component
Frontend/src/components/          Reusable components, grouped by feature or role
Frontend/src/components/forms/    Form-specific reusable components
Frontend/src/components/layout/   Header/footer/layout shell components
Frontend/src/data/                Static page data and option lists
Frontend/src/utils/               Small pure helper functions
```

## Rules For New Frontend Work

- Add each new page as its own file under `Frontend/src/pages`.
- Add each reusable component as its own file under `Frontend/src/components`.
- Keep static arrays, option lists, and route copy in `Frontend/src/data`.
- Keep pure helpers in `Frontend/src/utils`.
- Do not put new page bodies, large forms, or static data directly in
  `App.jsx`.
- `App.jsx` should import pages and define routes only.
- If a file grows large because it contains multiple independent components,
  split those components before adding more behavior.

## Import Style

Use direct relative imports for local frontend modules:

```js
import Contact from './pages/Contact.jsx'
import Layout from './components/layout/Layout.jsx'
```

Use package imports only for external packages and shared workspace packages:

```js
import { FeatureFlagsSchema } from '@apopto/shared'
```

## Validation

After frontend structure changes, run:

```bash
npm --prefix Frontend run build
```

If the change touches shared schemas used by the frontend, build shared first:

```bash
npm run build:shared
npm --prefix Frontend run build
```
