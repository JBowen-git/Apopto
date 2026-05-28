import InsightsNav from '../components/insights/InsightsNav.jsx'
import { insightCategories } from '../data/insights.js'

export default function Insights() {
  return (
    <>
      <InsightsNav />
      <section className="insights-page" aria-labelledby="insights-title">
        <div className="insights-dictionary">
          <article className="insights-panel insights-panel-coming-soon">
            <div className="insights-panel-copy">
              <h1 id="insights-title">Insights</h1>
              <p>More to come.</p>
            </div>
          </article>
          <div className="insights-topic-grid" aria-label="Upcoming insights topics">
            {insightCategories.map((category) => (
              <section className="insights-topic-group" key={category.id} aria-labelledby={`insights-topic-${category.id}`}>
                <h2 id={`insights-topic-${category.id}`}>{category.name}</h2>
                <ul>
                  {category.subcategories.map((subcategory) => (
                    <li key={subcategory.name}>
                      <span>{subcategory.name}</span>
                      <small>More to come</small>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
