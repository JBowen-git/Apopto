import { useEffect, useRef, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Divider,
  Drawer,
  Button as MuiButton,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  List,
  ListItemButton,
  ListSubheader,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Step,
  StepLabel,
  Stepper,
  TextField,
  useMediaQuery,
} from '@mui/material'
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

const solutionsAnimationStorageKey = 'apopto-solutions-animation-played'

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

const portfolioQuickLinks = [
  { label: 'All Work', to: '/portfolio/all-work' },
  { label: 'Build Breakdowns', to: '/portfolio/build-breakdowns' },
  { label: 'Concept Builds', to: '/portfolio/concept-builds' },
  { label: 'Individual Project Pages', to: '/portfolio/individual-project-pages' },
]

const portfolioDetailPages = {
  allWork: {
    eyebrow: 'Portfolio',
    title: 'All Work',
    intro:
      'A broader view of website work, launch pieces, and digital systems shaped around clear goals, polished presentation, and practical next steps.',
    points: [
      'Website builds shaped around the business, audience, and next step.',
      'Responsive layouts designed for strong first impressions on every screen.',
      'Room for project notes, screenshots, outcomes, and future expansion.',
    ],
  },
  buildBreakdowns: {
    eyebrow: 'Portfolio',
    title: 'Build Breakdowns',
    intro:
      'A deeper look at how a build moves from goal to structure, visual direction, implementation, and launch-ready experience.',
    points: [
      'Problem, audience, and project goals framed before design decisions.',
      'Page structure, content hierarchy, and calls to action tied to the offer.',
      'Space for before-and-after notes, technical decisions, and launch details.',
    ],
  },
  conceptBuilds: {
    eyebrow: 'Portfolio',
    title: 'Concept Builds',
    intro:
      'Exploratory builds for layouts, flows, interfaces, and ideas that help shape future websites or systems before they become full projects.',
    points: [
      'Visual and interaction concepts used to test direction quickly.',
      'Landing page, dashboard, and smart form ideas before full implementation.',
      'A useful space for experiments that can become future client work.',
    ],
  },
  individualProjectPages: {
    eyebrow: 'Portfolio',
    title: 'Individual Project Pages',
    intro:
      'Dedicated pages for individual projects, with room for project goals, screenshots, decisions, results, and links to live work.',
    points: [
      'Project-specific stories with more context than a thumbnail can hold.',
      'Screenshots, outcomes, and decisions grouped into a focused presentation.',
      'A path for turning selected builds into polished case-study pages.',
    ],
  },
}

