import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront'
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'

const HTML_CACHE_CONTROL = 'no-cache, no-store, must-revalidate'
const JSON_CACHE_CONTROL = 'no-cache, no-store, must-revalidate'
const TEXT_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300'
const XML_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300'
const RENDERER_CACHE_ROOT = '/tmp/apopto-site-renderer'

const s3Client = new S3Client({})
const cloudFrontClient = new CloudFrontClient({})

let cachedRendererBundle = null

function getRequiredEnv(name) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable '${name}'.`)
  }

  return value
}

function getOptionalEnv(name) {
  const value = process.env[name]?.trim()
  return value || null
}

function normalizeOrigin(origin) {
  return origin.replace(/\/+$/, '')
}

function normalizeS3Key(key) {
  return key.replace(/^\/+/, '').replace(/\/{2,}/g, '/')
}

function joinS3Key(...parts) {
  return normalizeS3Key(parts.filter(Boolean).join('/'))
}

function routeOutputKey(routePath) {
  const trimmedPath = routePath.replace(/^\/+/, '')
  return trimmedPath ? `${trimmedPath}/index.html` : 'index.html'
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function withHead(templateHtml, route, manifest, renderResult, siteOrigin) {
  const title = route.title ? `${route.title} | ${manifest.siteName}` : manifest.siteName
  const description = route.description || manifest.siteDescription || ''
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

function injectRenderedMarkup(template, route, manifest, renderResult, siteOrigin) {
  return withHead(template, route, manifest, renderResult, siteOrigin).replace(
    '<div id="root"></div>',
    `<div id="root">${renderResult.appHtml}</div>`,
  )
}

function buildSitemapXml(siteOrigin, routes) {
  const urls = routes.map((route) => [
    '  <url>',
    `    <loc>${escapeXml(new URL(route.path, siteOrigin).toString())}</loc>`,
    '  </url>',
  ].join('\n'))

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}

function buildRobotsTxt(siteOrigin) {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /internal/',
    '',
    `Sitemap: ${new URL('/sitemap.xml', siteOrigin).toString()}`,
    '',
  ].join('\n')
}

function buildLlmsTxt(manifest) {
  return `# ${manifest.siteName}\n\n${manifest.llmsDescription || manifest.siteDescription || ''}\n`
}

function getRendererConfig() {
  return {
    bucketName: getRequiredEnv('SITE_BUCKET'),
    cloudFrontDistributionId: getOptionalEnv('CLOUDFRONT_DISTRIBUTION_ID'),
    rendererBuildPrefix: getRequiredEnv('SITE_RENDERER_BUILD_PREFIX'),
    rendererManifestKey: getRequiredEnv('SITE_RENDERER_MANIFEST_KEY'),
    siteOrigin: normalizeOrigin(getRequiredEnv('SITE_ORIGIN')),
    stateKey: getRequiredEnv('SITE_RENDERER_STATE_KEY'),
  }
}

async function readS3ObjectAsString(bucketName, key) {
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  }))

  return response.Body.transformToString()
}

async function readOptionalJsonFromS3(bucketName, key) {
  try {
    return JSON.parse(await readS3ObjectAsString(bucketName, key))
  } catch (error) {
    if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
      return null
    }

    if (error?.name === 'AccessDenied' && error?.message?.includes('s3:ListBucket')) {
      return null
    }

    throw error
  }
}

async function readS3ObjectAsBytes(bucketName, key) {
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  }))

  const byteArray = await response.Body.transformToByteArray()
  return Buffer.from(byteArray)
}

async function writeTextObject(bucketName, key, body, { cacheControl, contentType }) {
  await s3Client.send(new PutObjectCommand({
    Body: body,
    Bucket: bucketName,
    CacheControl: cacheControl,
    ContentType: contentType,
    Key: key,
  }))
}

