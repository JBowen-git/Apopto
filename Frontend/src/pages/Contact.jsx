import { Link } from 'react-router-dom'
import SimpleContactForm from '../components/forms/SimpleContactForm.jsx'

export default function Contact() {
  return (
    <section className="contact-page" aria-label="Contact">
      <div className="contact-layout">
        <div className="contact-slate-bars" aria-hidden="true">
          <span className="contact-slate-bar contact-slate-bar-1" />
          <span className="contact-slate-bar contact-slate-bar-2" />
          <span className="contact-slate-bar contact-slate-bar-3" />
        </div>

        <aside className="contact-next-panel" aria-label="What happens after contact">
          <span>After you reach out</span>
          <h1>What happens next?</h1>
          <p>
            Send a message with the basics and I’ll take it from there. Whether you have
            a quick question, need help with an existing site, or want to understand
            future availability, I’ll respond with a clear next step.
          </p>
          <ul>
            <li>Review your message and contact preference.</li>
            <li>Reply with an answer, recommendation, or follow-up question.</li>
            <li>Share current availability before any larger project discussion.</li>
            <li>Keep the conversation focused and easy to start.</li>
          </ul>
          <div className="contact-next-cta">
            <h2>Planning Future Work?</h2>
            <Link className="button primary contact-next-button" to="/start-a-project">
              Start a Project
              <span className="button-arrow" aria-hidden="true">
                -&gt;
              </span>
            </Link>
          </div>
        </aside>

        <SimpleContactForm />
      </div>
    </section>
  )
}
