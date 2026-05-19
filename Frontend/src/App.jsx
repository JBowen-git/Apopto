import { Fragment, useEffect, useRef, useState } from 'react'
import { Divider, Drawer } from '@mui/material'
import { Link, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom'
import DiagonalScrollSection from './DiagonalScrollSection'
import FlyInBox from './FlyInBox'
import HeroShineText from './HeroShineText'

const navItems = [
  { to: '/solutions', label: 'Solutions' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/about', label: 'About' },
  { to: '/insights', label: 'Insights' },
  { to: '/contact', label: 'Contact' },
]

const solutionProducts = [
  {
    title: 'Product One',
    description:
      'A focused digital product for teams that need a polished first impression, clear positioning, and a path from visitor interest to qualified action. This space can hold longer campaign copy, proof points, launch messaging, or the customer problem this product solves.',
    features: [
      'Conversion-ready page structure',
      'Responsive layouts for every screen',
      'SEO-friendly content sections',
      'Launch analytics foundations',
      'Hero messaging and product positioning',
      'Trust-building proof sections',
      'Fast quote or inquiry paths',
      'Easy room for seasonal campaign updates',
    ],
  },
  {
    title: 'Product Two',
    description:
      'A flexible product experience shaped for deeper engagement, stronger customer education, and more room to compare benefits before a buyer makes contact. Use this area for a richer product story, pricing context, feature positioning, and objections the page should answer.',
    features: [
      'Feature-led content hierarchy',
      'Customer proof and trust areas',
      'Lead capture ready modules',
      'Fast-loading visual sections',
      'Comparison-ready product blocks',
      'Benefit-focused copy areas',
      'FAQ and objection handling space',
      'Flexible sections for pricing context',
    ],
  },
  {
    title: 'Product Three',
    description:
      'A scalable product presence for more advanced offers, connected workflows, or services that need to feel established from the first scan. This longer copy area can support differentiators, use cases, outcomes, and the strongest reasons to choose the product.',
    features: [
      'Use case and outcome blocks',
      'Integration-ready page areas',
      'Clear calls to action',
      'Room for future product growth',
      'Scalable content for complex offers',
      'Workflow and automation messaging',
      'Support for multiple buyer journeys',
      'Expandable sections for future releases',
    ],
  },
]

const portfolioProjects = [
  {
    label: 'Featured Build 01',
    title: 'Website launch system',
    description:
      'Use this space for the client name, project goals, and the main business problem this site solved. The layout is built to support a short case-study summary without crowding the screenshot.',
    highlights: ['Custom responsive design', 'Conversion-focused page flow', 'Launch-ready content structure'],
    image: '/assets/images/portfolio/portfolio-1.png',
  },
  {
    label: 'Featured Build 02',
    title: 'Campaign-ready landing page',
    description:
      'This text block can describe the campaign, launch timeline, target visitor, and the action the page was designed to encourage.',
    highlights: ['Focused landing page copy', 'Strong first-screen impact', 'Reusable content blocks'],
    image: '/assets/images/portfolio/portfolio-4.png',
  },
  {
    label: 'Featured Build 03',
    title: 'Scalable marketing site',
    description:
      'Use this final project slot for a larger build, a redesign, or a site that shows how the system can grow with more pages, offers, and future campaigns.',
    highlights: ['Expandable site structure', 'Consistent page templates', 'Professional launch polish'],
    image: '/assets/images/portfolio/portfolio-5.png',
  },
  {
    label: 'Featured Build 04',
    title: 'Product-focused web experience',
    description:
      'Use this area to explain what made the build successful: the audience, the offer, and the parts of the site that helped visitors understand the product quickly.',
    highlights: ['Clear product positioning', 'Polished visual system', 'Mobile-first browsing path'],
    image: '/assets/images/portfolio/portfolio-2.png',
  },
  {
    label: 'Featured Build 05',
    title: 'Service brand presentation',
    description:
      'Add a concise project story here. This panel is sized for a few sentences, a measurable result, or the pieces of the site that created the strongest impression.',
    highlights: ['Brand-led page sections', 'Trust-building content areas', 'Fast inquiry path'],
    image: '/assets/images/portfolio/portfolio-3.png',
  },
  {
    label: 'Featured Build 06',
    title: 'Conversion page build',
    description:
      'Use this space for another recent launch, including the audience, offer, and the page sections that helped guide visitors toward action.',
    highlights: ['Focused page hierarchy', 'Strong visual presentation', 'Clear action path'],
    image: '/assets/images/portfolio/portfolio-6.png',
  },
  {
    label: 'Featured Build 07',
    title: 'Brand refresh website',
    description:
      'Add notes about the visual refresh, content structure, and the improvements that helped the site feel more polished and professional.',
    highlights: ['Updated brand system', 'Cleaner content flow', 'Responsive visual polish'],
    image: '/assets/images/portfolio/portfolio-7.png',
  },
  {
    label: 'Featured Build 08',
    title: 'Marketing site expansion',
    description:
      'Use this slot for a site that grew beyond a single page, with room to describe page templates, launch goals, and future-ready structure.',
    highlights: ['Expandable page system', 'Reusable content sections', 'Launch-ready templates'],
    image: '/assets/images/portfolio/portfolio-8.png',
  },
  {
    label: 'Featured Build 09',
    title: 'Polished client showcase',
    description:
      'Use this final card for a standout project, client showcase, or website that best represents the kind of work you want more of.',
    highlights: ['High-impact first impression', 'Professional case-study fit', 'Clean user journey'],
    image: '/assets/images/portfolio/portfolio-9.png',
  },
]

const livePortfolioPreview = {
  title: 'Ironwall Engraving',
  description:
    'A live storefront for custom laser-engraved collector pieces, trading card binders, display gear, and personalized gifts.',
  url: 'https://ironwallengraving.com',
}

const insightConcepts = [
  {
    id: 'responsive-design',
    term: 'Responsive Design',
    summary: 'Layouts that adapt cleanly across phones, tablets, laptops, and large displays.',
    definition:
      'Responsive design makes a website feel intentional at every screen size. It uses flexible layouts, fluid media, and breakpoint decisions so content remains readable, actions stay reachable, and the brand still feels polished on smaller screens.',
    notes: [
      'Navigation, calls to action, images, and forms should be planned for touch screens from the beginning.',
      'A responsive site should not simply shrink a desktop layout. It should reorganize around what each visitor needs most.',
      'Strong responsive design protects first impressions because many visitors will only experience the mobile version.',
    ],
    screenshots: [
      { src: '/assets/images/portfolio/portfolio-1.png', label: 'Desktop composition' },
      { src: '/assets/images/portfolio/portfolio-4.png', label: 'Mobile-first section flow' },
    ],
  },
  {
    id: 'conversion-path',
    term: 'Conversion Path',
    summary: 'The route a visitor follows from first impression to a useful action.',
    definition:
      'A conversion path is the structure that helps visitors understand the offer, trust the business, and know what to do next. It connects messaging, proof, section order, and calls to action into one clear flow.',
    notes: [
      'Every page should have a primary action, whether that is calling, booking, buying, or sending a project inquiry.',
      'Strong conversion paths remove friction by answering common questions before the visitor has to ask.',
      'Visual hierarchy matters because people scan first and read second.',
    ],
    screenshots: [
      { src: '/assets/images/portfolio/portfolio-5.png', label: 'Offer-first landing flow' },
      { src: '/assets/images/portfolio/portfolio-2.png', label: 'Clear action sections' },
    ],
  },
  {
    id: 'performance',
    term: 'Performance',
    summary: 'How quickly and smoothly a website loads, responds, and feels.',
    definition:
      'Performance is more than a score. It is the lived experience of waiting, scrolling, clicking, and moving through a site. Fast pages feel more trustworthy and make it easier for visitors to stay focused.',
    notes: [
      'Image sizing, code splitting, caching, and hosting choices all shape how fast the site feels.',
      'Performance should be considered during design, not patched on at the end.',
      'A smooth site supports SEO, accessibility, and conversion because visitors are less likely to leave early.',
    ],
    screenshots: [
      { src: '/assets/images/portfolio/portfolio-7.png', label: 'Lightweight visual system' },
      { src: '/assets/images/portfolio/portfolio-8.png', label: 'Fast-loading content blocks' },
    ],
  },
  {
    id: 'scalable-structure',
    term: 'Scalable Structure',
    summary: 'A site architecture that can grow without becoming messy or fragile.',
    definition:
      'Scalable structure means the website can support new pages, services, campaigns, and content without needing to be rebuilt every time the business changes. The foundation should be organized enough to evolve.',
    notes: [
      'Reusable sections help future pages feel consistent without making every page look identical.',
      'Clear content models make it easier to add new offers, case studies, and resources later.',
      'A scalable structure saves time because growth does not require rethinking the entire website.',
    ],
    screenshots: [
      { src: '/assets/images/portfolio/portfolio-3.png', label: 'Reusable page language' },
      { src: '/assets/images/portfolio/portfolio-9.png', label: 'Expandable showcase format' },
    ],
  },
  {
    id: 'trust-signals',
    term: 'Trust Signals',
    summary: 'The proof, clarity, and polish that help visitors feel confident.',
    definition:
      'Trust signals are the pieces of a website that reduce uncertainty. They can include clear contact paths, proof of work, process language, secure interactions, professional visuals, and straightforward explanations.',
    notes: [
      'Trust is built through consistency: design polish, clear writing, and reliable page behavior all matter.',
      'Visitors should quickly understand who the business serves, what it offers, and how to take the next step.',
      'Good trust signals feel natural. They support the page instead of interrupting it.',
    ],
    screenshots: [
      { src: '/assets/images/portfolio/portfolio-6.png', label: 'Proof-centered presentation' },
      { src: '/assets/images/portfolio/portfolio-1.png', label: 'Professional first impression' },
    ],
  },
]

const heroFeatureItems = [
  {
    icon: 'code',
    title: 'Custom Websites',
    detail: 'Built for Performance',
  },
  {
    icon: 'network',
    title: 'Scalable Solutions',
    detail: 'Built to Grow',
  },
  {
    icon: 'shield',
    title: 'Secure by Design',
    detail: 'Peace of Mind',
  },
  {
    icon: 'signal',
    title: 'Intelligent Experience',
    detail: 'Driven by Data',
  },
]

const aboutPrinciples = [
  {
    title: 'Communication',
    image: '/assets/images/about/communication-placeholder.svg',
  },
  {
    title: 'Transparency',
    image: '/assets/images/about/transparency-placeholder.svg',
  },
  {
    title: 'Creativity',
    image: '/assets/images/about/creativity-placeholder.svg',
  },
]

function ApoptoLogoMark() {
  return (
    <svg
      aria-hidden="true"
      className="brand-logo"
      focusable="false"
      viewBox="0 0 96 96"
    >
      <path
        className="brand-logo-ring"
        d="M58.5 13.5C43.8 5.8 25.2 10.6 16 24.5C6.5 38.9 9.9 58.3 24 68.4C37.4 78 56.1 75.8 66.8 63.4"
      />
      <path
        className="brand-logo-ring brand-logo-ring-soft"
        d="M67 24.2C74 32.2 76.1 43.9 72.1 54.1"
      />
      <circle className="brand-logo-core" cx="42" cy="43" r="17.5" />
      <circle className="brand-logo-nucleus" cx="39.5" cy="39.5" r="5.5" />
      <path
        className="brand-logo-cleave"
        d="M31 53.5C39.8 49 47.6 50.4 56 58.2"
      />
      <circle className="brand-logo-body" cx="66" cy="18" r="5.4" />
      <circle className="brand-logo-body brand-logo-body-mid" cx="77.5" cy="31" r="4.2" />
      <circle className="brand-logo-body brand-logo-body-small" cx="72" cy="47.5" r="3.1" />
    </svg>
  )
}

function HeroFeatureIcon({ type }) {
  if (type === 'network') {
    return (
      <svg aria-hidden="true" className="hero-feature-icon" focusable="false" viewBox="0 0 48 48">
        <circle cx="24" cy="12" r="4" />
        <circle cx="12" cy="30" r="4" />
        <circle cx="36" cy="30" r="4" />
        <circle cx="24" cy="38" r="3.5" />
        <path d="M21.8 15.5 14.4 26.6M26.2 15.5l7.4 11.1M15.8 31.7l4.9 3.4M32.2 31.7l-4.9 3.4M16 30h16" />
      </svg>
    )
  }

  if (type === 'shield') {
    return (
      <svg aria-hidden="true" className="hero-feature-icon" focusable="false" viewBox="0 0 48 48">
        <path d="M24 7.5 37 12v10.8c0 8.5-5.2 15.8-13 18.2-7.8-2.4-13-9.7-13-18.2V12l13-4.5Z" />
        <path d="M24 14v19" />
      </svg>
    )
  }

  if (type === 'signal') {
    return (
      <svg aria-hidden="true" className="hero-feature-icon" focusable="false" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="3.8" />
        <path d="M24 8v5M24 35v5M8 24h5M35 24h5M13.6 13.6l3.6 3.6M30.8 30.8l3.6 3.6M34.4 13.6l-3.6 3.6M17.2 30.8l-3.6 3.6" />
        <path d="M31.4 19.7A8.6 8.6 0 0 1 28 31.5" />
        <path d="M16.6 28.3A8.6 8.6 0 0 1 20 16.5" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="hero-feature-icon" focusable="false" viewBox="0 0 48 48">
      <path d="m19 15-9 9 9 9M29 15l9 9-9 9M26 12l-4 24" />
    </svg>
  )
}

function InsightsNav() {
  const { pathname } = useLocation()

  return (
    <Drawer
      className="insights-drawer"
      slotProps={{
        paper: {
          className: 'insights-drawer-paper',
          sx: {
            background: '#ffffff',
            border: 0,
            borderRight: '1px solid rgba(245, 158, 11, 0.36)',
            borderRadius: 0,
            bottom: 0,
            boxSizing: 'border-box',
            boxShadow: '18px 0 58px rgba(15, 23, 42, 0.08)',
            color: '#0f172a',
            height: 'auto',
            left: 0,
            overflow: 'hidden',
            position: 'absolute',
            top: 0,
            width: 'var(--insights-drawer-width)',
          },
        },
      }}
      variant="permanent"
    >
      <nav className="insights-index" aria-label="Insights articles">
        <div className="insights-drawer-heading">
          <span>Insights</span>
          <strong>Articles</strong>
        </div>
        <Divider className="insights-mui-divider" flexItem />
        {insightConcepts.map((concept, index) => {
          const isDefaultArticle = pathname === '/insights' && index === 0

          return (
            <Fragment key={concept.id}>
              <NavLink
                className={({ isActive }) =>
                  `insights-index-item${
                    isActive || isDefaultArticle ? ' insights-index-item-active' : ''
                  }`
                }
                to={`/insights/${concept.id}`}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{concept.term}</strong>
                <small>{concept.summary}</small>
              </NavLink>
              {index < insightConcepts.length - 1 ? (
                <Divider className="insights-mui-divider" flexItem />
              ) : null}
            </Fragment>
          )
        })}
      </nav>
    </Drawer>
  )
}

function Layout({ children }) {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const hasInsightsNav = pathname === '/insights' || pathname.startsWith('/insights/')

  return (
    <div className={isHome ? 'app-shell home-shell' : 'app-shell'}>
      <header
        className={
          isHome
            ? 'site-header site-header-home site-header-overlay'
            : 'site-header site-header-standard'
        }
      >
        <div className="site-header-inner">
          <Link className="brand" to="/" aria-label="Apopto home">
            <ApoptoLogoMark />
          </Link>
          <nav className="site-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <Link className="nav-cta" to="/start-a-project">
            Start a Project
          </Link>
        </div>
      </header>
      <main className={hasInsightsNav ? 'page-main page-main-insights' : 'page-main'}>
        {hasInsightsNav ? <InsightsNav /> : null}
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link className="brand footer-brand" to="/" aria-label="Apopto home">
            <ApoptoLogoMark />
          </Link>
          <div>
            <p className="site-footer-kicker">Apopto</p>
            <p className="site-footer-statement">
              Custom websites, web apps, and digital systems built for growing businesses.
            </p>
          </div>
        </div>

        <nav className="site-footer-nav" aria-label="Footer navigation">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-footer-cta">
          <p>Ready to shape the next launch?</p>
          <Link className="footer-cta-link" to="/start-a-project">
            Start a Project
            <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>Programmed to evolve.</span>
        <span>Designed to impress.</span>
      </div>
    </footer>
  )
}

function Home() {
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

function PageIntro({ eyebrow, title, children }) {
  return (
    <section className="content-section">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <div className="content-body">{children}</div>
    </section>
  )
}

function SolutionPlaceholderImage({ index, title }) {
  const label = `${title} placeholder image`

  return (
    <svg
      aria-label={label}
      className={`solution-placeholder-image solution-placeholder-image-${index + 1}`}
      role="img"
      viewBox="0 0 640 360"
    >
      <rect className="solution-placeholder-base" height="360" rx="0" width="640" />
      <path
        className="solution-placeholder-grid"
        d="M0 84H640M0 168H640M0 252H640M128 0V360M256 0V360M384 0V360M512 0V360"
      />
      <circle className="solution-placeholder-orbit" cx="456" cy="118" r="72" />
      <circle className="solution-placeholder-dot" cx="456" cy="118" r="18" />
      <path
        className="solution-placeholder-line"
        d="M92 238C156 184 210 180 268 224C316 260 366 264 426 222C474 188 510 184 556 206"
      />
      <rect className="solution-placeholder-chip" height="42" rx="8" width="146" x="78" y="72" />
      <rect className="solution-placeholder-chip solution-placeholder-chip-soft" height="42" rx="8" width="198" x="78" y="128" />
    </svg>
  )
}

function Solutions() {
  return (
    <section className="solutions-page" aria-labelledby="solutions-title">
      <div className="solutions-page-header">
        <p className="eyebrow">Solutions</p>
        <h1 id="solutions-title">Three product paths, each built to sell clearly.</h1>
      </div>

      <div className="solution-card-grid">
        {solutionProducts.map((product, index) => (
          <article className="solution-card" key={product.title}>
            <div className="solution-card-image">
              <SolutionPlaceholderImage index={index} title={product.title} />
            </div>
            <div className="solution-card-content">
              <h2>{product.title}</h2>
              <p>{product.description}</p>
              <ul className="solution-card-features">
                {product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function PortfolioClusterImage({ project, index }) {
  return (
    <article
      aria-label={project.title}
      className={`portfolio-cluster-card portfolio-cluster-card-${index + 1}`}
    >
      <img src={project.image} alt={`${project.title} website screenshot`} />
    </article>
  )
}

function Portfolio() {
  return (
    <section className="portfolio-page" aria-labelledby="portfolio-title">
      <h1 className="visually-hidden" id="portfolio-title">
        Portfolio
      </h1>

      <div className="portfolio-image-cluster" aria-label="Selected website screenshots">
        {portfolioProjects.map((project, index) => (
          <PortfolioClusterImage key={project.image} project={project} index={index} />
        ))}
        <div className="portfolio-hero-overlay" aria-hidden="true" />
        <p className="portfolio-hero-title">
          <span>Built Around People,</span>
          <span>
            Not <strong>Templates.</strong>
          </span>
        </p>
      </div>

      <section className="portfolio-story-paper" aria-label="Portfolio introduction">
        <div className="portfolio-story-paper-intro">
          <p className="portfolio-project-label">Portfolio approach</p>
          <h2>Websites shaped around the people who use them.</h2>
        </div>
        <div className="portfolio-story-paper-body">
          <p>
            Every project starts with the person on the other side of the screen: what
            they need to understand, what they need to trust, and what action should feel
            natural when they are ready.
          </p>
          <p>
            These builds are shaped around clear messaging, strong visual hierarchy, and
            practical paths from first impression to inquiry, purchase, booking, or launch.
          </p>
          <p>
            The result is a portfolio of websites that feel custom to the business behind
            them, while staying structured enough to grow as the offer evolves.
          </p>
          <p>
            Each page is designed to make the next step obvious without flattening the
            brand into a template. Layout, motion, calls to action, and supporting content
            are chosen around the offer and the people it needs to reach.
          </p>
          <p>
            This gives every build a practical foundation: a polished visual impression,
            a clear content path, and room for future campaigns, pages, products, or
            service lines.
          </p>
          <p>
            Some projects need a bold first screen that immediately frames the offer.
            Others need a quieter path with proof, comparisons, service details, and
            supporting content that helps a visitor move at their own pace.
          </p>
          <p>
            The strongest portfolio work is not just visually polished. It is practical:
            easy to update, easy to expand, and structured so new offers or campaigns can
            be added without rebuilding the entire site.
          </p>
          <p>
            The common thread is care: care for the brand, care for the visitor, and care
            for the business owner who needs the site to become a useful part of how they
            sell, explain, and grow.
          </p>
        </div>
      </section>

      <section className="portfolio-live-preview" aria-labelledby="portfolio-live-preview-title">
        <div className="portfolio-live-preview-copy">
          <p className="portfolio-project-label">Latest live site</p>
          <h2 id="portfolio-live-preview-title">{livePortfolioPreview.title}</h2>
          <p>{livePortfolioPreview.description}</p>
          <a href={livePortfolioPreview.url} rel="noreferrer" target="_blank">
            Visit live site
            <span aria-hidden="true">-&gt;</span>
          </a>
        </div>
        <div className="portfolio-live-preview-frame">
          <iframe
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
            src={livePortfolioPreview.url}
            title="Ironwall Engraving live site preview"
          />
          <a
            aria-label="Open Ironwall Engraving live site"
            className="portfolio-live-preview-target"
            href={livePortfolioPreview.url}
            rel="noreferrer"
            target="_blank"
          />
        </div>
      </section>
    </section>
  )
}

function About() {
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
                <h2>{principle.title}</h2>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Insights() {
  const { conceptId } = useParams()
  const selectedConcept =
    insightConcepts.find((concept) => concept.id === conceptId) ?? insightConcepts[0]

  return (
    <section className="insights-page" aria-label="Website concept dictionary">
      <div className="insights-dictionary">
        <article className="insights-panel" key={selectedConcept.id}>
          <div className="insights-panel-copy">
            <p className="insights-panel-kicker">Selected concept</p>
            <h2>{selectedConcept.term}</h2>
            <Divider className="insights-mui-divider" flexItem />
            <p>{selectedConcept.definition}</p>
            <Divider className="insights-mui-divider" flexItem />
            <ul>
              {selectedConcept.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>

          <div className="insights-screenshot-stack" aria-label={`${selectedConcept.term} screenshots`}>
            {selectedConcept.screenshots.map((screenshot) => (
              <figure className="insights-screenshot" key={screenshot.src}>
                <img src={screenshot.src} alt={`${selectedConcept.term}: ${screenshot.label}`} />
                <figcaption>{screenshot.label}</figcaption>
              </figure>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}

function Contact() {
  return (
    <PageIntro eyebrow="Contact" title="Open the conversation.">
      <p>
        Use this page for the direct contact path: a form, booking link, email address,
        phone number, or whatever intake flow fits the project.
      </p>
    </PageIntro>
  )
}

function StartAProject() {
  return (
    <PageIntro eyebrow="Start a Project" title="Tell us what needs to exist.">
      <p>
        This route is ready for a project intake form covering goals, budget, timeline,
        needed integrations, and the launch date the work is aiming toward.
      </p>
    </PageIntro>
  )
}

function ErrorPage() {
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

function NotFound() {
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

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/solutions" element={<Solutions />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/about" element={<About />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/insights/:conceptId" element={<Insights />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/start-a-project" element={<StartAProject />} />
        <Route path="/error" element={<ErrorPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
