import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../components/routing/ProtectedRoute'
import PortalWorkspaceShell from '../components/layout/PortalWorkspaceShell'
import { portfolioDetailPages } from '../data/portfolio.js'

function clientWorkspace(children) {
  return (
    <ProtectedRoute>
      <PortalWorkspaceShell variant="client">
        {children}
      </PortalWorkspaceShell>
    </ProtectedRoute>
  )
}

function adminWorkspace(children) {
  return (
    <ProtectedRoute>
      <PortalWorkspaceShell variant="admin">
        {children}
      </PortalWorkspaceShell>
    </ProtectedRoute>
  )
}

export default function AppRoutes({ pages }) {
  const {
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
        element={clientWorkspace(<Dashboard />)}
      />
      <Route
        path="/intake"
        element={clientWorkspace(<Intake />)}
      />
      <Route
        path="/files"
        element={clientWorkspace(<Files />)}
      />
      <Route
        path="/messages"
        element={clientWorkspace(<Messages />)}
      />
      <Route
        path="/messages/:threadId"
        element={clientWorkspace(<MessageThread />)}
      />
      <Route
        path="/billing"
        element={clientWorkspace(<Billing />)}
      />
      <Route
        path="/admin/clients"
        element={adminWorkspace(<AdminClients />)}
      />
      <Route
        path="/admin/clients/:clientId"
        element={adminWorkspace(<AdminClientDetail />)}
      />
      <Route path="/account" element={<CustomerAccount />} />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
