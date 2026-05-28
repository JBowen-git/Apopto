import { Link, NavLink, useLocation } from 'react-router-dom'
import { useApoptoAuth } from '../../authContext.jsx'
import ApoptoLogoMark from '../brand/ApoptoLogoMark.jsx'
import { navItems } from '../../data/navigation.js'
import RouteHead from '../routing/RouteHead.jsx'
import SiteFooter from './SiteFooter.jsx'

function isWorkspaceRoute(pathname) {
  return pathname === '/dashboard'
    || pathname === '/intake'
    || pathname === '/files'
    || pathname === '/messages'
    || pathname.startsWith('/messages/')
    || pathname === '/billing'
    || pathname === '/admin/clients'
    || pathname.startsWith('/admin/clients/')
}

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const { isAuthenticated, isConfigured, isLoading, logout } = useApoptoAuth()
  const isHome = pathname === '/'
  const hasInsightsNav = pathname === '/insights'
  const isWorkspace = isWorkspaceRoute(pathname)
  const showSignOutAction = isConfigured && !isLoading && isAuthenticated

  return (
    <div className={isWorkspace ? 'app-shell workspace-app-shell' : isHome ? 'app-shell home-shell' : 'app-shell'}>
      <RouteHead />
      {!isWorkspace ? (
        <header
          className={
            isHome
              ? 'site-header site-header-home site-header-overlay'
              : 'site-header site-header-standard'
          }
        >
          <div className="site-header-inner">
            <Link className="brand" to="/" aria-label="Apopto home">
              <ApoptoLogoMark />
            </Link>
            <nav className="site-nav" aria-label="Primary navigation">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => (isActive ? 'active' : undefined)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="site-header-actions">
              {showSignOutAction ? (
                <button
                  aria-label="Sign out of your customer account"
                  className="nav-auth-action"
                  onClick={logout}
                  type="button"
                >
                  Sign out
                </button>
              ) : null}
              <Link className="nav-cta" to="/start-a-project">
                Start a Project
              </Link>
            </div>
          </div>
        </header>
      ) : null}
      <main className={isWorkspace ? 'page-main page-main-workspace' : hasInsightsNav ? 'page-main page-main-insights' : 'page-main'}>
        {children}
      </main>
      {!isWorkspace ? <SiteFooter /> : null}
    </div>
  )
}
