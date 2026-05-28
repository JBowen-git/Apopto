export default function SolutionPlaceholderImage({ index, title }) {
  const label = `${title} solution preview`
  const variant = index % 3

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
      {variant === 0 ? (
        <>
          <circle className="solution-placeholder-orbit" cx="452" cy="116" r="76" />
          <circle className="solution-placeholder-dot" cx="452" cy="116" r="18" />
          <path
            className="solution-placeholder-line"
            d="M96 246C156 194 210 186 268 226C316 260 366 264 426 222C474 188 510 184 556 206"
          />
          <rect className="solution-placeholder-chip" height="42" rx="8" width="146" x="78" y="72" />
          <rect className="solution-placeholder-chip solution-placeholder-chip-soft" height="42" rx="8" width="198" x="78" y="128" />
          <rect className="solution-placeholder-chip" height="42" rx="8" width="116" x="78" y="184" />
        </>
      ) : null}
      {variant === 1 ? (
        <>
          <rect className="solution-placeholder-chip solution-placeholder-chip-soft" height="74" rx="10" width="172" x="82" y="72" />
          <rect className="solution-placeholder-chip" height="74" rx="10" width="172" x="82" y="168" />
          <rect className="solution-placeholder-chip" height="46" rx="8" width="206" x="338" y="76" />
          <rect className="solution-placeholder-chip solution-placeholder-chip-soft" height="46" rx="8" width="206" x="338" y="142" />
          <rect className="solution-placeholder-chip" height="46" rx="8" width="206" x="338" y="208" />
          <path
            className="solution-placeholder-line"
            d="M258 108H314M258 204H314"
          />
        </>
      ) : null}
      {variant === 2 ? (
        <>
          <rect className="solution-placeholder-chip" height="112" rx="12" width="132" x="80" y="78" />
          <rect className="solution-placeholder-chip" height="112" rx="12" width="132" x="254" y="78" />
          <rect className="solution-placeholder-chip" height="112" rx="12" width="132" x="428" y="78" />
          <path
            className="solution-placeholder-line"
            d="M94 236H356C384 236 406 256 406 282C406 298 418 310 438 310H534"
          />
          <circle className="solution-placeholder-dot" cx="534" cy="310" r="16" />
          <circle className="solution-placeholder-dot" cx="438" cy="310" r="16" />
          <rect className="solution-placeholder-chip solution-placeholder-chip-soft" height="42" rx="8" width="138" x="394" y="232" />
        </>
      ) : null}
    </svg>
  )
}
