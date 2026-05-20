import { Link } from 'react-router-dom'

export default function PortfolioDetailPage({ page }) {
  return (
    <section className="portfolio-detail-page" aria-labelledby="portfolio-detail-title">
      <div className="portfolio-detail-card">
        <p className="portfolio-project-label">{page.eyebrow}</p>
        <h1 id="portfolio-detail-title">{page.title}</h1>
        <p>{page.intro}</p>
        <ul>
          {page.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <Link className="portfolio-detail-back" to="/portfolio">
          Back to Portfolio
          <span aria-hidden="true">-&gt;</span>
        </Link>
      </div>
    </section>
  )
}
