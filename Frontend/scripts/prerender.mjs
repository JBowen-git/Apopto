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

const siteOrigin = (process.env.PRERENDER_SITE_ORIGIN || 'https://apopto.net').replace(/\/+$/, '')
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
    defaultOgImage: routeConfig.defaultOgImage || '',
    llmsDescription: routeConfig.llmsDescription || routeConfig.siteDescription || '',
    organization: routeConfig.organization || {},
    routes: routeConfig.routes,
    serverEntryPath: 'server/entry-server.js',
    serverFiles,
    siteDescription: routeConfig.siteDescription || '',
    siteName: routeConfig.siteName || 'Apopto',
    solutionServices: routeConfig.solutionServices || [],
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

function absoluteUrl(value) {
  if (!value) {
    return ''
  }

  return /^https?:\/\//i.test(value)
    ? value
    : new URL(value, siteOrigin).toString()
}

function routeTitle(route) {
  return route.metaTitle || (route.title ? `${route.title} | ${routeConfig.siteName}` : routeConfig.siteName)
}

function isSitemapRoute(route) {
  return route.sitemap !== false && !route.noindex
}

function jsonLdScript(schema) {
  return `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`
}

function organizationId() {
  return `${siteOrigin}/#organization`
}

function websiteId() {
  return `${siteOrigin}/#website`
}

function buildOrganizationSchema() {
  const organization = routeConfig.organization || {}
  const sameAs = Array.isArray(organization.sameAs)
    ? organization.sameAs.filter(Boolean)
    : []
  const serviceTypes = Array.isArray(organization.serviceTypes)
    ? organization.serviceTypes.filter(Boolean)
    : []
  const logo = absoluteUrl(organization.logo || routeConfig.defaultOgImage)

  return {
    '@type': organization.type || 'ProfessionalService',
    '@id': organizationId(),
    name: routeConfig.siteName,
    url: new URL('/', siteOrigin).toString(),
    description: organization.description || routeConfig.siteDescription || '',
    ...(logo ? { logo, image: logo } : {}),
    founder: {
      '@type': 'Person',
      name: organization.founderName || 'Jake Bowen',
      ...(sameAs.length ? { sameAs } : {}),
    },
    ...(organization.areaServed ? { areaServed: organization.areaServed } : {}),
    ...(serviceTypes.length ? { serviceType: serviceTypes } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  }
}

function buildWebsiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': websiteId(),
    name: routeConfig.siteName,
    url: new URL('/', siteOrigin).toString(),
    description: routeConfig.siteDescription || '',
    publisher: {
      '@id': organizationId(),
    },
  }
}

function buildBreadcrumbSchema(route) {
  const routeUrl = new URL(route.path, siteOrigin).toString()

  return {
    '@type': 'BreadcrumbList',
    '@id': `${routeUrl}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: new URL('/', siteOrigin).toString(),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: route.breadcrumb || route.title || routeConfig.siteName,
        item: routeUrl,
      },
    ],
  }
}

function buildSolutionsServiceSchema(route) {
  const organization = routeConfig.organization || {}
  const services = Array.isArray(routeConfig.solutionServices)
    ? routeConfig.solutionServices.filter((service) => service?.name)
    : []

  return {
    '@type': 'Service',
    '@id': `${new URL(route.path, siteOrigin).toString()}#service`,
    name: route.title,
    description: route.description || '',
    provider: {
      '@id': organizationId(),
    },
    ...(organization.areaServed ? { areaServed: organization.areaServed } : {}),
    ...(Array.isArray(organization.serviceTypes) ? { serviceType: organization.serviceTypes } : {}),
    ...(services.length ? {
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Apopto web development services',
        itemListElement: services.map((service, index) => ({
          '@type': 'Offer',
          position: index + 1,
          itemOffered: {
            '@type': 'Service',
            name: service.name,
            description: service.description || '',
            provider: {
              '@id': organizationId(),
            },
            ...(organization.areaServed ? { areaServed: organization.areaServed } : {}),
          },
        })),
      },
    } : {}),
  }
}

function buildStructuredDataScript(route) {
  const graph = []

  if (route.path === '/' || route.path === '/about' || route.path === '/solutions') {
    graph.push(buildOrganizationSchema())
  }

  if (route.path === '/') {
    graph.push(buildWebsiteSchema())
  }

  if (route.path !== '/' && isSitemapRoute(route)) {
    graph.push(buildBreadcrumbSchema(route))
  }

  if (route.path === '/solutions') {
    graph.push(buildSolutionsServiceSchema(route))
  }

  if (graph.length === 0) {
    return ''
  }

  return jsonLdScript({
    '@context': 'https://schema.org',
    '@graph': graph,
  })
}

function withHead(templateHtml, route, renderResult) {
  const title = routeTitle(route)
  const description = route.description || routeConfig.siteDescription || ''
  const canonicalUrl = new URL(route.path, siteOrigin).toString()
  const ogImage = absoluteUrl(route.ogImage || routeConfig.defaultOgImage)
  const structuredDataScript = buildStructuredDataScript(route)
  const headHtml = [
    `<title>${escapeHtml(title)}</title>`,
    description ? `<meta name="description" content="${escapeHtml(description)}">` : '',
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}">`,
    `<meta property="og:title" content="${escapeHtml(route.ogTitle || title)}">`,
    description ? `<meta property="og:description" content="${escapeHtml(route.ogDescription || description)}">` : '',
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}">`,
    `<meta property="og:type" content="${escapeHtml(route.ogType || 'website')}">`,
    `<meta property="og:site_name" content="${escapeHtml(routeConfig.siteName)}">`,
    ogImage ? `<meta property="og:image" content="${escapeHtml(ogImage)}">` : '',
    ogImage ? `<meta property="og:image:width" content="${escapeHtml(route.ogImageWidth || '1200')}">` : '',
    ogImage ? `<meta property="og:image:height" content="${escapeHtml(route.ogImageHeight || '630')}">` : '',
    `<meta name="twitter:card" content="${escapeHtml(route.twitterCard || 'summary_large_image')}">`,
    `<meta name="twitter:title" content="${escapeHtml(route.twitterTitle || route.ogTitle || title)}">`,
    description ? `<meta name="twitter:description" content="${escapeHtml(route.twitterDescription || route.ogDescription || description)}">` : '',
    ogImage ? `<meta name="twitter:image" content="${escapeHtml(route.twitterImage ? absoluteUrl(route.twitterImage) : ogImage)}">` : '',
    route.noindex || route.sitemap === false ? '<meta name="robots" content="noindex">' : '',
    structuredDataScript,
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
  .filter(isSitemapRoute)
  .map((route) => [
    '  <url>',
    `    <loc>${escapeHtml(new URL(route.path, siteOrigin).toString())}</loc>`,
    route.lastmod ? `    <lastmod>${escapeHtml(route.lastmod)}</lastmod>` : '',
    '  </url>',
  ].filter(Boolean).join('\n'))
  .join('\n')

await writeTextFile(
  path.join(distRoot, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</urlset>\n`,
)

await writeTextFile(
  path.join(distRoot, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', siteOrigin).toString()}\n`,
)

await writeTextFile(
  path.join(distRoot, 'llms.txt'),
  `# ${routeConfig.siteName}\n\n${routeConfig.llmsDescription || routeConfig.siteDescription || ''}\n`,
)
