import { Link } from 'react-router-dom'
import CaseStudyWorkflowExplorer from '../components/case-study/CaseStudyWorkflowExplorer.jsx'
import { caseStudyHeroStats } from '../data/portfolioCaseStudy.js'
import { livePortfolioPreview } from '../data/portfolio.js'

export default function PortfolioCaseStudy() {
  return (
    <section className="portfolio-case-study-page" aria-labelledby="portfolio-case-study-title">
      <section className="portfolio-case-study-hero">
        <div className="portfolio-case-study-hero-copy">
          <p className="portfolio-project-label">Ecommerce case study</p>
          <h1 id="portfolio-case-study-title">Ironwall Engraving</h1>
          <p>
            A production ecommerce system for custom engraved products, built around a
            fast public storefront, protected owner tools, Stripe checkout, Shippo
            fulfillment, durable order side effects, and AWS-backed disaster recovery.
          </p>
          <div className="portfolio-case-study-actions">
            <a href={livePortfolioPreview.url} rel="noreferrer" target="_blank">
              Visit live site
              <span aria-hidden="true">-&gt;</span>
            </a>
            <Link to="/portfolio">
              Back to portfolio
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </div>
        </div>

        <dl className="portfolio-case-study-stats">
          {caseStudyHeroStats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="portfolio-case-study-overview" aria-label="Case study overview">
        <div>
          <p className="portfolio-project-label">Build focus</p>
          <h2>Commerce that keeps the owner workflow intact.</h2>
        </div>
        <div className="portfolio-case-study-overview-copy">
          <p>
            The system is more than a storefront. Product and post content can be
            managed through protected admin APIs, catalog changes queue prerendering
            work, and paid orders flow through an outbox, SNS fanout, SQS queues, and
            independent worker Lambdas.
          </p>
          <p>
            That architecture keeps public browsing fast while checkout, fulfillment,
            stock movement, emails, owner tasks, observability, deployment, and
            disaster recovery remain explicit parts of the build.
          </p>
        </div>
      </section>

      <CaseStudyWorkflowExplorer />
    </section>
  )
}
