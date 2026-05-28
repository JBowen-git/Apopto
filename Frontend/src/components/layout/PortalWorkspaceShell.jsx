import { Link, NavLink } from 'react-router-dom'
import { useApoptoAuth } from '../../auth.jsx'
import ApoptoLogoMark from '../brand/ApoptoLogoMark.jsx'

const clientNavItems = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Intake', to: '/intake' },
  { label: 'Files', to: '/files' },
  { label: 'Messages', to: '/messages' },
  { label: 'Billing', to: '/billing' },
]

const adminNavItems = [
  { label: 'Clients', to: '/admin/clients' },
  { label: 'Portal', to: '/dashboard' },
]

function initialsFor(user) {
  const source = user?.name ?? user?.email ?? 'Account'
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  return initials || 'AC'
}

export default function PortalWorkspaceShell({ children, variant = 'client' }) {
  const { logout, user } = useApoptoAuth()
  const navItems = variant === 'admin' ? adminNavItems : clientNavItems
  const workspaceLabel = variant === 'admin' ? 'Admin' : 'Client portal'
  const workspaceSubLabel = variant === 'admin' ? 'operations workspace' : 'project workspace'

  return (
    <section className={`portal-workspace portal-workspace-${variant}`}>
      <header className="portal-workspace-toolbar">
        <div className="portal-workspace-brand-group">
          <Link className="portal-workspace-home" to="/" aria-label="Apopto home">
            <ApoptoLogoMark />
          </Link>
          <div className="portal-workspace-title-block">
            <span>{workspaceLabel}</span>
            <small>{workspaceSubLabel}</small>
          </div>
        </div>

        <nav className="portal-workspace-nav" aria-label={`${workspaceLabel} navigation`}>
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => (isActive ? 'active' : undefined)}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="portal-workspace-account">
          <span className="portal-workspace-avatar" aria-hidden="true">
            {initialsFor(user)}
          </span>
          <button type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="portal-workspace-main">
        {children}
      </main>

      <nav className="portal-workspace-mobile-nav" aria-label={`${workspaceLabel} mobile navigation`}>
        {navItems.map((item) => (
          <NavLink
            className={({ isActive }) => (isActive ? 'active' : undefined)}
            key={item.to}
            to={item.to}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </section>
  )
}
