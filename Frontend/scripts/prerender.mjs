import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const distRoot = path.join(projectRoot, 'dist')
const routeConfigPath = path.join(projectRoot, 'ssr-routes.json')
const templatePath = path.join(distRoot, 'index.html')
const rendererTemplateRelativePath = 'site-renderer-template.html'
const rendererTemplatePath = path.join(distRoot, rendererTemplateRelativePath)
const rendererManifestPath = path.join(distRoot, 'site-renderer-manifest.json')
const serverEntryPath = path.join(distRoot, 'server', 'entry-server.js')

const siteOrigin = (process.env.PRERENDER_SITE_ORIGIN || 'https://example.com').replace(/\/+$/, '')
const routeConfig = JSON.parse(await fs.readFile(routeConfigPath, 'utf8'))
const template = await fs.readFile(templatePath, 'utf8')
const { render } = await import(pathToFileURL(serverEntryPath).href)

async function collectRelativeFiles(directoryPath, relativePrefix = '') {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true })
  const files = []

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryRelativePath = relativePrefix
      ? path.posix.join(relativePrefix, entry.name)
      : entry.name
    const entryAbsolutePath = path.join(directoryPath, entry.name)

    if (entry.isDirectory()) {
      files.push(...await collectRelativeFiles(entryAbsolutePath, entryRelativePath))
      continue
    }

    if (entry.isFile()) {
      files.push(entryRelativePath)
    }
  }

  return files
}

async function buildSiteRendererManifest() {
  const serverFiles = await collectRelativeFiles(path.join(distRoot, 'server'), 'server')
  const buildHash = createHash('sha256')

  for (const relativePath of [rendererTemplateRelativePath, ...serverFiles]) {
    buildHash.update(relativePath)
    buildHash.update(await fs.readFile(path.join(distRoot, relativePath)))
  }

  return {
    buildId: buildHash.digest('hex'),
    generatedAt: new Date().toISOString(),
    llmsDescription: routeConfig.llmsDescription || routeConfig.siteDescription || '',
    routes: routeConfig.routes,
    serverEntryPath: 'server/entry-server.js',
    serverFiles,
    siteDescription: routeConfig.siteDescription || '',
    siteName: routeConfig.siteName || 'Apopto',
    templatePath: rendererTemplateRelativePath,
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function routeOutputPath(routePath) {
  if (routePath === '/') {
    return path.join(distRoot, 'index.html')
  }

  return path.join(distRoot, routePath.replace(/^\/+/, ''), 'index.html')
}

function withHead(templateHtml, route, renderResult) {
  const title = route.title ? `${route.title} | ${routeConfig.siteName}` : routeConfig.siteName
  const description = route.description || routeConfig.siteDescription || ''
  const canonicalUrl = `${siteOrigin}${route.path}`
  const headHtml = [
    `<title>${escapeHtml(title)}</title>`,
    description ? `<meta name="description" content="${escapeHtml(description)}">` : '',
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`,
    renderResult.headHtml || '',
  ]
    .filter(Boolean)
    .join('\n    ')

  return templateHtml
    .replace(/<title>.*?<\/title>/i, '')
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i, '')
    .replace('</head>', `    ${headHtml}\n  </head>`)
}

async function writeTextFile(filePath, contents) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, contents)
}

await fs.copyFile(templatePath, rendererTemplatePath)
await writeTextFile(
  rendererManifestPath,
  `${JSON.stringify(await buildSiteRendererManifest(), null, 2)}\n`,
)

for (const route of routeConfig.routes) {
  const result = await render(`${siteOrigin}${route.path}`)
  const pageHtml = withHead(template, route, result).replace(
    '<div id="root"></div>',
    `<div id="root">${result.appHtml}</div>`,
  )

  await writeTextFile(routeOutputPath(route.path), pageHtml)
}

const sitemapEntries = routeConfig.routes
  .map((route) => `  <url><loc>${escapeHtml(`${siteOrigin}${route.path}`)}</loc></url>`)
  .join('\n')

await writeTextFile(
  path.join(distRoot, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
)

await writeTextFile(
  path.join(distRoot, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /internal/\nSitemap: ${siteOrigin}/sitemap.xml\n`,
)

await writeTextFile(
  path.join(distRoot, 'llms.txt'),
  `# ${routeConfig.siteName}\n\n${routeConfig.llmsDescription || routeConfig.siteDescription || ''}\n`,
)
