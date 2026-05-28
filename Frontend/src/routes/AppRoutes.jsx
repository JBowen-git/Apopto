import { Route, Routes } from 'react-router-dom'
import AuthRouteBoundary from '../components/routing/AuthRouteBoundary.jsx'
import ProtectedRoute from '../components/routing/ProtectedRoute'
import QueryRouteBoundary from '../components/routing/QueryRouteBoundary.jsx'
import PortalWorkspaceShell from '../components/layout/PortalWorkspaceShell'

function clientWorkspace(children) {
  return (
    <AuthRouteBoundary>
      <QueryRouteBoundary>
        <ProtectedRoute>
          <PortalWorkspaceShell variant="client">
            {children}
          </PortalWorkspaceShell>
        </ProtectedRoute>
      </QueryRouteBoundary>
    </AuthRouteBoundary>
  )
}

function adminWorkspace(children) {
  return (
    <AuthRouteBoundary>
      <QueryRouteBoundary>
        <ProtectedRoute>
          <PortalWorkspaceShell variant="admin">
            {children}
          </PortalWorkspaceShell>
        </ProtectedRoute>
      </QueryRouteBoundary>
    </AuthRouteBoundary>
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
    SolutionDetailPage,
    Solutions,
    StartAProject,
  } = pages

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/solutions" element={<Solutions />} />
      <Route path="/solutions/:serviceSlug" element={<SolutionDetailPage />} />
      <Route path="/portfolio" element={<Portfolio />} />
      <Route path="/about" element={<About />} />
      <Route path="/insights" element={<Insights />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/start-a-project" element={<StartAProject />} />
      <Route
        path="/callback"
        element={(
          <AuthRouteBoundary>
            <AuthCallback />
          </AuthRouteBoundary>
        )}
      />
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
      <Route
        path="/account"
        element={(
          <AuthRouteBoundary>
            <QueryRouteBoundary>
              <CustomerAccount />
            </QueryRouteBoundary>
          </AuthRouteBoundary>
        )}
      />
      <Route path="/error" element={<ErrorPage />} />
      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
