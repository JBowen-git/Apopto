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
        <h1 id="solutions-title">Three product paths, each built to sell clearly.</h1>
      </div>

      <div className="solution-card-grid">
        {solutionProducts.map((product, index) => (
          <article className="solution-card" key={product.title}>
            <div className="solution-card-image">
              <SolutionPlaceholderImage index={index} title={product.title} />
            </div>
            <div className="solution-card-content">
              <h2>{product.title}</h2>
              <p>{product.description}</p>
              <ul className="solution-card-features">
                {product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
