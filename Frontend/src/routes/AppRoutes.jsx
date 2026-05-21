import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../components/routing/ProtectedRoute'
import { portfolioDetailPages } from '../data/portfolio.js'

export default function AppRoutes({ pages }) {
  const {
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
  } = pages

  return (
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
      <Route path="/callback" element={<AuthCallback />} />
      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/intake"
        element={(
          <ProtectedRoute>
            <Intake />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/admin/clients"
        element={(
          <ProtectedRoute>
            <AdminClients />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/admin/clients/:clientId"
        element={(
          <ProtectedRoute>
            <AdminClientDetail />
          </ProtectedRoute>
        )}
      />
      <Route path="/account" element={<CustomerAccount />} />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
