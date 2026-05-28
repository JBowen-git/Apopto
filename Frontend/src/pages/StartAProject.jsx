import { Link } from 'react-router-dom'

export default function StartAProject() {
  return (
    <section className="start-project-page project-paused-page" aria-labelledby="project-paused-title">
      <div className="project-paused-layout">
        <div className="project-paused-panel">
          <h1 id="project-paused-title">We are not currently accepting new projects.</h1>

          <div className="project-paused-details" aria-label="Availability details">
            <div>
              <span>Existing clients</span>
              <p>
                Please continue using your established communication channel or client
                portal access for active work.
              </p>
            </div>
            <div>
              <span>General inquiries</span>
              <p>
                For account questions, support, or non-project messages, use the contact
                page and include the relevant context.
              </p>
            </div>
          </div>

          <div className="project-paused-actions">
            <Link className="button primary" to="/contact">
              Contact Apopto
              <span className="button-arrow" aria-hidden="true">
                -&gt;
              </span>
            </Link>
            <Link className="button secondary" to="/portfolio">
              View portfolio
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
