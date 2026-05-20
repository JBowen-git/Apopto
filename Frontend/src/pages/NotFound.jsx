import { Link } from 'react-router-dom'
import PageIntro from '../components/PageIntro.jsx'

export default function NotFound() {
  return (
    <PageIntro eyebrow="404" title="Page not found.">
      <p>The page you requested does not exist.</p>
      <div className="actions">
        <Link className="button primary" to="/">
          Back Home
        </Link>
      </div>
    </PageIntro>
  )
}
