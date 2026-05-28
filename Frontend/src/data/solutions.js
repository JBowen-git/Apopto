export const solutionsAnimationStorageKey = 'apopto-solutions-animation-played'

export const solutionProducts = [
  {
    slug: 'custom-website',
    path: '/solutions/custom-website',
    kicker: 'Website foundation',
    title: 'Custom Website',
    pricing: {
      startingAt: '$5k',
      monthlySupport: '$250/mo',
    },
    summary: 'Get found online, look professional, and turn visitors into leads.',
    description:
      'A mobile-friendly business website with clear messaging, local SEO, fast pages, and simple ways for customers to contact you. Built to make a stronger first impression and turn more visits into real inquiries.',
    bestFor: 'Best for service businesses, local companies, personal brands, and teams replacing an outdated website.',
    features: [
      'Premium SEO setup included from day one',
      'Search engine optimization for services, locations, and key offers',
      'Fast mobile experience for visitors from Google and social media',
      'Custom contact, quote, booking, or intake forms',
      'Clear calls to action that help turn traffic into leads',
      'Trust sections for reviews, photos, FAQs, and proof of work',
      'Optional news, updates, or posts section',
      'Social media feed or profile integration',
      'Analytics setup so you can see what visitors do',
    ],
    detail: {
      eyebrow: 'Website foundation',
      title: 'Custom Website',
      intro:
        'A fast, search-ready site that helps visitors understand your business and take the next step.',
      body:
        'Built for businesses that need a stronger first impression, better visibility, and practical lead capture.',
      outcomes: [
        'A professional website that explains your services clearly',
        'Search-ready pages for services, locations, and key offers',
        'Fast mobile pages that support Google, social media, and referral traffic',
        'Custom forms that send useful inquiries instead of dead-end emails',
        'A flexible foundation that can grow into portals, dashboards, or ecommerce later',
      ],
      sections: [
        {
          title: 'Built for customers first',
          copy: 'The site is organized so visitors can quickly understand what you offer, who it is for, why they should trust you, and how to take the next step.',
        },
        {
          title: 'SEO is included',
          copy: 'Every build includes a premium SEO foundation from day one: page structure, metadata, sitemap, performance, mobile layout, and clear content organization.',
        },
        {
          title: 'Room to grow',
          copy: 'The site can start simple and expand over time with new pages, campaigns, forms, integrations, posts, or business features.',
        },
      ],
    },
  },
  {
    slug: 'business-website-portal',
    path: '/solutions/business-website-portal',
    kicker: 'Growth system',
    title: 'Business Website + Portal',
    pricing: {
      startingAt: '$15k',
      monthlySupport: '$750/mo',
    },
    summary: 'Capture leads, organize client work, and give customers a better experience after they reach out.',
    description:
      'A custom website with secure client accounts, admin dashboards, billing support, file sharing, messages, and customer workflows. Built to keep leads, projects, payments, and follow-up organized.',
    bestFor: 'Best for growing businesses that need more than a website: client onboarding, project updates, payments, documents, and internal tracking.',
    includes: 'Includes everything in Custom Website.',
    features: [
      'The same premium SEO foundation included in every tier',
      'Client portal for project updates, messages, and next steps',
      'Admin dashboard for leads, clients, projects, and follow-up',
      'Separate secure access for clients and staff',
      'Online intake forms that keep customer details organized',
      'File uploads and downloads for project assets',
      'Stripe billing portal and invoice visibility',
      'Automated notifications for important customer actions',
      'Search-friendly public pages that keep supporting lead generation',
    ],
    detail: {
      eyebrow: 'Growth system',
      title: 'Business Website + Portal',
      intro:
        'A public website connected to client accounts, dashboards, billing, files, messages, and follow-up.',
      body:
        'Built for teams that need to organize leads, client work, payments, and customer communication in one place.',
      outcomes: [
        'A public website that brings in leads and explains the business clearly',
        'Secure client accounts for project updates, messages, files, and next steps',
        'Admin dashboards for leads, clients, projects, and follow-up',
        'Billing and invoicing support through Stripe',
        'Organized workflows that reduce manual back-and-forth',
      ],
      sections: [
        {
          title: 'A better customer experience',
          copy: 'Clients can see what matters in one place instead of hunting through old emails, links, and attachments.',
        },
        {
          title: 'A better internal workflow',
          copy: 'Leads, forms, documents, messages, billing details, and project updates can flow into dashboards built around how the business actually works.',
        },
        {
          title: 'Everything in Custom Website',
          copy: 'The portal tier builds on the same SEO, mobile performance, messaging, and conversion foundation included in every Apopto website.',
        },
      ],
    },
  },
  {
    slug: 'ecommerce-website',
    path: '/solutions/ecommerce-website',
    kicker: 'Online store',
    title: 'Ecommerce Website',
    pricing: {
      startingAt: '$30k',
      monthlySupport: '$1k/mo',
    },
    summary: 'Sell products online with a storefront, checkout, shipping, inventory, and admin tools in one place.',
    description:
      'A complete online store with product pages, search-friendly categories, cart and checkout, payments, order management, shipping labels, and a back office that keeps the store running.',
    bestFor: 'Best for product businesses, specialty retailers, makers, and service brands ready to sell physical or digital products online.',
    includes: 'Includes everything in Business Website + Portal.',
    features: [
      'The same premium SEO foundation included in every tier',
      'Search-optimized product, category, and collection pages',
      'Shopping cart, checkout, taxes, and secure Stripe payments',
      'Product catalog with variants, photos, pricing, and availability',
      'Admin dashboards for products, orders, sales, and store content',
      'Inventory tracking with low-stock and sold-item visibility',
      'Shipping rates and in-app label printing',
      'Customer order emails and owner fulfillment notifications',
      'Posts or community content to support search and repeat visits',
    ],
    detail: {
      eyebrow: 'Online store',
      title: 'Ecommerce Website',
      intro:
        'A search-ready storefront with product pages, checkout, payments, shipping, and admin tools.',
      body:
        'Built for businesses ready to sell, manage, fulfill, and improve products online.',
      outcomes: [
        'Search-optimized product, category, and collection pages',
        'Cart, checkout, taxes, and secure Stripe payments',
        'Product management for variants, photos, pricing, and availability',
        'Order dashboards, fulfillment visibility, and customer notifications',
        'Shipping rates, Shippo integration, and in-app label printing',
      ],
      sections: [
        {
          title: 'Built for selling and managing',
          copy: 'The storefront and admin side are planned together so the customer shopping experience and the owner fulfillment workflow both make sense.',
        },
        {
          title: 'SEO for products',
          copy: 'Product pages, category pages, collection pages, metadata, structured content, and performance are treated as part of the store foundation.',
        },
        {
          title: 'Everything in the previous tiers',
          copy: 'The ecommerce tier includes the public website foundation, premium SEO setup, admin tools, dashboards, and customer workflow options from the lower tiers.',
        },
      ],
    },
  },
]
