import { lazy, Suspense } from 'react'
import Layout from './components/layout/Layout.jsx'
import RouteLoadingFallback from './components/routing/RouteLoadingFallback.jsx'
import ScrollToTop from './components/routing/ScrollToTop.jsx'
import AppRoutes from './routes/AppRoutes.jsx'

const About = lazy(() => import('./pages/About.jsx'))
const AdminClientDetail = lazy(() => import('./pages/AdminClientDetail'))
const AdminClients = lazy(() => import('./pages/AdminClients'))
const AuthCallback = lazy(() => import('./pages/AuthCallback.jsx'))
const Billing = lazy(() => import('./pages/Billing'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const CustomerAccount = lazy(() => import('./pages/CustomerAccount.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ErrorPage = lazy(() => import('./pages/ErrorPage.jsx'))
const Files = lazy(() => import('./pages/Files'))
const Home = lazy(() => import('./pages/Home.jsx'))
const Insights = lazy(() => import('./pages/Insights.jsx'))
const Intake = lazy(() => import('./pages/Intake'))
const MessageThread = lazy(() => import('./pages/MessageThread'))
const Messages = lazy(() => import('./pages/Messages'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))
const Portfolio = lazy(() => import('./pages/Portfolio.jsx'))
const SolutionDetailPage = lazy(() => import('./pages/SolutionDetailPage.jsx'))
const Solutions = lazy(() => import('./pages/Solutions.jsx'))
const StartAProject = lazy(() => import('./pages/StartAProject.jsx'))

const pages = {
  About,
  AdminClientDetail,
  AdminClients,
  AuthCallback,
  Billing,
  Contact,
  CustomerAccount,
  Dashboard,
  ErrorPage,
  Files,
  Home,
  Insights,
  Intake,
  MessageThread,
  Messages,
  NotFound,
  Portfolio,
  SolutionDetailPage,
  Solutions,
  StartAProject,
}

export default function App() {
  return (
    <Layout>
      <ScrollToTop />
      <Suspense fallback={<RouteLoadingFallback />}>
        <AppRoutes pages={pages} />
      </Suspense>
    </Layout>
  )
}
