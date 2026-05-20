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
          <h2>Websites shaped around the people who use them.</h2>
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
            Every project starts with the person on the other side of the screen: what
            they need to understand, what they need to trust, and what action should feel
            natural when they are ready.
          </p>
          <p>
            These builds are shaped around clear messaging, strong visual hierarchy, and
            practical paths from first impression to inquiry, purchase, booking, or launch.
          </p>
          <p>
            The result is a portfolio of websites that feel custom to the business behind
            them, while staying structured enough to grow as the offer evolves.
          </p>
          <p>
            Each page is designed to make the next step obvious without flattening the
            brand into a template. Layout, motion, calls to action, and supporting content
            are chosen around the offer and the people it needs to reach.
          </p>
          <p>
            This gives every build a practical foundation: a polished visual impression,
            a clear content path, and room for future campaigns, pages, products, or
            service lines.
          </p>
          <p>
            Some projects need a bold first screen that immediately frames the offer.
            Others need a quieter path with proof, comparisons, service details, and
            supporting content that helps a visitor move at their own pace.
          </p>
          <p>
            The strongest portfolio work is not just visually polished. It is practical:
            easy to update, easy to expand, and structured so new offers or campaigns can
            be added without rebuilding the entire site.
          </p>
          <p>
            The common thread is care: care for the brand, care for the visitor, and care
            for the business owner who needs the site to become a useful part of how they
            sell, explain, and grow.
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
