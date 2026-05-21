import { lazy, Suspense } from 'react'
import Layout from './components/layout/Layout.jsx'
import RouteLoadingFallback from './components/routing/RouteLoadingFallback.jsx'
import AppRoutes from './routes/AppRoutes.jsx'

const About = lazy(() => import('./pages/About.jsx'))
const AuthCallback = lazy(() => import('./pages/AuthCallback.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const CustomerAccount = lazy(() => import('./pages/CustomerAccount.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ErrorPage = lazy(() => import('./pages/ErrorPage.jsx'))
const Home = lazy(() => import('./pages/Home.jsx'))
const Insights = lazy(() => import('./pages/Insights.jsx'))
const Intake = lazy(() => import('./pages/Intake'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))
const Portfolio = lazy(() => import('./pages/Portfolio.jsx'))
const PortfolioDetailPage = lazy(() => import('./pages/PortfolioDetailPage.jsx'))
const Solutions = lazy(() => import('./pages/Solutions.jsx'))
const StartAProject = lazy(() => import('./pages/StartAProject.jsx'))

const pages = {
  About,
  AuthCallback,
  Contact,
  CustomerAccount,
  Dashboard,
  ErrorPage,
  Home,
  Insights,
  Intake,
  NotFound,
  Portfolio,
  PortfolioDetailPage,
  Solutions,
  StartAProject,
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<RouteLoadingFallback />}>
        <AppRoutes pages={pages} />
      </Suspense>
    </Layout>
  )
}
