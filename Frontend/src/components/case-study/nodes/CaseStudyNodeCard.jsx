export default function CaseStudyNodeCard({ node, tone = 'neutral' }) {
  return (
    <section
      className={`case-study-node-card case-study-node-card-${tone}`}
      aria-label={`${node.title}: ${node.subtitle}`}
    >
      <p className="case-study-node-meta">{node.meta}</p>
      <h3>{node.title}</h3>
      <p className="case-study-node-subtitle">{node.subtitle}</p>
      <p className="case-study-node-body">{node.body}</p>
    </section>
  )
}
