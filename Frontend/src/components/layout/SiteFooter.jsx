import { Link } from 'react-router-dom'
import ApoptoLogoMark from '../brand/ApoptoLogoMark.jsx'
import { navItems } from '../../data/navigation.js'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link className="brand footer-brand" to="/" aria-label="Apopto home">
            <ApoptoLogoMark />
          </Link>
          <div>
            <p className="site-footer-kicker">Apopto</p>
            <p className="site-footer-statement">
              Custom websites, web apps, and digital systems built for growing businesses.
            </p>
          </div>
        </div>

        <nav className="site-footer-nav" aria-label="Footer navigation">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-footer-cta">
          <p>Ready to shape the next launch?</p>
          <Link className="footer-cta-link" to="/start-a-project">
            Start a Project
            <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>Programmed to evolve.</span>
        <span>Designed to impress.</span>
      </div>
    </footer>
  )
}
