export const contactSteps = ['Contact', 'Business', 'Project']

export const projectWizardSteps = [
  {
    label: 'Contact',
    title: 'Start with the best way to reach you.',
    description:
      'A few essentials make it easy to follow up clearly and keep the project path moving.',
    summary: 'Name, email, company, and timing.',
  },
  {
    label: 'Business',
    title: 'Frame the business and goal.',
    description:
      'This step turns the request into a clearer direction: audience, region, priority, and the problem the build should solve.',
    summary: 'Audience, region, goal, and problem.',
  },
  {
    label: 'Project',
    title: 'Map the build requirements.',
    description:
      'The final step captures readiness, scope, features, and inspiration so the next conversation starts with useful context.',
    summary: 'Branding, content, pages, and features.',
  },
]

export const contactInitialValues = {
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

export const contactRequiredFieldsByStep = [
  ['name', 'email', 'company', 'preferredContact', 'bestTime'],
  ['businessDescription', 'customers', 'region', 'projectGoal', 'problem'],
  ['branding', 'content', 'pageCount'],
]

export const simpleContactInitialValues = {
  name: '',
  email: '',
  company: '',
  phone: '',
  preferredContact: '',
  bestTime: '',
  message: '',
}

export const simpleContactRequiredFields = [
  'name',
  'email',
  'company',
  'preferredContact',
  'bestTime',
]

export const preferredContactOptions = ['Email', 'Phone', 'Text', 'Video call']
export const bestTimeOptions = ['Morning', 'Afternoon', 'Evening', 'Flexible']
export const projectGoalOptions = [
  'Get more leads',
  'Sell products online',
  'Look more professional',
  'Replace an outdated website',
  'Automate a manual process',
  'Build a portal/dashboard',
  'Improve speed or SEO',
  'Launch a new brand',
]
export const projectReadinessOptions = ['Yes', 'No', 'In Progress']
export const pageCountOptions = ['1-3', '4-7', '8-15', '15+']
export const projectNeedOptions = ['Booking', 'Payments', 'Forms', 'Login features', 'Dashboards']
