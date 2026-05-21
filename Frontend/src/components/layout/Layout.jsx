import { Link, NavLink, useLocation } from 'react-router-dom'
import { useApoptoAuth } from '../../auth.jsx'
import ApoptoLogoMark from '../brand/ApoptoLogoMark.jsx'
import InsightsNav from '../insights/InsightsNav.jsx'
import { navItems } from '../../data/navigation.js'
import SiteFooter from './SiteFooter.jsx'

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const { isAuthenticated, isConfigured, isLoading, logout } = useApoptoAuth()
  const isHome = pathname === '/'
  const hasInsightsNav = pathname === '/insights' || pathname.startsWith('/insights/')
  const showDashboardNav = isConfigured && !isLoading && isAuthenticated

  return (
    <div className={isHome ? 'app-shell home-shell' : 'app-shell'}>
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
                to={item.to === '/account' && showDashboardNav ? '/dashboard' : item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {item.to === '/account' ? (showDashboardNav ? 'Dashboard' : 'Login') : item.label}
              </NavLink>
            ))}
          </nav>
          <div className="site-header-actions">
            {showDashboardNav ? (
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
      <main className={hasInsightsNav ? 'page-main page-main-insights' : 'page-main'}>
        {hasInsightsNav ? <InsightsNav /> : null}
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
