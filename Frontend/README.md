# Frontend SSR Overlay

Copy these files into a Vite React app after running `npm create vite@latest`.

```bash
cp -R FrontendTemplate/* Frontend/
```

Install the router dependency if it is not already present:

```bash
npm --prefix Frontend install react-router-dom
```

Add these scripts to `Frontend/package.json`:

```json
{
  "scripts": {
    "build:ssr": "vite build && vite build --ssr src/entry-server.jsx --outDir dist/server --emptyOutDir false && node scripts/prerender.mjs"
  }
}
```

`ssr-routes.json` controls which routes are prerendered. The build also emits
`site-renderer-template.html` and `site-renderer-manifest.json` so the deployed
renderer Lambda can refresh crawler-visible HTML after each apply. The
deployment scripts stage public `Frontend/dist` files into
`Terraform/App/.artifacts/site`, stage the private server bundle and renderer
manifest into `Terraform/App/.artifacts/site-renderer`, and let Terraform upload
the changed objects.

Current public routes:

- `/`
- `/solutions`
- `/portfolio`
- `/about`
- `/insights`
- `/contact`
- `/start-a-project`
- `/error`

Static frontend assets live in `public/assets/` and are served from `/assets/`.
The homepage uses `/assets/images/homepage-hero-background.png`; reference-only
design images should stay outside `public/` so they are not deployed.
