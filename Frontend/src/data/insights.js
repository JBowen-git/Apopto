import { toArticleId } from '../utils/toArticleId.js'

function createComingSoonArticle(categoryId, subcategoryName) {
  return {
    id: `${categoryId}-${toArticleId(subcategoryName)}-more-to-come`,
    title: 'More to come',
  }
}

const insightCategoryGroups = [
  {
    id: 'design',
    name: 'Design',
    subcategories: ['Responsive Design', 'UX', 'Visual Hierarchy', 'Accessibility'],
  },
  {
    id: 'conversion',
    name: 'Conversion',
    subcategories: ['CTAs', 'Lead Generation', 'Trust Signals', 'Contact Pages'],
  },
  {
    id: 'seo',
    name: 'SEO',
    subcategories: ['Technical SEO', 'On-Page SEO', 'Local SEO', 'Structured Data'],
  },
  {
    id: 'react',
    name: 'React',
    subcategories: ['Components', 'Web Apps', 'Smart Interfaces', 'Scalability'],
  },
  {
    id: 'aws-hosting',
    name: 'AWS & Hosting',
    subcategories: ['Cloud Hosting', 'CloudFront', 'Security', 'Deployment'],
  },
  {
    id: 'performance',
    name: 'Performance',
    subcategories: ['Page Speed', 'Core Web Vitals', 'Image Optimization', 'Caching'],
  },
  {
    id: 'automation',
    name: 'Automation',
    subcategories: ['Smart Forms', 'CRM Integration', 'Dashboards', 'Workflows'],
  },
  {
    id: 'process',
    name: 'Process',
    subcategories: ['Discovery', 'Design', 'Development', 'Launch', 'Maintenance'],
  },
]

export const insightCategories = insightCategoryGroups.map((category) => ({
  ...category,
  subcategories: category.subcategories.map((subcategoryName) => ({
    name: subcategoryName,
    articles: [createComingSoonArticle(category.id, subcategoryName)],
  })),
}))

export const insightArticles = insightCategories.flatMap((category) =>
  category.subcategories.flatMap((subcategory) =>
    subcategory.articles.map((article) => {
      return {
        id: article.id,
        term: article.title,
        categoryId: category.id,
      }
    }),
  ),
)
