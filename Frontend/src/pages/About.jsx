import { useEffect, useRef, useState } from 'react'
import { aboutPrinciples, aboutProfileImage } from '../data/about.js'

export default function About() {
  const aboutPageRef = useRef(null)
  const [aboutProgress, setAboutProgress] = useState(0)

  useEffect(() => {
    let frameId = null

    const updateProgress = () => {
      frameId = null
      if (!aboutPageRef.current) {
        return
      }

      const pageHeight = document.documentElement.scrollHeight
      const viewportHeight = window.innerHeight || 1
      const maxScroll = Math.max(0, pageHeight - viewportHeight)
      const rawProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0
      const nextProgress = Math.min(1, Math.max(0, rawProgress))
      const roundedProgress = Math.round(nextProgress * 1000) / 1000

      setAboutProgress((currentProgress) =>
        Math.abs(currentProgress - roundedProgress) > 0.002
          ? roundedProgress
          : currentProgress,
      )
    }

    const requestProgressUpdate = () => {
      if (frameId !== null) {
        return
      }

      frameId = window.requestAnimationFrame(updateProgress)
    }

    requestProgressUpdate()
    window.addEventListener('scroll', requestProgressUpdate, { passive: true })
    window.addEventListener('resize', requestProgressUpdate)

    return () => {
      window.removeEventListener('scroll', requestProgressUpdate)
      window.removeEventListener('resize', requestProgressUpdate)

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [])

  return (
    <section
      className="about-page"
      aria-label="About Apopto"
      ref={aboutPageRef}
      style={{ '--about-progress': aboutProgress }}
    >
      <div className="about-layout">
        <div className="about-principles" aria-label="Apopto principles">
          {aboutPrinciples.map((principle, index) => {
            const isGlowing =
              index === 0 ||
              (index === 1 && aboutProgress >= 0.5) ||
              (index === 2 && aboutProgress >= 0.98)

            return (
              <article
                className={`about-principle${isGlowing ? ' about-principle-glow' : ''}`}
                key={principle.title}
              >
                <div className="about-principle-circle">
                  <img src={principle.image} alt={`${principle.title} placeholder`} />
                </div>
              </article>
            )
          })}
        </div>

        <div className="about-copy">
          <h1>About Apopto</h1>
          <p>
            Apopto is an engineering-focused web development company that helps
            businesses build websites and web applications designed to grow with them.
          </p>
          <p>
            Strong digital products are built through clear communication, practical
            systems, and thoughtful collaboration. The goal is not to force every
            business into the same structure. The goal is to understand what the business
            needs, what its customers need, and what kind of digital system can support
            both.
          </p>
          <p>
            Led by Jake Bowen, Apopto takes a personal, hands-on approach to every
            project. Clients work directly with the person building the system, with an
            emphasis on trust, transparency, and clear communication from start to finish.
          </p>
          <p>
            Apopto does not treat businesses like templates, and it does not build
            websites that feel like templates either. Every business has its own offer,
            audience, workflow, and way of earning trust. A strong website should reflect
            that.
          </p>
          <p>
            Many modern websites have started to feel the same: generic layouts,
            overloaded pages, aggressive conversion tactics, and features added because
            they are trendy rather than useful. In the push for more keywords, more
            buttons, more popups, and more automation, it is easy for a site to lose
            clarity, performance, and brand identity.
          </p>
          <p>
            Apopto takes a different approach.
          </p>
          <p>
            Design matters, but design should serve the business and the visitor. A
            website should be visually engaging without being overwhelming. It should feel
            recognizable without becoming cluttered. It should guide people clearly
            without pressuring them into action before they are ready.
          </p>
          <p>
            Engineering matters too. Behind the interface, a website should be fast,
            reliable, responsive, and structured for future growth. Apopto builds on a
            modern React and AWS foundation, creating sites that can support forms,
            dashboards, data flows, automations, integrations, and new features as the
            business evolves.
          </p>
          <p>
            Core growth features should not feel mysterious or locked behind arbitrary
            tiers. Apopto aims to give clients clear explanations, practical
            documentation, and a better understanding of the systems behind their site,
            from SEO and performance to data, infrastructure, and long-term
            maintainability.
          </p>
          <p>
            The goal is simple: build websites that communicate clearly, work smoothly,
            and help businesses grow.
          </p>
          <p>
            Apopto builds digital systems that are polished on the surface, solid
            underneath, and ready to evolve.
          </p>
        </div>

        <div className="about-profile-media">
          <figure className="about-profile-card">
            <img
              src={aboutProfileImage.image}
              alt={aboutProfileImage.alt}
              decoding="async"
              loading="lazy"
            />
          </figure>
        </div>
      </div>
    </section>
  )
}
