export default function HeroFeatureIcon({ type }) {
  if (type === 'network') {
    return (
      <svg aria-hidden="true" className="hero-feature-icon" focusable="false" viewBox="0 0 48 48">
        <circle cx="24" cy="12" r="4" />
        <circle cx="12" cy="30" r="4" />
        <circle cx="36" cy="30" r="4" />
        <circle cx="24" cy="38" r="3.5" />
        <path d="M21.8 15.5 14.4 26.6M26.2 15.5l7.4 11.1M15.8 31.7l4.9 3.4M32.2 31.7l-4.9 3.4M16 30h16" />
      </svg>
    )
  }

  if (type === 'shield') {
    return (
      <svg aria-hidden="true" className="hero-feature-icon" focusable="false" viewBox="0 0 48 48">
        <path d="M24 7.5 37 12v10.8c0 8.5-5.2 15.8-13 18.2-7.8-2.4-13-9.7-13-18.2V12l13-4.5Z" />
        <path d="M24 14v19" />
      </svg>
    )
  }

  if (type === 'signal') {
    return (
      <svg aria-hidden="true" className="hero-feature-icon" focusable="false" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="3.8" />
        <path d="M24 8v5M24 35v5M8 24h5M35 24h5M13.6 13.6l3.6 3.6M30.8 30.8l3.6 3.6M34.4 13.6l-3.6 3.6M17.2 30.8l-3.6 3.6" />
        <path d="M31.4 19.7A8.6 8.6 0 0 1 28 31.5" />
        <path d="M16.6 28.3A8.6 8.6 0 0 1 20 16.5" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" className="hero-feature-icon" focusable="false" viewBox="0 0 48 48">
      <path d="m19 15-9 9 9 9M29 15l9 9-9 9M26 12l-4 24" />
    </svg>
  )
}
