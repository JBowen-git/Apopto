import { useMemo, useState } from 'react'
import { caseStudyWorkflows } from '../../data/portfolioCaseStudy.js'
import { caseStudyNodeRegistry } from './caseStudyNodeRegistry.jsx'

function WorkflowConnectorLayer({ workflow }) {
  const nodePositions = useMemo(() => (
    new Map(workflow.nodes.map((node) => [node.id, node]))
  ), [workflow.nodes])
  const markerId = `case-study-arrow-${workflow.id}`

  return (
    <svg
      aria-hidden="true"
      className="case-study-connector-layer"
      focusable="false"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <defs>
        <marker
          id={markerId}
          markerHeight="7"
          markerWidth="7"
          orient="auto"
          refX="6"
          refY="3.5"
        >
          <path d="M0,0 L7,3.5 L0,7 Z" />
        </marker>
      </defs>
      {workflow.edges.map((edge) => {
        const from = nodePositions.get(edge.from)
        const to = nodePositions.get(edge.to)

        if (!from || !to) {
          return null
        }

        return (
          <line
            key={`${edge.from}-${edge.to}-${edge.label || ''}`}
            markerEnd={`url(#${markerId})`}
            x1={from.x}
            x2={to.x}
            y1={from.y}
            y2={to.y}
          >
            <title>{edge.label || `${from.title} to ${to.title}`}</title>
          </line>
        )
      })}
    </svg>
  )
}

function WorkflowDiagram({ workflow }) {
  return (
    <div
      aria-label={`${workflow.title} architecture diagram`}
      className="case-study-diagram"
      role="img"
    >
      <WorkflowConnectorLayer workflow={workflow} />
      {workflow.nodes.map((node) => {
        const NodeComponent = caseStudyNodeRegistry[node.id]

        if (!NodeComponent) {
          return null
        }

        return (
          <div
            className="case-study-node-position"
            key={node.id}
            style={{
              '--case-study-node-x': `${node.x}%`,
              '--case-study-node-y': `${node.y}%`,
            }}
          >
            <NodeComponent node={node} />
          </div>
        )
      })}
    </div>
  )
}

export default function CaseStudyWorkflowExplorer() {
  const [activeWorkflowId, setActiveWorkflowId] = useState(caseStudyWorkflows[0].id)
  const activeWorkflow = caseStudyWorkflows.find((workflow) => workflow.id === activeWorkflowId)
    || caseStudyWorkflows[0]

  return (
    <section className="case-study-explorer" aria-labelledby="case-study-process-title">
      <div className="case-study-explorer-main">
        <div className="case-study-process-copy">
          <p className="portfolio-project-label">Interactive process map</p>
          <h2 id="case-study-process-title">{activeWorkflow.title}</h2>
          <p>{activeWorkflow.summary}</p>
        </div>

        <WorkflowDiagram workflow={activeWorkflow} />

        <div className="case-study-outcome-panel">
          <p className="case-study-outcome-label">Why it matters</p>
          <p>{activeWorkflow.outcome}</p>
        </div>
      </div>

      <aside className="case-study-process-panel" aria-label="Case study process selector">
        <p className="case-study-process-panel-label">Processes</p>
        <div className="case-study-process-list">
          {caseStudyWorkflows.map((workflow, index) => {
            const isActive = workflow.id === activeWorkflow.id

            return (
              <button
                aria-pressed={isActive}
                className={isActive ? 'case-study-process-button is-active' : 'case-study-process-button'}
                key={workflow.id}
                onClick={() => setActiveWorkflowId(workflow.id)}
                type="button"
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                {workflow.label}
              </button>
            )
          })}
        </div>
      </aside>
    </section>
  )
}
