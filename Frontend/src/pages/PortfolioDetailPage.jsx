import { Link } from 'react-router-dom'

export default function PortfolioDetailPage() {
  return (
    <section className="portfolio-detail-page" aria-labelledby="portfolio-detail-title">
      <div className="portfolio-detail-card">
        <h1 id="portfolio-detail-title">Coming Soon</h1>
        <Link className="portfolio-detail-back" to="/portfolio">
          Return to Portfolio
          <span aria-hidden="true">-&gt;</span>
        </Link>
      </div>
    </section>
  )
}
