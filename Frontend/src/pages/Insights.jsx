import { Divider } from '@mui/material'
import { useParams } from 'react-router-dom'
import { insightArticles } from '../data/insights.js'

export default function Insights() {
  const { conceptId } = useParams()
  const selectedConcept =
    insightArticles.find((article) => article.id === conceptId) ?? insightArticles[0]

  return (
    <section className="insights-page" aria-label="Insights articles">
      <div className="insights-dictionary">
        <article className="insights-panel" key={selectedConcept.id}>
          <div className="insights-panel-copy">
            <p className="insights-panel-kicker">
              {selectedConcept.categoryName} / {selectedConcept.subcategoryName}
            </p>
            <h2>{selectedConcept.term}</h2>
            <Divider className="insights-mui-divider" flexItem />
            <p>{selectedConcept.definition}</p>
            <Divider className="insights-mui-divider" flexItem />
            <ul>
              {selectedConcept.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>

          <div className="insights-screenshot-stack" aria-label={`${selectedConcept.term} screenshots`}>
            {selectedConcept.screenshots.map((screenshot) => (
              <figure className="insights-screenshot" key={screenshot.src}>
                <img src={screenshot.src} alt={`${selectedConcept.term}: ${screenshot.label}`} />
                <figcaption>{screenshot.label}</figcaption>
              </figure>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
