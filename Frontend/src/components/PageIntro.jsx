export default function PageIntro({ eyebrow, title, children }) {
  return (
    <section className="content-section">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <div className="content-body">{children}</div>
    </section>
  )
}
