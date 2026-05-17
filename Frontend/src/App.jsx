import { Link, NavLink, Route, Routes } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <Link className="brand" to="/">
          Apopto
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
      </header>
      <main>{children}</main>
    </div>
  )
}

function Home() {
  return (
    <section className="hero">
      <div>
        <p className="eyebrow">Simple Website Template</p>
        <h1>Apopto</h1>
        <p className="lede">
          A clean React site scaffold with SSR prerendering, CloudFront hosting, and a
          Lambda-backed health endpoint.
        </p>
        <div className="actions">
          <Link className="button primary" to="/contact">
            Contact
          </Link>
          <Link className="button secondary" to="/about">
            Learn More
          </Link>
        </div>
      </div>
    </section>
  )
}

function About() {
  return (
    <section className="content-section">
      <p className="eyebrow">About</p>
      <h1>Built for a repeatable launch path.</h1>
      <p>
        This starter keeps the public site small and fast while leaving room for client
        content, API endpoints, and production release controls.
      </p>
    </section>
  )
}

function Contact() {
  return (
    <section className="content-section">
      <p className="eyebrow">Contact</p>
      <h1>Ready for client-specific details.</h1>
      <p>
        Replace this page with the client intake form, booking link, phone number, or
        whatever contact flow the project needs.
      </p>
    </section>
  )
}

function NotFound() {
  return (
    <section className="content-section">
      <p className="eyebrow">404</p>
      <h1>Page not found.</h1>
      <p>The page you requested does not exist.</p>
      <Link className="button primary" to="/">
        Back Home
      </Link>
    </section>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
