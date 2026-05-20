import { Link } from 'react-router-dom'
import DiagonalScrollSection from '../DiagonalScrollSection.jsx'
import FlyInBox from '../FlyInBox.jsx'
import HeroShineText from '../HeroShineText.jsx'
import HeroFeatureIcon from '../components/home/HeroFeatureIcon.jsx'
import { heroFeatureItems } from '../data/home.js'

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <HeroShineText text="Apopto" />
          <p className="hero-tagline">
            Programmed to evolve.
            <br />
            Designed to impress.
          </p>
          <span className="accent-line" aria-hidden="true" />
          <p className="lede">
            Custom websites, web apps, and digital systems
            <br className="hero-lede-break" />
            built for growing businesses.
          </p>
          <div className="actions">
            <Link className="button primary" to="/start-a-project">
              Start a Project
              <span className="button-arrow" aria-hidden="true">
                -&gt;
              </span>
            </Link>
          </div>
        </div>
        <div className="hero-feature-strip" aria-label="Apopto capabilities">
          {heroFeatureItems.map((item) => (
            <div className="hero-feature-item" key={item.title}>
              <span className="hero-feature-icon-frame">
                <HeroFeatureIcon type={item.icon} />
              </span>
              <span className="hero-feature-copy">
                <span className="hero-feature-title">{item.title}</span>
                <span className="hero-feature-detail">{item.detail}</span>
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="home-showcase-section" aria-labelledby="home-showcase-title">
        <FlyInBox className="home-showcase-header" threshold={0.18}>
          <p className="home-intro-eyebrow">Launch sequence</p>
          <h2 id="home-showcase-title">
            From first impression to working system.
          </h2>
          <p>
            Apopto shapes each page as a route through message, proof, action, and room
            for the digital product to keep growing.
          </p>
        </FlyInBox>
        <DiagonalScrollSection />
      </section>
      <section className="home-pong-cover-section" aria-labelledby="home-pong-cover-title">
        <div className="home-pong-cover-inner">
          <p className="home-intro-eyebrow">Next level</p>
          <h2 id="home-pong-cover-title">Motion is only the opening move.</h2>
          <p>
            Apopto turns polished interfaces into connected systems: lead capture,
            dashboards, automations, and launch paths that keep working after the first
            visit.
          </p>
          <div className="home-pong-cover-points" aria-label="Post-launch capabilities">
            <span>Forms to workflows</span>
            <span>Dashboards to decisions</span>
            <span>Launches to iteration</span>
          </div>
        </div>
      </section>
    </>
  )
}
