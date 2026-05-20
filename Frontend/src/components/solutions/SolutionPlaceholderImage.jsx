export default function SolutionPlaceholderImage({ index, title }) {
  const label = `${title} placeholder image`

  return (
    <svg
      aria-label={label}
      className={`solution-placeholder-image solution-placeholder-image-${index + 1}`}
      role="img"
      viewBox="0 0 640 360"
    >
      <rect className="solution-placeholder-base" height="360" rx="0" width="640" />
      <path
        className="solution-placeholder-grid"
        d="M0 84H640M0 168H640M0 252H640M128 0V360M256 0V360M384 0V360M512 0V360"
      />
      <circle className="solution-placeholder-orbit" cx="456" cy="118" r="72" />
      <circle className="solution-placeholder-dot" cx="456" cy="118" r="18" />
      <path
        className="solution-placeholder-line"
        d="M92 238C156 184 210 180 268 224C316 260 366 264 426 222C474 188 510 184 556 206"
      />
      <rect className="solution-placeholder-chip" height="42" rx="8" width="146" x="78" y="72" />
      <rect className="solution-placeholder-chip solution-placeholder-chip-soft" height="42" rx="8" width="198" x="78" y="128" />
    </svg>
  )
}
