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
            Websites Engineered <span className="keep-together">for Growth</span>
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
            <span className="home-showcase-title-line">From first impression to</span>
            {' '}
            <span className="home-showcase-title-line">dynamic system</span>
          </h2>
          <p>
            Apopto turns your site into a responsive, data-driven system built with
            modern React, TypeScript, and AWS architecture designed to scale.
          </p>
        </FlyInBox>
        <DiagonalScrollSection />
      </section>
      <section className="home-pong-cover-section" aria-labelledby="home-pong-cover-title">
        <div className="home-pong-cover-inner">
          <p className="home-intro-eyebrow">Next level</p>
          <h2 id="home-pong-cover-title">
            Every move
            <br />
            changes the system.
          </h2>
          <p>
            User behavior, forms, analytics, and automations feed into connected
            workflows designed to evolve over time.
          </p>
          <div className="home-pong-cover-points" aria-label="Post-launch capabilities">
            <span>Interactions to insight</span>
            <span>Motion to response</span>
            <span>Visits to conversion</span>
          </div>
        </div>
      </section>
    </>
  )
}
