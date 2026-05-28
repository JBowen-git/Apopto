import { useEffect, useState } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Divider, Drawer, List, ListItemButton, ListSubheader, useMediaQuery } from '@mui/material'
import { NavLink, useLocation } from 'react-router-dom'
import { insightArticles, insightCategories } from '../../data/insights.js'
import { toArticleId } from '../../utils/toArticleId.js'

function getArticleId(article) {
  return typeof article === 'string' ? toArticleId(article) : article.id
}

function getArticleTitle(article) {
  return typeof article === 'string' ? article : article.title
}

export default function InsightsNav() {
  const { pathname } = useLocation()
  const isMobileInsights = useMediaQuery('(max-width: 980px)')
  const [isMobileInsightsOpen, setMobileInsightsOpen] = useState(false)
  const currentArticleId = pathname.startsWith('/insights/')
    ? pathname.split('/').filter(Boolean).at(-1)
    : insightArticles[0].id
  const currentArticle =
    insightArticles.find((article) => article.id === currentArticleId) ?? insightArticles[0]
  const [expandedCategory, setExpandedCategory] = useState(currentArticle.categoryId)

  useEffect(() => {
    setExpandedCategory(currentArticle.categoryId)
  }, [currentArticle.categoryId])

  useEffect(() => {
    if (isMobileInsights) {
      setMobileInsightsOpen(false)
    }
  }, [isMobileInsights, pathname])

  const closeMobileInsights = () => {
    if (isMobileInsights) {
      setMobileInsightsOpen(false)
    }
  }

  return (
    <>
      <button
        aria-controls="insights-drawer-nav"
        aria-expanded={isMobileInsightsOpen}
        className={`insights-mobile-toggle${
          isMobileInsightsOpen ? ' insights-mobile-toggle-open' : ''
        }`}
        onClick={() => setMobileInsightsOpen(true)}
        type="button"
      >
        Insights menu
      </button>
      <Drawer
        className="insights-drawer"
        ModalProps={{ keepMounted: true }}
        onClose={() => setMobileInsightsOpen(false)}
        open={isMobileInsights ? isMobileInsightsOpen : true}
        slotProps={{
          paper: {
            className: 'insights-drawer-paper',
            sx: {
              background: '#ffffff',
              border: 0,
              borderRadius: isMobileInsights ? '0 18px 18px 0' : 0,
              borderRight: '1px solid rgba(15, 23, 42, 0.14)',
              bottom: 0,
              boxSizing: 'border-box',
              boxShadow:
                'inset -1px 0 0 rgba(15, 23, 42, 0.06), 18px 0 58px rgba(15, 23, 42, 0.08)',
              color: '#0f172a',
              height: isMobileInsights ? '100dvh' : 'auto',
              left: 0,
              overflow: 'hidden',
              position: isMobileInsights ? 'fixed' : 'absolute',
              top: 0,
              width: isMobileInsights
                ? 'min(360px, calc(100vw - 24px))'
                : 'var(--insights-drawer-width)',
            },
          },
        }}
        variant={isMobileInsights ? 'temporary' : 'permanent'}
      >
        <nav className="insights-index" id="insights-drawer-nav" aria-label="Insights articles">
          <div className="insights-drawer-heading">
            <span>Insights</span>
            <strong>Articles</strong>
            <button
              aria-label="Close insights menu"
              className="insights-drawer-close"
              onClick={() => setMobileInsightsOpen(false)}
              type="button"
            >
              Close
            </button>
          </div>
          <Divider className="insights-mui-divider" flexItem />
          {insightCategories.map((category) => (
            <Accordion
              className="insights-category-accordion"
              disableGutters
              expanded={expandedCategory === category.id}
              key={category.id}
              onChange={(_, isExpanded) =>
                setExpandedCategory(isExpanded ? category.id : false)
              }
              square
            >
              <AccordionSummary className="insights-category-summary">
                <span className="insights-summary-main">
                  <span className="insights-accordion-icon" aria-hidden="true">
                    ›
                  </span>
                  <span className="insights-category-name">{category.name}</span>
                </span>
              </AccordionSummary>
              <AccordionDetails className="insights-category-details">
                <List className="insights-category-list" disablePadding>
                  {category.subcategories.map((subcategory) => {
                    return (
                      <div className="insights-subcategory-group" key={subcategory.name}>
                        <ListSubheader
                          className="insights-subcategory-label"
                          component="div"
                          disableSticky
                        >
                          {subcategory.name}
                        </ListSubheader>
                        <div className="insights-example-article-list">
                          {subcategory.articles.map((article) => {
                            const articleId = getArticleId(article)
                            const articleTitle = getArticleTitle(article)
                            const isSelected = articleId === currentArticle.id

                            return (
                              <ListItemButton
                                className="insights-example-article"
                                component={NavLink}
                                key={articleId}
                                onClick={closeMobileInsights}
                                selected={isSelected}
                                to={`/insights/${articleId}`}
                              >
                                {articleTitle}
                              </ListItemButton>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </List>
              </AccordionDetails>
            </Accordion>
          ))}
        </nav>
      </Drawer>
    </>
  )
}
