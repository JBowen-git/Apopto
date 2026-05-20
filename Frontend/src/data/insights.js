import { toArticleId } from '../utils/toArticleId.js'

export const insightScreenshots = [
  { src: '/assets/images/portfolio/portfolio-1.png', label: 'Example website composition' },
  { src: '/assets/images/portfolio/portfolio-4.png', label: 'Responsive section flow' },
  { src: '/assets/images/portfolio/portfolio-5.png', label: 'Conversion-focused layout' },
  { src: '/assets/images/portfolio/portfolio-2.png', label: 'Clear action path' },
  { src: '/assets/images/portfolio/portfolio-7.png', label: 'Performance-minded visual system' },
  { src: '/assets/images/portfolio/portfolio-8.png', label: 'Scalable content structure' },
  { src: '/assets/images/portfolio/portfolio-3.png', label: 'Reusable website pattern' },
  { src: '/assets/images/portfolio/portfolio-9.png', label: 'Professional site presentation' },
]

export const insightCategories = [
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

export const insightArticles = insightCategories.flatMap((category, categoryIndex) =>
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
