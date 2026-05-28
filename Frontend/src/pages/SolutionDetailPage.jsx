import { Link, Navigate, useParams } from 'react-router-dom'
import SolutionPlaceholderImage from '../components/solutions/SolutionPlaceholderImage.jsx'
import { solutionProducts } from '../data/solutions.js'

const solutionAccentStyles = [
  {
    '--solution-accent': '#2563eb',
    '--solution-accent-soft': 'rgba(37, 99, 235, 0.16)',
    '--solution-accent-mid': 'rgba(37, 99, 235, 0.34)',
  },
  {
    '--solution-accent': '#0f766e',
    '--solution-accent-soft': 'rgba(20, 184, 166, 0.15)',
    '--solution-accent-mid': 'rgba(15, 118, 110, 0.34)',
  },
  {
    '--solution-accent': '#b45309',
    '--solution-accent-soft': 'rgba(245, 158, 11, 0.18)',
    '--solution-accent-mid': 'rgba(180, 83, 9, 0.32)',
  },
]

export default function SolutionDetailPage() {
  const { serviceSlug } = useParams()
  const productIndex = solutionProducts.findIndex((product) => product.slug === serviceSlug)
  const product = productIndex >= 0 ? solutionProducts[productIndex] : null

  if (!product) {
    return <Navigate to="/404" replace />
  }

  const accentStyle = solutionAccentStyles[productIndex] || solutionAccentStyles[0]

  return (
    <section className="solution-detail-page" style={accentStyle} aria-labelledby="solution-detail-title">
      <div className="solution-detail-hero">
        <div className="solution-detail-copy">
          <nav className="solution-detail-breadcrumb" aria-label="Breadcrumb">
            <Link to="/solutions">Solutions</Link>
            <span aria-hidden="true">/</span>
            <span>{product.title}</span>
          </nav>
          <p className="eyebrow">{product.detail.eyebrow}</p>
          <h1 id="solution-detail-title">{product.detail.title}</h1>
          <p className="solution-detail-intro">{product.detail.intro}</p>
          <p>{product.detail.body}</p>
          <div className="solution-detail-pricing" aria-label={`${product.title} pricing`}>
            <div>
              <span>Starting At</span>
              <strong>{product.pricing.startingAt}</strong>
              <small>One-time build</small>
            </div>
            <div>
              <span>Standard Support</span>
              <strong>{product.pricing.monthlySupport}</strong>
              <small>Monthly</small>
            </div>
          </div>
          <div className="solution-detail-actions">
            <Link className="button primary" to="/start-a-project">
              Start a Project
              <span className="button-arrow" aria-hidden="true">
                -&gt;
              </span>
            </Link>
            <Link className="button secondary" to="/solutions">
              View All Solutions
            </Link>
          </div>
        </div>

        <div className="solution-detail-visual" aria-hidden="true">
          <SolutionPlaceholderImage index={productIndex} title={product.title} />
        </div>
      </div>

      <div className="solution-detail-main">
        <section className="solution-detail-panel" aria-labelledby="solution-outcomes-title">
          <div>
            <p className="solution-detail-kicker">What it helps with</p>
            <h2 id="solution-outcomes-title">A clearer path from visitor interest to business action.</h2>
          </div>
          <ul className="solution-detail-outcomes">
            {product.detail.outcomes.map((outcome) => (
              <li key={outcome}>{outcome}</li>
            ))}
          </ul>
        </section>

        <section className="solution-detail-section-grid" aria-label={`${product.title} details`}>
          {product.detail.sections.map((section) => (
            <article key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.copy}</p>
            </article>
          ))}
        </section>

        <section className="solution-detail-included" aria-labelledby="solution-included-title">
          <div>
            <p className="solution-detail-kicker">Included features</p>
            <h2 id="solution-included-title">{product.title}</h2>
          </div>
          <ul>
            {product.includes ? <li>{product.includes}</li> : null}
            {product.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  )
}
