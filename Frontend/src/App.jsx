import { Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout.jsx'
import { portfolioDetailPages } from './data/portfolio.js'
import About from './pages/About.jsx'
import Contact from './pages/Contact.jsx'
import CustomerAccount from './pages/CustomerAccount.jsx'
import ErrorPage from './pages/ErrorPage.jsx'
import Home from './pages/Home.jsx'
import Insights from './pages/Insights.jsx'
import NotFound from './pages/NotFound.jsx'
import Portfolio from './pages/Portfolio.jsx'
import PortfolioDetailPage from './pages/PortfolioDetailPage.jsx'
import Solutions from './pages/Solutions.jsx'
import StartAProject from './pages/StartAProject.jsx'

export default function App() {
  return (
    <Layout>
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
        <Route path="/account" element={<CustomerAccount />} />
        <Route path="/error" element={<ErrorPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}
