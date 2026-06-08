import { describe, expect, it } from 'vitest'
import { caseStudyNodeRegistry } from '../components/case-study/caseStudyNodeRegistry.jsx'
import { caseStudyWorkflows, documentedWorkflowTitles } from './portfolioCaseStudy.js'

const nodeRegistry = caseStudyNodeRegistry as Record<string, unknown>

describe('portfolio case study workflow data', () => {
  it('includes every workflow listed in the source document', () => {
    expect(caseStudyWorkflows.map((workflow) => workflow.title)).toEqual(documentedWorkflowTitles)
  })

  it('has registered components and valid edges for every workflow', () => {
    for (const workflow of caseStudyWorkflows) {
      const nodeIds = new Set(workflow.nodes.map((node) => node.id))

      expect(workflow.nodes.length, `${workflow.id} should have nodes`).toBeGreaterThan(0)
      expect(workflow.edges.length, `${workflow.id} should have edges`).toBeGreaterThan(0)

      for (const node of workflow.nodes) {
        expect(nodeRegistry[node.id], `${workflow.id} missing component for ${node.id}`).toBeTruthy()
      }

      for (const edge of workflow.edges) {
        expect(nodeIds.has(edge.from), `${workflow.id} edge starts at missing node ${edge.from}`).toBe(true)
        expect(nodeIds.has(edge.to), `${workflow.id} edge ends at missing node ${edge.to}`).toBe(true)
      }
    }
  })
})
