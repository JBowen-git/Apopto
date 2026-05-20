export default function PortfolioClusterImage({ project, index }) {
  return (
    <article
      aria-label={project.title}
      className={`portfolio-cluster-card portfolio-cluster-card-${index + 1}`}
    >
      <img src={project.image} alt={`${project.title} website screenshot`} />
    </article>
  )
}
