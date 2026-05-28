import { useEffect, useState } from 'react'
import SolutionPlaceholderImage from '../components/solutions/SolutionPlaceholderImage.jsx'
import { solutionProducts, solutionsAnimationStorageKey } from '../data/solutions.js'

export default function Solutions() {
  const [shouldAnimateSolutions] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    try {
      return window.sessionStorage.getItem(solutionsAnimationStorageKey) !== 'true'
    } catch {
      return true
    }
  })

  useEffect(() => {
    if (!shouldAnimateSolutions || typeof window === 'undefined') {
      return undefined
    }

    const animationCompleteTimer = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(solutionsAnimationStorageKey, 'true')
      } catch {
        // Ignore storage failures so the page still renders normally.
      }
    }, 1800)

    return () => {
      window.clearTimeout(animationCompleteTimer)
    }
  }, [shouldAnimateSolutions])

  return (
    <section
      className={`solutions-page${shouldAnimateSolutions ? ' solutions-page-animate' : ''}`}
      aria-labelledby="solutions-title"
    >
      <div className="solutions-page-header">
        <p className="eyebrow">Solutions</p>
        <h1 id="solutions-title">
          Websites built to help customers find you, trust you, and take action.
        </h1>
      </div>

      <div className="solution-card-grid">
        {solutionProducts.map((product, index) => (
          <article className="solution-card" key={product.title}>
            <div className="solution-card-image">
              <SolutionPlaceholderImage index={index} title={product.title} />
            </div>
            <div className="solution-card-content">
              <p className="solution-card-kicker">{product.kicker}</p>
              <h2>{product.title}</h2>
              <p className="solution-card-summary">{product.summary}</p>
              <p>{product.description}</p>
              <p className="solution-card-best">{product.bestFor}</p>
              <ul className="solution-card-features">
                {product.includes ? (
                  <li className="solution-card-includes">{product.includes}</li>
                ) : null}
                {product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <section className="solutions-detail-section" aria-labelledby="solutions-detail-title">
        <div className="solutions-detail-copy">
          <p className="solutions-detail-eyebrow">Built in from day one</p>
          <h2 id="solutions-detail-title">Premium SEO comes standard.</h2>
          <p>
            Choose the level of website your business needs now, with room to grow into
            lead management, client portals, online payments, or ecommerce when the time is right.
            The higher tiers add business tools, not a better search foundation.
          </p>
          <p className="solutions-seo-note">
            Every Apopto website includes search engine optimization, fast mobile performance,
            and clear calls to action.
          </p>
        </div>
        <div className="solutions-detail-grid" aria-label="SEO included with every website">
          <article>
            <span>01</span>
            <h3>Search-ready pages</h3>
            <p>Services, products, locations, and key offers are organized so customers and search engines can understand them.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Fast mobile experience</h3>
            <p>Pages are built for quick loading, clean browsing, and strong first impressions on phones.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Clear conversion paths</h3>
            <p>Calls to action, forms, and trust sections help turn search traffic into real inquiries, purchases, or next steps.</p>
          </article>
        </div>
      </section>
    </section>
  )
}
