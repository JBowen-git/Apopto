import { Suspense } from 'react'
import Layout from './components/layout/Layout.jsx'
import RouteLoadingFallback from './components/routing/RouteLoadingFallback.jsx'
import ScrollToTop from './components/routing/ScrollToTop.jsx'
import About from './pages/About.jsx'
import AdminClientDetail from './pages/AdminClientDetail'
import AdminClients from './pages/AdminClients'
import AuthCallback from './pages/AuthCallback.jsx'
import Billing from './pages/Billing'
import Contact from './pages/Contact.jsx'
import CustomerAccount from './pages/CustomerAccount.jsx'
import Dashboard from './pages/Dashboard'
import ErrorPage from './pages/ErrorPage.jsx'
import Files from './pages/Files'
import Home from './pages/Home.jsx'
import Insights from './pages/Insights.jsx'
import Intake from './pages/Intake'
import MessageThread from './pages/MessageThread'
import Messages from './pages/Messages'
import NotFound from './pages/NotFound.jsx'
import Portfolio from './pages/Portfolio.jsx'
import SolutionDetailPage from './pages/SolutionDetailPage.jsx'
import Solutions from './pages/Solutions.jsx'
import StartAProject from './pages/StartAProject.jsx'
import AppRoutes from './routes/AppRoutes.jsx'

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

export default function ServerApp() {
  return (
    <Layout>
      <ScrollToTop />
      <Suspense fallback={<RouteLoadingFallback />}>
        <AppRoutes pages={pages} />
      </Suspense>
    </Layout>
  )
}
