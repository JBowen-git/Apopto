import { Link } from 'react-router-dom'
import PageIntro from '../components/PageIntro.jsx'

export default function ErrorPage() {
  return (
    <PageIntro eyebrow="Error" title="Something went sideways.">
      <p>
        This route can become the friendly fallback for application errors, failed
        submissions, or temporarily unavailable content.
      </p>
      <div className="actions">
        <Link className="button primary" to="/">
          Back Home
        </Link>
        <Link className="button secondary" to="/contact">
          Contact
        </Link>
      </div>
    </PageIntro>
  )
}
