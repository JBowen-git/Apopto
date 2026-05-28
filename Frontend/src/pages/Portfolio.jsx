import { Link } from 'react-router-dom'
import PortfolioClusterImage from '../components/portfolio/PortfolioClusterImage.jsx'
import { livePortfolioPreview, portfolioProjects, portfolioQuickLinks } from '../data/portfolio.js'

export default function Portfolio() {
  return (
    <section className="portfolio-page" aria-labelledby="portfolio-title">
      <h1 className="visually-hidden" id="portfolio-title">
        Portfolio
      </h1>

      <div
        className="portfolio-image-cluster"
        id="portfolio-previews"
        aria-label="Selected website screenshots"
      >
        {portfolioProjects.map((project, index) => (
          <PortfolioClusterImage key={project.image} project={project} index={index} />
        ))}
        <div className="portfolio-hero-overlay" aria-hidden="true" />
        <p className="portfolio-hero-title">
          <span>Built Around People,</span>
          <span>
            Not <strong>Templates.</strong>
          </span>
        </p>
      </div>

      <section
        className="portfolio-story-paper"
        id="portfolio-approach"
        aria-label="Portfolio introduction"
      >
        <div className="portfolio-story-paper-intro">
          <p className="portfolio-project-label">Portfolio approach</p>
          <h2>
            Every build starts with a simple question: what should this page help someone
            understand, trust, and do?
          </h2>
          <nav className="portfolio-quick-links" aria-label="Portfolio quick links">
            {portfolioQuickLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="portfolio-story-paper-body" id="portfolio-details">
          <p>
            Apopto takes an engineering-led approach to websites and web applications.
            The goal is not to fill a page with every possible component, effect, or
            conversion trick. The goal is to build a technically sound system that feels
            clear, reliable, recognizable, and easy to move through.
          </p>
          <p>
            Design still matters, but it has a job. Layout, motion, copy, and calls to
            action should make the offer easier to understand, not louder or more
            complicated. Sometimes the strongest choice is the simplest one: fewer
            distractions, cleaner structure, faster pages, and a path that helps visitors
            take the next step without feeling overwhelmed.
          </p>
          <p>
            The work here shows how a website can become more than a static brochure.
            Some projects need lead capture, booking flows, dashboards, automations,
            customer portals, internal tools, or AWS-backed infrastructure. Others need a
            focused public-facing site that explains the offer clearly and earns trust
            before asking for action.
          </p>
          <p>
            Each build is shaped around the business, the customer, and the system behind
            the page. That means clear messaging, responsive layouts, reliable data
            flows, practical components, and enough flexibility to add new campaigns,
            pages, services, or products later.
          </p>
          <p>
            This portfolio is a mix of completed work, build breakdowns, and concept
            directions. Together, they show a systems-first approach to webapp
            development: polished enough to represent the brand, simple enough to use,
            and strong enough to keep supporting growth after launch.
          </p>
        </div>
      </section>

      <section
        className="portfolio-live-preview"
        id="portfolio-live-site"
        aria-labelledby="portfolio-live-preview-title"
      >
        <div className="portfolio-live-preview-copy">
          <p className="portfolio-project-label">Latest live site</p>
          <h2 id="portfolio-live-preview-title">{livePortfolioPreview.title}</h2>
          <p>{livePortfolioPreview.description}</p>
          <a href={livePortfolioPreview.url} rel="noreferrer" target="_blank">
            Visit live site
            <span aria-hidden="true">-&gt;</span>
          </a>
        </div>
        <div className="portfolio-live-preview-frame">
          <iframe
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
            src={livePortfolioPreview.url}
            title="Ironwall Engraving live site preview"
          />
          <a
            aria-label="Open Ironwall Engraving live site"
            className="portfolio-live-preview-target"
            href={livePortfolioPreview.url}
            rel="noreferrer"
            target="_blank"
          />
        </div>
      </section>
    </section>
  )
}
