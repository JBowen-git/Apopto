import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import routeConfig from '../../../ssr-routes.json'

const siteOrigin = (import.meta.env.VITE_SITE_ORIGIN || 'https://apopto.net').replace(/\/+$/, '')

function normalizePath(pathname) {
  if (!pathname || pathname === '/') {
    return '/'
  }

  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

const routesByPath = new Map(
  routeConfig.routes.map((route) => [normalizePath(route.path), route]),
)

const clientOnlyRoutes = [
  {
    path: '/dashboard',
    title: 'Client Dashboard',
    description: 'Secure Apopto client project dashboard.',
    sitemap: false,
  },
  {
    path: '/intake',
    title: 'Project Intake',
    description: 'Secure Apopto project intake workspace.',
    sitemap: false,
  },
  {
    path: '/files',
    title: 'Project Files',
    description: 'Secure Apopto client file workspace.',
    sitemap: false,
  },
  {
    path: '/messages',
    title: 'Project Messages',
    description: 'Secure Apopto client message workspace.',
    sitemap: false,
  },
  {
    path: '/billing',
    title: 'Project Billing',
    description: 'Secure Apopto client billing workspace.',
    sitemap: false,
  },
  {
    path: '/admin/clients',
    title: 'Admin Clients',
    description: 'Secure Apopto internal client administration.',
    sitemap: false,
  },
]

const clientRoutesByPath = new Map(
  clientOnlyRoutes.map((route) => [normalizePath(route.path), route]),
)

function getRoute(pathname) {
  const normalizedPath = normalizePath(pathname)

  if (routesByPath.has(normalizedPath)) {
    return routesByPath.get(normalizedPath)
  }

  if (clientRoutesByPath.has(normalizedPath)) {
    return clientRoutesByPath.get(normalizedPath)
  }

  if (normalizedPath.startsWith('/messages/')) {
    return {
      path: normalizedPath,
      title: 'Project Message Thread',
      description: 'Secure Apopto client message thread.',
      sitemap: false,
    }
  }

  if (normalizedPath.startsWith('/admin/clients/')) {
    return {
      path: normalizedPath,
      title: 'Admin Client Detail',
      description: 'Secure Apopto internal client administration detail.',
      sitemap: false,
    }
  }

  return routesByPath.get('/404') || {
    path: normalizedPath,
    title: 'Page Not Found',
    description: routeConfig.siteDescription,
    sitemap: false,
  }
}

function getTitle(route) {
  return route.metaTitle || (route.title ? `${route.title} | ${routeConfig.siteName}` : routeConfig.siteName)
}

function absoluteUrl(value) {
  if (!value) {
    return ''
  }

  return /^https?:\/\//i.test(value)
    ? value
    : new URL(value, siteOrigin).toString()
}

function setMeta(selector, attributes, content) {
  let meta = document.head.querySelector(selector)

  if (!content) {
    if (meta?.dataset.routeHead === 'true') {
      meta.remove()
    }
    return
  }

  if (!meta) {
    meta = document.createElement('meta')
    Object.entries(attributes).forEach(([name, value]) => {
      meta.setAttribute(name, value)
    })
    document.head.append(meta)
  }

  meta.dataset.routeHead = 'true'
  meta.setAttribute('content', content)
}

function setNamedMeta(name, content) {
  setMeta(`meta[name="${name}"]`, { name }, content)
}

function setPropertyMeta(property, content) {
  setMeta(`meta[property="${property}"]`, { property }, content)
}

function setCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]')

  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.append(link)
  }

  link.dataset.routeHead = 'true'
  link.setAttribute('href', href)
}

export default function RouteHead() {
  const { pathname } = useLocation()

  useEffect(() => {
    const route = getRoute(pathname)
    const title = getTitle(route)
    const description = route.description || routeConfig.siteDescription || ''
    const canonicalUrl = new URL(route.path, siteOrigin).toString()
    const ogImage = absoluteUrl(route.ogImage || routeConfig.defaultOgImage)
    const shouldNoindex = route.noindex || route.sitemap === false

    document.title = title
    setNamedMeta('description', description)
    setCanonical(canonicalUrl)
    setPropertyMeta('og:title', route.ogTitle || title)
    setPropertyMeta('og:description', route.ogDescription || description)
    setPropertyMeta('og:url', canonicalUrl)
    setPropertyMeta('og:type', route.ogType || 'website')
    setPropertyMeta('og:site_name', routeConfig.siteName)
    setPropertyMeta('og:image', ogImage)
    setPropertyMeta('og:image:width', ogImage ? String(route.ogImageWidth || 1200) : '')
    setPropertyMeta('og:image:height', ogImage ? String(route.ogImageHeight || 630) : '')
    setNamedMeta('twitter:card', route.twitterCard || 'summary_large_image')
    setNamedMeta('twitter:title', route.twitterTitle || route.ogTitle || title)
    setNamedMeta('twitter:description', route.twitterDescription || route.ogDescription || description)
    setNamedMeta('twitter:image', route.twitterImage ? absoluteUrl(route.twitterImage) : ogImage)
    setNamedMeta('robots', shouldNoindex ? 'noindex' : '')
  }, [pathname])

  return null
}