async function deleteKeys(bucketName, keys) {
  if (keys.length === 0) {
    return
  }

  for (let index = 0; index < keys.length; index += 1000) {
    const batch = keys.slice(index, index + 1000)

    await s3Client.send(new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: batch.map((key) => ({ Key: key })),
        Quiet: true,
      },
    }))
  }
}

async function ensureLocalAsset(config, buildId, relativePath) {
  const localPath = path.join(RENDERER_CACHE_ROOT, buildId, relativePath)

  try {
    await access(localPath)
    return localPath
  } catch {
    // Download below.
  }

  await mkdir(path.dirname(localPath), { recursive: true })
  const sourceKey = joinS3Key(config.rendererBuildPrefix, buildId, relativePath)
  const fileContents = await readS3ObjectAsBytes(config.bucketName, sourceKey)
  await writeFile(localPath, fileContents)
  return localPath
}

async function loadRendererBundle(config) {
  const manifest = await readOptionalJsonFromS3(config.bucketName, config.rendererManifestKey)

  if (
    !manifest?.buildId ||
    !manifest?.serverEntryPath ||
    !Array.isArray(manifest?.serverFiles) ||
    !manifest?.templatePath ||
    !Array.isArray(manifest?.routes)
  ) {
    throw new Error(`Renderer manifest '${config.rendererManifestKey}' is missing required fields.`)
  }

  if (cachedRendererBundle?.buildId === manifest.buildId) {
    return cachedRendererBundle
  }

  const buildRoot = path.join(RENDERER_CACHE_ROOT, manifest.buildId)
  const relativePaths = [manifest.templatePath, ...manifest.serverFiles]
  await Promise.all(relativePaths.map((relativePath) => ensureLocalAsset(config, manifest.buildId, relativePath)))
  await writeFile(path.join(buildRoot, 'package.json'), `${JSON.stringify({ type: 'module' })}\n`, 'utf8')

  cachedRendererBundle = {
    buildId: manifest.buildId,
    entryServerPath: path.join(buildRoot, manifest.serverEntryPath),
    manifest,
    templatePath: path.join(buildRoot, manifest.templatePath),
  }

  return cachedRendererBundle
}

async function renderSite(config, expectedBuildId) {
  const rendererBundle = await loadRendererBundle(config)

  if (expectedBuildId && rendererBundle.buildId !== expectedBuildId) {
    return {
      currentBuildId: rendererBundle.buildId,
      expectedBuildId,
      outcome: 'skipped-stale-build',
    }
  }

  const [{ render }, template] = await Promise.all([
    import(`${pathToFileURL(rendererBundle.entryServerPath).href}?buildId=${encodeURIComponent(rendererBundle.buildId)}`),
    readFile(rendererBundle.templatePath, 'utf8'),
  ])

  const renderedObjects = []
  const renderedSiteKeys = new Set()

  for (const route of rendererBundle.manifest.routes) {
    const renderResult = await render(`${config.siteOrigin}${route.path}`)

    if (renderResult.type && renderResult.type !== 'rendered') {
      throw new Error(`Renderer received an unexpected response for ${route.path}.`)
    }

    const key = routeOutputKey(route.path)
    renderedObjects.push({
      body: injectRenderedMarkup(template, route, rendererBundle.manifest, renderResult, config.siteOrigin),
      cacheControl: HTML_CACHE_CONTROL,
      contentType: 'text/html',
      key,
    })
    renderedSiteKeys.add(key)
  }

  renderedObjects.push({
    body: buildSitemapXml(config.siteOrigin, rendererBundle.manifest.routes),
    cacheControl: XML_CACHE_CONTROL,
    contentType: 'application/xml',
    key: 'sitemap.xml',
  })
  renderedSiteKeys.add('sitemap.xml')

  renderedObjects.push({
    body: buildRobotsTxt(config.siteOrigin),
    cacheControl: TEXT_CACHE_CONTROL,
    contentType: 'text/plain; charset=utf-8',
    key: 'robots.txt',
  })
  renderedSiteKeys.add('robots.txt')

  renderedObjects.push({
    body: buildLlmsTxt(rendererBundle.manifest),
    cacheControl: TEXT_CACHE_CONTROL,
    contentType: 'text/plain; charset=utf-8',
    key: 'llms.txt',
  })
  renderedSiteKeys.add('llms.txt')

  const previousState = await readOptionalJsonFromS3(config.bucketName, config.stateKey)
  const previousKeys = Array.isArray(previousState?.renderedSiteKeys)
    ? previousState.renderedSiteKeys.filter((key) => typeof key === 'string')
    : []
  const currentKeys = [...renderedSiteKeys].sort()
  const staleKeys = previousKeys.filter((key) => !currentKeys.includes(key))

  await Promise.all(renderedObjects.map((objectDefinition) => writeTextObject(
    config.bucketName,
    objectDefinition.key,
    objectDefinition.body,
    {
      cacheControl: objectDefinition.cacheControl,
      contentType: objectDefinition.contentType,
    },
  )))
  await deleteKeys(config.bucketName, staleKeys)
  await writeTextObject(
    config.bucketName,
    config.stateKey,
    `${JSON.stringify({
      buildId: rendererBundle.buildId,
      generatedAt: new Date().toISOString(),
      renderedSiteKeys: currentKeys,
    }, null, 2)}\n`,
    {
      cacheControl: JSON_CACHE_CONTROL,
      contentType: 'application/json',
    },
  )

  await invalidateSite(config, rendererBundle.manifest.routes)

  return {
    buildId: rendererBundle.buildId,
    outcome: 'rendered',
    renderedObjectCount: renderedObjects.length,
    staleObjectCount: staleKeys.length,
  }
}

