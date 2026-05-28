import { useEffect, useState } from 'react'
import { Accordion, AccordionDetails, AccordionSummary, Divider, Drawer, List, ListSubheader, useMediaQuery } from '@mui/material'
import { useLocation } from 'react-router-dom'
import { insightCategories } from '../../data/insights.js'

export default function InsightsNav() {
  const { pathname } = useLocation()
  const isMobileInsights = useMediaQuery('(max-width: 980px)')
  const [isMobileInsightsOpen, setMobileInsightsOpen] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState(insightCategories[0]?.id ?? false)

  useEffect(() => {
    if (isMobileInsights) {
      setMobileInsightsOpen(false)
    }
  }, [isMobileInsights, pathname])

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
        <nav className="insights-index" id="insights-drawer-nav" aria-label="Insights topics">
          <div className="insights-drawer-heading">
            <span>Insights</span>
            <strong>Topics</strong>
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
                <List className="insights-category-list" component="div" disablePadding>
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
                          <span className="insights-example-article insights-coming-soon-note">
                            More to come
                          </span>
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