function toArticleId(title) {
  return title
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

const insightScreenshots = [
  { src: '/assets/images/portfolio/portfolio-1.png', label: 'Example website composition' },
  { src: '/assets/images/portfolio/portfolio-4.png', label: 'Responsive section flow' },
  { src: '/assets/images/portfolio/portfolio-5.png', label: 'Conversion-focused layout' },
  { src: '/assets/images/portfolio/portfolio-2.png', label: 'Clear action path' },
  { src: '/assets/images/portfolio/portfolio-7.png', label: 'Performance-minded visual system' },
  { src: '/assets/images/portfolio/portfolio-8.png', label: 'Scalable content structure' },
  { src: '/assets/images/portfolio/portfolio-3.png', label: 'Reusable website pattern' },
  { src: '/assets/images/portfolio/portfolio-9.png', label: 'Professional site presentation' },
]

const insightCategories = [
  {
    id: 'design',
    name: 'Design',
    purpose: 'Design decisions, user experience, and visual clarity.',
    notes: [
      'Design choices should support clarity, trust, and easy scanning.',
      'The best visual systems guide visitors without making the page feel crowded.',
      'Professional websites feel consistent across layout, typography, imagery, and motion.',
    ],
    subcategories: [
      {
        name: 'Responsive Design',
        articles: [
          'Why Responsive Design Matters',
          'How Mobile Layouts Shape First Impressions',
          'What Responsive Breakpoints Do for Website Usability',
        ],
      },
      {
        name: 'UX',
        articles: [
          'How UX Helps Visitors Find the Right Next Step',
          'What Good Website UX Feels Like for Customers',
          'Why Simple Navigation Keeps Visitors Moving',
        ],
      },
      {
        name: 'Visual Hierarchy',
        articles: [
          'How Visual Hierarchy Improves Conversions',
          'Why Section Order Changes How People Read a Page',
          'How Typography Guides Attention on a Website',
        ],
      },
      {
        name: 'Accessibility',
        articles: [
          'Why Accessible Websites Serve More Customers',
          'What Website Accessibility Means for Small Businesses',
          'How Contrast and Labels Improve Everyday Usability',
        ],
      },
    ],
  },
  {
    id: 'conversion',
    name: 'Conversion',
    purpose: 'The page decisions that turn visitors into leads and customers.',
    notes: [
      'Every page should make the next action obvious.',
      'Strong conversion strategy removes friction before a visitor reaches the form.',
      'Calls to action work best when they match the visitor’s current level of trust.',
    ],
    subcategories: [
      {
        name: 'CTAs',
        articles: [
          'Why Your CTA Placement Matters',
          'How to Write Calls to Action That Feel Natural',
          'Where Service Websites Should Place Primary CTAs',
        ],
      },
      {
        name: 'Lead Generation',
        articles: [
          'How to Build a Website That Turns Visitors Into Leads',
          'What Makes a Lead Form Easier to Complete',
          'How Landing Pages Support Qualified Inquiries',
        ],
      },
      {
        name: 'Trust Signals',
        articles: [
          'How Trust Signals Make a Website Feel Credible',
          'What Proof Belongs on a Service Business Website',
          'Why Clear Process Language Builds Trust',
        ],
      },
      {
        name: 'Contact Pages',
        articles: [
          'What Every Service Business Contact Page Needs',
          'How Contact Pages Reduce Friction for New Leads',
          'Why Simple Intake Questions Improve Inquiry Quality',
        ],
      },
    ],
  },
  {
    id: 'seo',
    name: 'SEO',
    purpose: 'Search structure that helps the right people find the site.',
    notes: [
      'Search visibility starts with clean structure, useful metadata, and fast pages.',
      'Local businesses benefit from pages organized around services, location, and intent.',
      'Technical SEO is easier to maintain when it is built into the site from the start.',
    ],
    subcategories: [
      {
        name: 'Technical SEO',
        articles: [
          'What Is Technical SEO?',
          'How Clean Site Structure Supports Search Visibility',
          'Why Crawlable Pages Matter for Growing Websites',
        ],
      },
      {
        name: 'On-Page SEO',
        articles: [
          'SEO Metadata Explained',
          'How Headings Help Search Engines Understand a Page',
          'Why Service Pages Need Clear Search Intent',
        ],
      },
      {
        name: 'Local SEO',
        articles: [
          'How Local Businesses Should Structure Website Pages',
          'Why Location Pages Help Local Customers Find You',
          'How Service Area Content Supports Local Search',
        ],
      },
      {
        name: 'Structured Data',
        articles: [
          'What Structured Data Helps Search Engines Understand',
          'When Small Business Websites Should Use Schema',
          'How Rich Results Can Improve Search Presentation',
        ],
      },
    ],
  },
  {
    id: 'react',
    name: 'React',
    purpose: 'Modern interface patterns for scalable custom websites.',
    notes: [
      'React helps build reusable interfaces that can grow with a business.',
      'Component-based design keeps repeated sections consistent and easier to update.',
      'Custom React builds can avoid the limitations of one-size-fits-all website builders.',
    ],
    subcategories: [
      {
        name: 'Components',
        articles: [
          'How Component-Based Design Makes Websites Easier to Scale',
          'Why Reusable Sections Keep Websites Consistent',
          'How React Components Make Future Updates Easier',
        ],
      },
      {
        name: 'Web Apps',
        articles: [
          'When a Website Should Become a Web App',
          'What Makes a Web App Different From a Website',
          'How Custom Web Apps Support Business Workflows',
        ],
      },
      {
        name: 'Smart Interfaces',
        articles: [
          'How Smart Interfaces Make Websites Easier to Use',
          'Why Interactive Tools Can Improve Customer Decisions',
          'How Guided Interfaces Reduce Visitor Confusion',
        ],
      },
      {
        name: 'Scalability',
        articles: [
          'Why Apopto Uses React for Scalable Websites',
          'How Scalable Frontends Support Business Growth',
          'Why Custom Code Can Outgrow Template Builders',
        ],
      },
    ],
  },
  {
    id: 'aws-hosting',
    name: 'AWS & Hosting',
    purpose: 'Infrastructure choices that support speed, security, and reliability.',
    notes: [
      'Hosting affects security, reliability, speed, and long-term maintainability.',
      'Cloud infrastructure can make small business websites more resilient.',
      'Good hosting choices reduce risk when traffic, content, or features grow.',
    ],
    subcategories: [
      {
        name: 'Cloud Hosting',
        articles: [
          'Why Hosting Choices Matter',
          'What Cloud Hosting Means for Business Websites',
          'How Reliable Hosting Protects the Customer Experience',
        ],
      },
      {
        name: 'CloudFront',
        articles: [
          'What Is CloudFront?',
          'How Content Delivery Networks Speed Up Websites',
          'Why Edge Caching Helps Visitors Load Pages Faster',
        ],
      },
      {
        name: 'Security',
        articles: [
          'How Secure Website Hosting Works',
          'Why SSL and HTTPS Matter for Business Trust',
          'How Hosting Security Reduces Website Risk',
        ],
      },
      {
        name: 'Deployment',
        articles: [
          'What Happens When a Website Goes Live',
          'How Deployment Pipelines Make Launches More Reliable',
          'What to Check Before Publishing Website Changes',
        ],
      },
    ],
  },
  {
    id: 'performance',
    name: 'Performance',
    purpose: 'Speed and loading behavior tied to business outcomes.',
    notes: [
      'Fast websites feel more trustworthy and keep visitors engaged.',
      'Performance supports SEO, accessibility, and conversion at the same time.',
      'Image optimization and careful loading behavior can make a site feel much smoother.',
    ],
    subcategories: [
      {
        name: 'Page Speed',
        articles: [
          'Why Fast Websites Convert Better',
          'How Slow Load Times Cost Website Leads',
          'What Makes a Website Feel Fast to Visitors',
        ],
      },
      {
        name: 'Core Web Vitals',
        articles: [
          'What Are Core Web Vitals?',
          'Why Google Measures Loading and Interaction Quality',
          'How Layout Shift Affects Visitor Confidence',
        ],
      },
      {
        name: 'Image Optimization',
        articles: [
          'How Image Optimization Improves Website Speed',
          'What Image Formats Work Best for Modern Websites',
          'Why Oversized Images Slow Down Conversions',
        ],
      },
      {
        name: 'Caching',
        articles: [
          'How Caching Makes Websites Feel Faster',
          'What Browser Caching Does for Repeat Visitors',
          'How CDN Caching Supports High-Traffic Pages',
        ],
      },
    ],
  },
  {
    id: 'automation',
    name: 'Automation',
    purpose: 'Systems that make forms, leads, and workflows easier to manage.',
    notes: [
      'Forms should collect the right information without overwhelming the visitor.',
      'Automation can reduce repetitive admin work after a lead submits.',
      'Dashboards turn inquiries into trackable business activity.',
    ],
    subcategories: [
      {
        name: 'Smart Forms',
        articles: [
          'What Is a Smart Form?',
          'How Smart Forms Qualify Leads Faster',
          'Why Better Form Logic Saves Admin Time',
        ],
      },
      {
        name: 'CRM Integration',
        articles: [
          'How CRM Integration Keeps Leads Organized',
          'What Happens After a Website Form Is Submitted',
          'Why Connected Lead Data Improves Follow-Up',
        ],
      },
      {
        name: 'Dashboards',
        articles: [
          'How Dashboards Help Businesses Track Leads',
          'What a Business Website Dashboard Should Show',
          'How Lead Visibility Helps Owners Make Better Decisions',
        ],
      },
      {
        name: 'Workflows',
        articles: [
          'How Client Intake Automation Saves Time',
          'Which Website Workflows Are Worth Automating First',
          'How Automated Follow-Up Improves Lead Handling',
        ],
      },
    ],
  },
  {
    id: 'process',
    name: 'Process',
    purpose: 'The launch path from first conversation to long-term maintenance.',
    notes: [
      'A clear process helps clients understand what happens before design and development.',
      'Preparation reduces delays and makes the first version stronger.',
      'Transparent workflow language builds trust before a client ever reaches out.',
    ],
    subcategories: [
      {
        name: 'Discovery',
        articles: [
          'What Happens Before Development Starts',
          'What Questions Shape a Strong Website Project',
          'How Discovery Turns Business Goals Into Page Strategy',
        ],
      },
      {
        name: 'Design',
        articles: [
          'How Apopto Plans Website Design',
          'What Clients Review During the Design Phase',
          'How Wireframes Help Clarify a Website Before Build',
        ],
      },
      {
        name: 'Development',
        articles: [
          'How Apopto Builds a Website',
          'What Happens During Website Development',
          'How Development Turns Designs Into Working Pages',
        ],
      },
      {
        name: 'Launch',
        articles: [
          'What to Prepare Before Launching a Website',
          'What Happens During a Website Launch',
          'How Launch Testing Protects the First Impression',
        ],
      },
      {
        name: 'Maintenance',
        articles: [
          'How Website Maintenance Supports Long-Term Growth',
          'What to Update After a Website Goes Live',
          'Why Ongoing Improvements Keep Websites Useful',
        ],
      },
    ],
  },
]

const insightArticles = insightCategories.flatMap((category, categoryIndex) =>
  category.subcategories.flatMap((subcategory, subcategoryIndex) =>
    subcategory.articles.map((title, articleIndex) => {
      const screenshotIndex = categoryIndex + subcategoryIndex + articleIndex

      return {
        id: toArticleId(title),
        term: title,
        categoryId: category.id,
        categoryName: category.name,
        subcategoryName: subcategory.name,
        summary: category.purpose,
        definition: `This article sits under ${subcategory.name} inside ${category.name}. It is ready for practical guidance, examples, and client-friendly explanations that connect the concept to better business outcomes.`,
        notes: category.notes,
        screenshots: [
          insightScreenshots[screenshotIndex % insightScreenshots.length],
          insightScreenshots[(screenshotIndex + 3) % insightScreenshots.length],
        ],
      }
    }),
  ),
)

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

const aboutPicturePlaceholders = [
  {
    title: 'About page vertical placeholder',
    image: '/assets/images/about/about-image-placeholder-1.svg',
  },
]

const contactSteps = ['Contact', 'Business', 'Project']

const contactInitialValues = {
  name: '',
  email: '',
  company: '',
  website: '',
  phone: '',
  preferredContact: '',
  bestTime: '',
  businessDescription: '',
  customers: '',
  region: '',
  projectGoal: '',
  problem: '',
  branding: '',
  content: '',
  pageCount: '',
  needs: [],
  inspirationSites: '',
}

const contactRequiredFieldsByStep = [
  ['name', 'email', 'company', 'preferredContact', 'bestTime'],
  ['businessDescription', 'customers', 'region', 'projectGoal', 'problem'],
  ['branding', 'content', 'pageCount'],
]

const simpleContactInitialValues = {
  name: '',
  email: '',
  company: '',
  phone: '',
  preferredContact: '',
  bestTime: '',
  message: '',
}

const simpleContactRequiredFields = [
  'name',
  'email',
  'company',
  'preferredContact',
  'bestTime',
]

const preferredContactOptions = ['Email', 'Phone', 'Text', 'Video call']
const bestTimeOptions = ['Morning', 'Afternoon', 'Evening', 'Flexible']
const projectGoalOptions = [
  'Get more leads',
  'Sell products online',
  'Look more professional',
  'Replace an outdated website',
  'Automate a manual process',
  'Build a portal/dashboard',
  'Improve speed or SEO',
  'Launch a new brand',
]
const projectReadinessOptions = ['Yes', 'No', 'In Progress']
const pageCountOptions = ['1-3', '4-7', '8-15', '15+']
const projectNeedOptions = ['Booking', 'Payments', 'Forms', 'Login features', 'Dashboards']

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
  const isMobileInsights = useMediaQuery('(max-width: 980px)')
  const [isMobileInsightsOpen, setMobileInsightsOpen] = useState(false)
  const currentArticleId = pathname.startsWith('/insights/')
    ? pathname.split('/').filter(Boolean).at(-1)
    : insightArticles[0].id
  const currentArticle =
    insightArticles.find((article) => article.id === currentArticleId) ?? insightArticles[0]
  const [expandedCategory, setExpandedCategory] = useState(currentArticle.categoryId)

  useEffect(() => {
    setExpandedCategory(currentArticle.categoryId)
  }, [currentArticle.categoryId])

  useEffect(() => {
    if (isMobileInsights) {
      setMobileInsightsOpen(false)
    }
  }, [isMobileInsights, pathname])

  const closeMobileInsights = () => {
    if (isMobileInsights) {
      setMobileInsightsOpen(false)
    }
  }

  return (
    <>
      <button
        aria-controls="insights-drawer-nav"
        aria-expanded={isMobileInsightsOpen}
        className={`insights-mobile-toggle${
          isMobileInsightsOpen ? ' insights-mobile-toggle-open' : ''
        }`}
        onClick={() => setMobileInsightsOpen(true)}
        type="button"
      >
        Insights menu
      </button>
      <Drawer
        className="insights-drawer"
        ModalProps={{ keepMounted: true }}
        onClose={() => setMobileInsightsOpen(false)}
        open={isMobileInsights ? isMobileInsightsOpen : true}
        slotProps={{
          paper: {
            className: 'insights-drawer-paper',
            sx: {
              background: '#ffffff',
              border: 0,
              borderRadius: isMobileInsights ? '0 18px 18px 0' : 0,
              borderRight: '1px solid rgba(15, 23, 42, 0.14)',
              bottom: 0,
              boxSizing: 'border-box',
              boxShadow:
                'inset -1px 0 0 rgba(15, 23, 42, 0.06), 18px 0 58px rgba(15, 23, 42, 0.08)',
              color: '#0f172a',
              height: isMobileInsights ? '100dvh' : 'auto',
              left: 0,
              overflow: 'hidden',
              position: isMobileInsights ? 'fixed' : 'absolute',
              top: 0,
              width: isMobileInsights
                ? 'min(360px, calc(100vw - 24px))'
                : 'var(--insights-drawer-width)',
            },
          },
        }}
        variant={isMobileInsights ? 'temporary' : 'permanent'}
      >
        <nav className="insights-index" id="insights-drawer-nav" aria-label="Insights articles">
          <div className="insights-drawer-heading">
            <span>Insights</span>
            <strong>Articles</strong>
            <button
              aria-label="Close insights menu"
              className="insights-drawer-close"
              onClick={() => setMobileInsightsOpen(false)}
              type="button"
            >
              Close
            </button>
          </div>
          <Divider className="insights-mui-divider" flexItem />
          {insightCategories.map((category) => (
            <Accordion
              className="insights-category-accordion"
              disableGutters
              expanded={expandedCategory === category.id}
              key={category.id}
              onChange={(_, isExpanded) =>
                setExpandedCategory(isExpanded ? category.id : false)
              }
              square
            >
              <AccordionSummary className="insights-category-summary">
                <span className="insights-summary-main">
                  <span className="insights-accordion-icon" aria-hidden="true">
                    ›
                  </span>
                  <span className="insights-category-name">{category.name}</span>
                </span>
              </AccordionSummary>
              <AccordionDetails className="insights-category-details">
                <List className="insights-category-list" disablePadding>
                  {category.subcategories.map((subcategory) => {
                    return (
                      <div className="insights-subcategory-group" key={subcategory.name}>
                        <ListSubheader
                          className="insights-subcategory-label"
                          component="div"
                          disableSticky
                        >
                          {subcategory.name}
                        </ListSubheader>
                        <div className="insights-example-article-list">
                          {subcategory.articles.map((articleTitle) => {
                            const articleId = toArticleId(articleTitle)
                            const isSelected = articleId === currentArticle.id

                            return (
                              <ListItemButton
                                className="insights-example-article"
                                component={NavLink}
                                key={articleTitle}
                                onClick={closeMobileInsights}
                                selected={isSelected}
                                to={`/insights/${articleId}`}
                              >
                                {articleTitle}
                              </ListItemButton>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </nav>
      </Drawer>
    </>
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
  const [shouldAnimateSolutions] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    try {
      return window.sessionStorage.getItem(solutionsAnimationStorageKey) !== 'true'
    } catch {
      return true
    }
  })

  useEffect(() => {
    if (!shouldAnimateSolutions || typeof window === 'undefined') {
      return undefined
    }

    const animationCompleteTimer = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(solutionsAnimationStorageKey, 'true')
      } catch {
        // Ignore storage failures so the page still renders normally.
      }
    }, 1800)

    return () => {
      window.clearTimeout(animationCompleteTimer)
    }
  }, [shouldAnimateSolutions])

  return (
    <section
      className={`solutions-page${shouldAnimateSolutions ? ' solutions-page-animate' : ''}`}
      aria-labelledby="solutions-title"
    >
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

      <div
        className="portfolio-image-cluster"
        id="portfolio-previews"
        aria-label="Selected website screenshots"
      >
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

      <section
        className="portfolio-story-paper"
        id="portfolio-approach"
        aria-label="Portfolio introduction"
      >
        <div className="portfolio-story-paper-intro">
          <p className="portfolio-project-label">Portfolio approach</p>
          <h2>Websites shaped around the people who use them.</h2>
          <nav className="portfolio-quick-links" aria-label="Portfolio quick links">
            {portfolioQuickLinks.map((link) => (
              <Link key={link.to} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="portfolio-story-paper-body" id="portfolio-details">
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

      <section
        className="portfolio-live-preview"
        id="portfolio-live-site"
        aria-labelledby="portfolio-live-preview-title"
      >
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

function PortfolioDetailPage({ page }) {
  return (
    <section className="portfolio-detail-page" aria-labelledby="portfolio-detail-title">
      <div className="portfolio-detail-card">
        <p className="portfolio-project-label">{page.eyebrow}</p>
        <h1 id="portfolio-detail-title">{page.title}</h1>
        <p>{page.intro}</p>
        <ul>
          {page.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <Link className="portfolio-detail-back" to="/portfolio">
          Back to Portfolio
          <span aria-hidden="true">-&gt;</span>
        </Link>
      </div>
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

function Insights() {
  const { conceptId } = useParams()
  const selectedConcept =
    insightArticles.find((article) => article.id === conceptId) ?? insightArticles[0]

  return (
    <section className="insights-page" aria-label="Insights articles">
      <div className="insights-dictionary">
        <article className="insights-panel" key={selectedConcept.id}>
          <div className="insights-panel-copy">
            <p className="insights-panel-kicker">
              {selectedConcept.categoryName} / {selectedConcept.subcategoryName}
            </p>
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

function ProjectIntakeForm({
  formId = 'project-contact-form',
  stageClassName = 'contact-form-stage',
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [contactValues, setContactValues] = useState(contactInitialValues)
  const [attemptedSteps, setAttemptedSteps] = useState({})
  const [isSubmitted, setSubmitted] = useState(false)
  const currentRequiredFields = contactRequiredFieldsByStep[activeStep] ?? []

  const updateContactValue = (field) => (event) => {
    setSubmitted(false)
    setContactValues((currentValues) => ({
      ...currentValues,
      [field]: event.target.value,
    }))
  }

  const toggleContactNeed = (need) => (event) => {
    setContactValues((currentValues) => {
      const nextNeeds = event.target.checked
        ? [...currentValues.needs, need]
        : currentValues.needs.filter((currentNeed) => currentNeed !== need)

      return {
        ...currentValues,
        needs: nextNeeds,
      }
    })
  }

  const getFieldError = (field) =>
    Boolean(attemptedSteps[activeStep] && currentRequiredFields.includes(field) && !contactValues[field])

  const canAdvanceContactStep = () =>
    currentRequiredFields.every((field) => contactValues[field].trim())

  const goToNextContactStep = () => {
    setAttemptedSteps((currentSteps) => ({
      ...currentSteps,
      [activeStep]: true,
    }))

    if (!canAdvanceContactStep()) {
      return
    }

    setActiveStep((currentStep) => Math.min(currentStep + 1, contactSteps.length - 1))
  }

  const goToPreviousContactStep = () => {
    setActiveStep((currentStep) => Math.max(currentStep - 1, 0))
  }

  const submitContactForm = (event) => {
    event.preventDefault()
    setAttemptedSteps((currentSteps) => ({
      ...currentSteps,
      [activeStep]: true,
    }))

    if (!canAdvanceContactStep()) {
      return
    }

    setSubmitted(true)
  }

  return (
        <div className={stageClassName} id={formId}>
          <Paper
            className="contact-form-paper"
            component="form"
            elevation={0}
            onSubmit={submitContactForm}
          >
            <div className="contact-form-header">
              <h2>Project contact form</h2>
            </div>

            <Stepper activeStep={activeStep} alternativeLabel className="contact-stepper">
              {contactSteps.map((step) => (
                <Step key={step}>
                  <StepLabel>{step}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {activeStep === 0 ? (
              <div className="contact-form-grid">
                <TextField
                  error={getFieldError('name')}
                  fullWidth
                  helperText={getFieldError('name') ? 'Name is required.' : ' '}
                  label="Name"
                  onChange={updateContactValue('name')}
                  required
                  value={contactValues.name}
                />
                <TextField
                  error={getFieldError('email')}
                  fullWidth
                  helperText={getFieldError('email') ? 'Email is required.' : ' '}
                  label="Email"
                  onChange={updateContactValue('email')}
                  required
                  type="email"
                  value={contactValues.email}
                />
                <TextField
                  error={getFieldError('company')}
                  fullWidth
                  helperText={getFieldError('company') ? 'Company or brand name is required.' : ' '}
                  label="Company / Brand Name"
                  onChange={updateContactValue('company')}
                  required
                  value={contactValues.company}
                />
                <TextField
                  fullWidth
                  helperText=" "
                  label="Current Website URL"
                  onChange={updateContactValue('website')}
                  type="url"
                  value={contactValues.website}
                />
                <TextField
                  fullWidth
                  helperText=" "
                  label="Phone Number"
                  onChange={updateContactValue('phone')}
                  type="tel"
                  value={contactValues.phone}
                />
                <TextField
                  error={getFieldError('preferredContact')}
                  fullWidth
                  helperText={
                    getFieldError('preferredContact') ? 'Preferred contact method is required.' : ' '
                  }
                  label="Preferred Contact Method"
                  onChange={updateContactValue('preferredContact')}
                  required
                  select
                  value={contactValues.preferredContact}
                >
                  {preferredContactOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  error={getFieldError('bestTime')}
                  fullWidth
                  helperText={getFieldError('bestTime') ? 'Best time is required.' : ' '}
                  label="Best Time to Reach You"
                  onChange={updateContactValue('bestTime')}
                  required
                  select
                  value={contactValues.bestTime}
                >
                  {bestTimeOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
            ) : null}

            {activeStep === 1 ? (
              <div className="contact-form-grid">
                <TextField
                  error={getFieldError('businessDescription')}
                  fullWidth
                  helperText={
                    getFieldError('businessDescription') ? 'Business description is required.' : ' '
                  }
                  label="What does your business do?"
                  onChange={updateContactValue('businessDescription')}
                  required
                  value={contactValues.businessDescription}
                />
                <TextField
                  error={getFieldError('customers')}
                  fullWidth
                  helperText={getFieldError('customers') ? 'Customer description is required.' : ' '}
                  label="Who are your customers?"
                  onChange={updateContactValue('customers')}
                  required
                  value={contactValues.customers}
                />
                <TextField
                  error={getFieldError('region')}
                  fullWidth
                  helperText={getFieldError('region') ? 'City or region is required.' : ' '}
                  label="What City / Region do you serve?"
                  onChange={updateContactValue('region')}
                  required
                  value={contactValues.region}
                />
                <FormControl
                  className="contact-choice-group contact-choice-group-wide"
                  component="fieldset"
                  error={getFieldError('projectGoal')}
                  required
                >
                  <FormLabel component="legend">What is the main goal of this project?</FormLabel>
                  <RadioGroup
                    className="contact-option-grid"
                    onChange={updateContactValue('projectGoal')}
                    value={contactValues.projectGoal}
                  >
                    {projectGoalOptions.map((option) => (
                      <FormControlLabel
                        control={<Radio />}
                        key={option}
                        label={option}
                        value={option}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
                <TextField
                  className="contact-field-wide"
                  error={getFieldError('problem')}
                  fullWidth
                  helperText={getFieldError('problem') ? 'Project problem is required.' : ' '}
                  label="What problem are you trying to solve?"
                  minRows={6}
                  multiline
                  onChange={updateContactValue('problem')}
                  required
                  value={contactValues.problem}
                />
              </div>
            ) : null}

            {activeStep === 2 ? (
              <div className="contact-form-grid">
                <TextField
                  error={getFieldError('branding')}
                  fullWidth
                  helperText={getFieldError('branding') ? 'Branding status is required.' : ' '}
                  label="Do you already have branding?"
                  onChange={updateContactValue('branding')}
                  required
                  select
                  value={contactValues.branding}
                >
                  {projectReadinessOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  error={getFieldError('content')}
                  fullWidth
                  helperText={getFieldError('content') ? 'Content status is required.' : ' '}
                  label="Do you have written content?"
                  onChange={updateContactValue('content')}
                  required
                  select
                  value={contactValues.content}
                >
                  {projectReadinessOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  error={getFieldError('pageCount')}
                  fullWidth
                  helperText={getFieldError('pageCount') ? 'Page count is required.' : ' '}
                  label="About how many pages do you need?"
                  onChange={updateContactValue('pageCount')}
                  required
                  select
                  value={contactValues.pageCount}
                >
                  {pageCountOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <FormControl className="contact-choice-group contact-choice-group-wide" component="fieldset">
                  <FormLabel component="legend">Do you need:</FormLabel>
                  <FormGroup className="contact-option-grid">
                    {projectNeedOptions.map((option) => (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={contactValues.needs.includes(option)}
                            onChange={toggleContactNeed(option)}
                          />
                        }
                        key={option}
                        label={option}
                      />
                    ))}
                  </FormGroup>
                </FormControl>
                <TextField
                  className="contact-field-wide"
                  fullWidth
                  helperText=" "
                  label="Are there websites you like?"
                  onChange={updateContactValue('inspirationSites')}
                  type="url"
                  value={contactValues.inspirationSites}
                />
              </div>
            ) : null}

            <div className="contact-form-actions">
              <MuiButton
                className="contact-form-action"
                disabled={activeStep === 0}
                onClick={goToPreviousContactStep}
                type="button"
                variant="outlined"
              >
                Back
              </MuiButton>
              {activeStep < contactSteps.length - 1 ? (
                <MuiButton
                  className="contact-form-action contact-form-action-primary"
                  onClick={goToNextContactStep}
                  type="button"
                  variant="contained"
                >
                  Next
                </MuiButton>
              ) : (
                <MuiButton
                  className="contact-form-action contact-form-action-primary"
                  type="submit"
                  variant="contained"
                >
                  Submit
                </MuiButton>
              )}
            </div>

            {isSubmitted ? (
              <p className="contact-form-confirmation">
                Your project intake is ready for review.
              </p>
            ) : null}
          </Paper>
        </div>
  )
}

function SimpleContactForm() {
  const [contactValues, setContactValues] = useState(simpleContactInitialValues)
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
  const [isSubmitted, setSubmitted] = useState(false)

  const updateContactValue = (field) => (event) => {
    setSubmitted(false)
    setContactValues((currentValues) => ({
      ...currentValues,
      [field]: event.target.value,
    }))
  }

  const getFieldError = (field) =>
    Boolean(hasAttemptedSubmit && simpleContactRequiredFields.includes(field) && !contactValues[field])

  const canSubmitContactForm = () =>
    simpleContactRequiredFields.every((field) => contactValues[field].trim())

  const submitContactForm = (event) => {
    event.preventDefault()
    setHasAttemptedSubmit(true)

    if (!canSubmitContactForm()) {
      return
    }

    setSubmitted(true)
  }

  return (
    <div className="contact-form-stage" id="contact-form">
      <Paper
        className="contact-form-paper contact-form-paper-simple"
        component="form"
        elevation={0}
        onSubmit={submitContactForm}
      >
        <div className="contact-form-header">
          <h2>Start the conversation</h2>
          <p>Tell me the basics and I will follow up with the right next step.</p>
        </div>

        <div className="contact-form-grid">
          <TextField
            error={getFieldError('name')}
            fullWidth
            helperText={getFieldError('name') ? 'Name is required.' : ' '}
            label="Name"
            onChange={updateContactValue('name')}
            required
            value={contactValues.name}
          />
          <TextField
            error={getFieldError('email')}
            fullWidth
            helperText={getFieldError('email') ? 'Email is required.' : ' '}
            label="Email"
            onChange={updateContactValue('email')}
            required
            type="email"
            value={contactValues.email}
          />
          <TextField
            error={getFieldError('company')}
            fullWidth
            helperText={getFieldError('company') ? 'Company or brand name is required.' : ' '}
            label="Company / Brand Name"
            onChange={updateContactValue('company')}
            required
            value={contactValues.company}
          />
          <TextField
            fullWidth
            helperText=" "
            label="Phone Number"
            onChange={updateContactValue('phone')}
            type="tel"
            value={contactValues.phone}
          />
          <TextField
            error={getFieldError('preferredContact')}
            fullWidth
            helperText={
              getFieldError('preferredContact') ? 'Preferred contact method is required.' : ' '
            }
            label="Preferred Contact Method"
            onChange={updateContactValue('preferredContact')}
            required
            select
            value={contactValues.preferredContact}
          >
            {preferredContactOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            error={getFieldError('bestTime')}
            fullWidth
            helperText={getFieldError('bestTime') ? 'Best time is required.' : ' '}
            label="Best Time to Reach You"
            onChange={updateContactValue('bestTime')}
            required
            select
            value={contactValues.bestTime}
          >
            {bestTimeOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            className="contact-field-wide"
            fullWidth
            helperText=" "
            label="Message"
            minRows={5}
            multiline
            onChange={updateContactValue('message')}
            value={contactValues.message}
          />
        </div>

        <div className="contact-form-actions">
          <MuiButton
            className="contact-form-action contact-form-action-primary"
            type="submit"
            variant="contained"
          >
            Submit
          </MuiButton>
        </div>

        {isSubmitted ? (
          <p className="contact-form-confirmation">
            Your contact details are ready for review.
          </p>
        ) : null}
      </Paper>
    </div>
  )
}

function Contact() {
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
            a quick question, need help with an existing site, or want to explore a future
            project, I’ll respond with a clear next step.
          </p>
          <ul>
            <li>Review your message and contact preference.</li>
            <li>Reply with an answer, recommendation, or follow-up question.</li>
            <li>Direct larger projects to the full project intake form.</li>
            <li>Keep the conversation focused and easy to start.</li>
          </ul>
          <div className="contact-next-cta">
            <h2>Know Exactly What You Want?</h2>
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

function StartAProject() {
  return (
    <section className="start-project-page" aria-label="Start a Project">
      <ProjectIntakeForm
        formId="project-intake-form"
        stageClassName="contact-form-stage start-project-form-stage"
      />
    </section>
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
        <Route
          path="/portfolio/all-work"
          element={<PortfolioDetailPage page={portfolioDetailPages.allWork} />}
        />
        <Route
          path="/portfolio/build-breakdowns"
          element={<PortfolioDetailPage page={portfolioDetailPages.buildBreakdowns} />}
        />
        <Route
          path="/portfolio/concept-builds"
          element={<PortfolioDetailPage page={portfolioDetailPages.conceptBuilds} />}
        />
        <Route
          path="/portfolio/individual-project-pages"
          element={<PortfolioDetailPage page={portfolioDetailPages.individualProjectPages} />}
        />
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