async function invalidateSite(config, routes) {
  if (!config.cloudFrontDistributionId) {
    return false
  }

  const routePaths = routes.flatMap((route) => (
    route.path === '/' ? ['/', '/index.html'] : [route.path, `${route.path}/*`]
  ))
  const invalidationPaths = [...new Set([
    ...routePaths,
    '/sitemap.xml',
    '/robots.txt',
    '/llms.txt',
  ])]

  await cloudFrontClient.send(new CreateInvalidationCommand({
    DistributionId: config.cloudFrontDistributionId,
    InvalidationBatch: {
      CallerReference: `site-renderer-${Date.now()}`,
      Paths: {
        Items: invalidationPaths,
        Quantity: invalidationPaths.length,
      },
    },
  }))

  return true
}

function normalizeRenderEvent(event) {
  if (!event || typeof event !== 'object') {
    return {}
  }

  return {
    buildId: typeof event.buildId === 'string' ? event.buildId.trim() : '',
    trigger: typeof event.trigger === 'string' ? event.trigger.trim() : '',
  }
}

function normalizeSqsMessage(record) {
  if (typeof record?.body !== 'string' || !record.body.trim()) {
    throw new Error(`SQS message '${record?.messageId ?? 'unknown'}' did not contain a JSON body.`)
  }

  return normalizeRenderEvent(JSON.parse(record.body))
}

export async function handler(event = {}) {
  const config = getRendererConfig()

  if (Array.isArray(event?.Records)) {
    const batchItemFailures = []

    for (const record of event.Records) {
      try {
        const renderEvent = normalizeSqsMessage(record)
        const result = await renderSite(config, renderEvent.buildId)
        console.log(JSON.stringify({
          messageId: record.messageId,
          trigger: renderEvent.trigger || 'sqs',
          ...result,
        }))
      } catch (error) {
        console.error(`Renderer failed for SQS message '${record?.messageId ?? 'unknown'}':`, error)
        batchItemFailures.push({
          itemIdentifier: record.messageId,
        })
      }
    }

    return { batchItemFailures }
  }

  const renderEvent = normalizeRenderEvent(event)
  return renderSite(config, renderEvent.buildId)
}
