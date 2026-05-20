import { useEffect, useRef, useState } from 'react'
import { aboutPicturePlaceholders, aboutPrinciples } from '../data/about.js'

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
            Apopto is a technology and website-building company focused on helping
            businesses create modern, professional, and effective online experiences.
          </p>
          <p>
            Led by Jake Bowen, Apopto takes a personal, hands-on approach to every
            project. Strong websites are built through strong communication, which is why
            every client relationship is centered on clarity, transparency, and
            collaboration from start to finish. Clients are kept informed, ideas are
            discussed openly, and each decision is made with the goals of the business in
            mind.
          </p>
          <p>
            At Apopto, clients are not treated like templates. Every business has its own
            personality, challenges, audience, and vision, and every website should
            reflect that. Instead of relying on one-size-fits-all solutions, Apopto
            creates custom websites designed around the specific needs, style, and purpose
            of each business.
          </p>
          <p>
            Creativity is at the heart of the process. Whether building a business
            website, landing page, portfolio, or custom digital solution, Apopto focuses
            on creating websites that feel original, look sharp, and make a strong
            impression. Design and technology work together to create an online presence
            that is both visually engaging and easy to use.
          </p>
          <p>
            Apopto uses modern technologies like React and AWS to build websites that are
            clean, responsive, scalable, secure, and ready to grow with the business. The
            focus is always on performance, reliability, clarity, and trust.
          </p>
          <p>
            The goal is simple: build websites that communicate clearly, work smoothly,
            and help businesses stand out online.
          </p>
          <p>
            Apopto builds websites that help businesses evolve.
          </p>
        </div>

        <div className="about-picture-placeholders" aria-hidden="true">
          {aboutPicturePlaceholders.map((placeholder) => (
            <div className="about-picture-box" key={placeholder.title}>
              <img src={placeholder.image} alt="" />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
