export default function HeroShineText({ text = 'Apopto', className = '' }) {
  const letters = Array.from(text)
  const classNames = ['hero-shine-title', className].filter(Boolean).join(' ')

  return (
    <div className={classNames} aria-hidden="true">
      <span className="hero-shine-word" aria-hidden="true">
        {letters.map((letter, index) => (
          <span
            className="hero-shine-letter"
            key={`${letter}-${index}`}
            style={{ '--hero-letter-delay': `${220 + index * 44}ms` }}
          >
            {letter}
          </span>
        ))}
      </span>
      <span className="hero-shine-sweep" aria-hidden="true" />
    </div>
  )
}
