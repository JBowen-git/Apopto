import Layout from './components/layout/Layout.jsx'
import About from './pages/About.jsx'
import AdminClientDetail from './pages/AdminClientDetail'
import AdminClients from './pages/AdminClients'
import AuthCallback from './pages/AuthCallback.jsx'
import Contact from './pages/Contact.jsx'
import CustomerAccount from './pages/CustomerAccount.jsx'
import Dashboard from './pages/Dashboard'
import ErrorPage from './pages/ErrorPage.jsx'
import Home from './pages/Home.jsx'
import Insights from './pages/Insights.jsx'
import Intake from './pages/Intake'
import NotFound from './pages/NotFound.jsx'
import Portfolio from './pages/Portfolio.jsx'
import PortfolioDetailPage from './pages/PortfolioDetailPage.jsx'
import Solutions from './pages/Solutions.jsx'
import StartAProject from './pages/StartAProject.jsx'
import AppRoutes from './routes/AppRoutes.jsx'

const pages = {
  About,
  AdminClientDetail,
  AdminClients,
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

export default function ServerApp() {
  return (
    <Layout>
      <AppRoutes pages={pages} />
    </Layout>
  )
}
