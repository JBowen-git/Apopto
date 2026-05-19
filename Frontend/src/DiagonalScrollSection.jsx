import { useEffect, useRef } from 'react'

// Tune these values to change the length and shape of the scroll-controlled game path.
const pongSettings = {
  sectionHeight: '760vh',
}

const pongPathPoints = {
  desktop: [
    { x: 50, y: 8 },
    { x: 3, y: 18 },
    { x: 97, y: 29 },
    { x: 3, y: 41 },
    { x: 97, y: 53 },
    { x: 3, y: 65 },
    { x: 97, y: 77 },
    { x: 3, y: 89 },
    { x: 50, y: 95 },
  ],
  mobile: [
    { x: 50, y: 34 },
    { x: 7, y: 46 },
    { x: 93, y: 55 },
    { x: 7, y: 63 },
    { x: 93, y: 71 },
    { x: 7, y: 79 },
    { x: 93, y: 86 },
    { x: 7, y: 92 },
    { x: 50, y: 96 },
  ],
}

const focusCards = [
  {
    number: '01',
    title: 'DYNAMIC WEBSITES',
    detail: 'Content, motion, and data respond as visitors move.',
    hitIndex: 1,
    side: 'left',
  },
  {
    number: '02',
    title: 'LIVE SYSTEMS',
    detail: 'Forms connect to APIs, dashboards, and alerts.',
    hitIndex: 2,
    side: 'right',
  },
  {
    number: '03',
    title: 'ADAPTIVE JOURNEYS',
    detail: 'The route can shift around intent and behavior.',
    hitIndex: 3,
    side: 'left',
  },
  {
    number: '04',
    title: 'USEFUL INTERACTIONS',
    detail: 'Clicks can trigger analytics and workflow updates.',
    hitIndex: 4,
    side: 'right',
  },
  {
    number: '05',
    title: 'BUILT TO EVOLVE',
    detail: 'The site keeps growing without feeling heavy.',
    hitIndex: 5,
    side: 'left',
  },
  {
    number: '06',
    title: 'RESULTS LOOP',
    detail: 'Leads, sales, calls, and data feed the next move.',
    hitIndex: 6,
    side: 'right',
  },
]

const backgroundWords = [
  { text: 'STATIC', x: 7, y: 15, side: 'left' },
  { text: 'MOTION', x: 72, y: 29, side: 'right' },
  { text: 'SYSTEMS', x: 3, y: 47, side: 'left' },
  { text: 'DATA', x: 76, y: 63, side: 'right' },
  { text: 'AUTOMATION', x: 0, y: 82, side: 'left' },
]

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function easeOutQuint(value) {
  return 1 - Math.pow(1 - value, 5)
}

function getPongMetrics(stageWidth, viewportWidth) {
  const isMobile = viewportWidth <= 640
  const paddleInset = isMobile ? 16 : clamp(viewportWidth * 0.03, 18, 42)
  const paddleWidth = isMobile ? 9 : clamp(viewportWidth * 0.01, 10, 16)
  const ballSize = clamp(viewportWidth * 0.017, 16, 24)
  const ballHalf = ballSize / 2

  return {
    leftImpactX: paddleInset + paddleWidth + ballHalf,
    rightImpactX: stageWidth - paddleInset - paddleWidth - ballHalf,
  }
}

function measurePath(points, width, height, viewportWidth) {
  const metrics = getPongMetrics(width, viewportWidth)
  const scaledPoints = points.map((point) => {
    const side = point.x < 25 ? 'left' : point.x > 75 ? 'right' : 'center'
    const x = side === 'left'
      ? metrics.leftImpactX
      : side === 'right'
        ? metrics.rightImpactX
        : (point.x / 100) * width

    return {
      x,
      y: (point.y / 100) * height,
      side,
    }
  })
  const segmentLengths = []
  let totalLength = 0

  for (let index = 0; index < scaledPoints.length - 1; index += 1) {
    const start = scaledPoints[index]
    const end = scaledPoints[index + 1]
    const length = Math.hypot(end.x - start.x, end.y - start.y)

    segmentLengths.push(length)
    totalLength += length
  }

  let traveled = 0
  const measuredPoints = scaledPoints.map((point, index) => {
    if (index > 0) {
      traveled += segmentLengths[index - 1]
    }

    return {
      ...point,
      progress: totalLength === 0 ? 0 : traveled / totalLength,
    }
  })

  return {
    points: measuredPoints,
    segmentLengths,
    totalLength,
  }
}

function getPointOnPath(path, progress) {
  const { points, segmentLengths, totalLength } = path
  let targetDistance = totalLength * clamp(progress)

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const length = segmentLengths[index]

    if (targetDistance <= length || index === segmentLengths.length - 1) {
      const start = points[index]
      const end = points[index + 1]
      const localProgress = length === 0 ? 0 : targetDistance / length

      return {
        x: start.x + (end.x - start.x) * localProgress,
        y: start.y + (end.y - start.y) * localProgress,
      }
    }

    targetDistance -= length
  }

  return points[points.length - 1]
}

function getPaddleY(path, side, progress) {
  const startingPoint = path.points[0]
  const edgeHits = path.points.filter((point) => point.side === side)
  const targets = [
    { ...startingPoint, progress: 0 },
    ...edgeHits,
  ]
  const nextTarget = targets.find((target) => target.progress >= progress) || targets[targets.length - 1]
  let previousTarget = targets[0]

  for (let index = targets.length - 1; index >= 0; index -= 1) {
    if (targets[index].progress <= progress) {
      previousTarget = targets[index]
      break
    }
  }

  if (!previousTarget || !nextTarget || previousTarget.progress === nextTarget.progress) {
    return nextTarget?.y || startingPoint.y
  }

  const localProgress = clamp(
    (progress - previousTarget.progress) / (nextTarget.progress - previousTarget.progress),
  )

  return previousTarget.y + (nextTarget.y - previousTarget.y) * easeOutQuint(localProgress)
}

export default function DiagonalScrollSection() {
  const sectionRef = useRef(null)

  useEffect(() => {
    const section = sectionRef.current

    if (!section) {
      return undefined
    }

    let ticking = false
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const update = () => {
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1
      const stage = section.querySelector('.pong-stage')
      const stageWidth = stage?.offsetWidth || viewportWidth
      const stageHeight = stage?.offsetHeight || viewportHeight
      const rect = section.getBoundingClientRect()
      const totalScrollable = Math.max(section.offsetHeight - viewportHeight, 1)
      const scrollProgress = clamp(-rect.top / totalScrollable)
      const progress = reduceQuery.matches ? 0.5 : scrollProgress
      const sectionIsVisible = rect.top < viewportHeight && rect.bottom > 0
      const activePoints = viewportWidth <= 640 ? pongPathPoints.mobile : pongPathPoints.desktop
      const stageRect = stage?.getBoundingClientRect()
      const path = measurePath(activePoints, stageWidth, stageHeight, viewportWidth)
      const ball = getPointOnPath(path, progress)
      const leftPaddleY = getPaddleY(path, 'left', progress)
      const rightPaddleY = getPaddleY(path, 'right', progress)

      section.style.setProperty('--scroll-progress', progress.toFixed(4))
      section.style.setProperty('--pong-ball-x', `${ball.x}px`)
      section.style.setProperty('--pong-ball-y', `${ball.y}px`)
      section.style.setProperty('--pong-left-paddle-y', `${leftPaddleY}px`)
      section.style.setProperty('--pong-right-paddle-y', `${rightPaddleY}px`)
      section.style.setProperty('--pong-rail-opacity', sectionIsVisible ? '1' : '0')

      section.querySelectorAll('[data-pong-focus-card]').forEach((cardNode) => {
        const card = cardNode
        const hitIndex = Number.parseInt(card.dataset.hitIndex || '', 10)
        const fallbackStart = Number.parseFloat(card.dataset.start || '0')
        const start = Number.isNaN(hitIndex)
          ? fallbackStart
          : path.points[hitIndex]?.progress ?? fallbackStart
        const hitPoint = Number.isNaN(hitIndex) ? undefined : path.points[hitIndex]
        const focusTop = (stageRect?.top ?? 0) + (hitPoint?.y ?? stageHeight * 0.5)
        const enterDuration = 0.018
        const holdEnd = start + 0.095
        const exitEnd = holdEnd + 0.08
        const hasHit = progress >= start
        const enterProgress = reduceQuery.matches
          ? 1
          : hasHit
            ? Math.max(0.88, easeOutQuint(clamp((progress - start) / enterDuration)))
            : 0
        const exitProgress = reduceQuery.matches
          ? 0
          : easeOutQuint(clamp((progress - holdEnd) / (exitEnd - holdEnd)))
        const presence = enterProgress * (1 - exitProgress)
        const direction = card.classList.contains('pong-focus-card-left') ? -1 : 1
        const focusOpacity = presence
        const focusX = ((1 - enterProgress) * 22 + exitProgress * 28) * direction
        const focusY = -exitProgress * 44
        const focusScale = 0.94 + enterProgress * 0.06 - exitProgress * 0.035
        const markerWidth = 84 + presence * 72

        card.style.setProperty('--focus-marker-width', `${markerWidth.toFixed(1)}px`)
        card.style.setProperty('--focus-opacity', focusOpacity.toFixed(4))
        card.style.setProperty('--focus-scale', focusScale.toFixed(4))
        card.style.setProperty('--focus-top', `${focusTop.toFixed(1)}px`)
        card.style.setProperty('--focus-x', `${focusX.toFixed(1)}px`)
        card.style.setProperty('--focus-y', `${focusY.toFixed(1)}px`)
      })

      section.querySelectorAll('[data-pong-mobile-card]').forEach((cardNode) => {
        const card = cardNode
        const hitIndex = Number.parseInt(card.dataset.hitIndex || '', 10)
        const fallbackStart = Number.parseFloat(card.dataset.start || '0')
        const start = Number.isNaN(hitIndex)
          ? fallbackStart
          : path.points[hitIndex]?.progress ?? fallbackStart
        const hitPoint = Number.isNaN(hitIndex) ? undefined : path.points[hitIndex]
        const enterDuration = 0.018
        const holdEnd = start + 0.1
        const exitEnd = holdEnd + 0.08
        const hasHit = progress >= start
        const enterProgress = reduceQuery.matches
          ? 1
          : hasHit
            ? Math.max(0.88, easeOutQuint(clamp((progress - start) / enterDuration)))
            : 0
        const exitProgress = reduceQuery.matches
          ? 0
          : easeOutQuint(clamp((progress - holdEnd) / (exitEnd - holdEnd)))
        const presence = enterProgress * (1 - exitProgress)
        const direction = card.classList.contains('pong-mobile-copy-left') ? -1 : 1
        const mobileY = hitPoint?.y ?? stageHeight * 0.5
        const mobileX = hitPoint?.x ?? stageWidth * 0.5
        const mobileScale = 0.95 + enterProgress * 0.05 - exitProgress * 0.035
        const mobileOffsetX = ((1 - enterProgress) * 18 + exitProgress * 22) * direction
        const mobileOffsetY = -exitProgress * 24

        card.style.setProperty('--mobile-focus-opacity', presence.toFixed(4))
        card.style.setProperty('--mobile-focus-scale', mobileScale.toFixed(4))
        card.style.setProperty('--mobile-focus-x', `${mobileX.toFixed(1)}px`)
        card.style.setProperty('--mobile-focus-y', `${mobileY.toFixed(1)}px`)
        card.style.setProperty('--mobile-focus-offset-x', `${mobileOffsetX.toFixed(1)}px`)
        card.style.setProperty('--mobile-focus-offset-y', `${mobileOffsetY.toFixed(1)}px`)
      })

      ticking = false
    }

    const requestUpdate = () => {
      if (!ticking) {
        window.requestAnimationFrame(update)
        ticking = true
      }
    }

    update()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    window.addEventListener('resize', requestUpdate)
    reduceQuery.addEventListener('change', requestUpdate)

    return () => {
      window.removeEventListener('scroll', requestUpdate)
      window.removeEventListener('resize', requestUpdate)
      reduceQuery.removeEventListener('change', requestUpdate)
    }
  }, [])

  return (
    <section
      aria-label="Scroll controlled Pong build path"
      className="pong-section"
      ref={sectionRef}
      style={{
        '--pong-section-height': pongSettings.sectionHeight,
        '--pong-ball-x': '50vw',
        '--pong-ball-y': '8vh',
        '--pong-left-paddle-y': '50vh',
        '--pong-right-paddle-y': '50vh',
        '--pong-rail-opacity': '0',
        '--scroll-progress': '0',
      }}
    >
      <div className="pong-background-words" aria-hidden="true">
        {backgroundWords.map((word) => (
          <span
            className={`pong-background-word pong-background-word-${word.side}`}
            key={word.text}
            style={{
              left: `${word.x}%`,
              top: `${word.y}%`,
            }}
          >
            {word.text}
          </span>
        ))}
      </div>
      <div className="pong-section-net" aria-hidden="true" />
      <div className="pong-focus-layer" aria-label="Dynamic website focus cards">
        {focusCards.map((card) => (
          <article
            className={`pong-focus-card pong-focus-card-${card.side}`}
            data-pong-focus-card
            data-hit-index={card.hitIndex}
            key={card.number}
            style={{
              '--focus-marker-width': '84px',
              '--focus-opacity': '0',
              '--focus-scale': '0.94',
              '--focus-top': '50vh',
              '--focus-x': '0px',
              '--focus-y': '36px',
            }}
          >
            <p className="pong-focus-kicker">{card.number} /</p>
            <h3>{card.title}</h3>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>
      <div className="pong-stage">
        <div className="pong-score" aria-hidden="true">
          <span>02</span>
          <span>03</span>
        </div>
        <div className="pong-mobile-copy-layer" aria-label="Dynamic website focus notes">
          {focusCards.map((card) => (
            <article
              className={`pong-mobile-copy pong-mobile-copy-${card.side}`}
              data-pong-mobile-card
              data-hit-index={card.hitIndex}
              key={card.number}
              style={{
                '--mobile-focus-opacity': '0',
                '--mobile-focus-scale': '0.95',
                '--mobile-focus-x': '50%',
                '--mobile-focus-y': '50%',
                '--mobile-focus-offset-x': '0px',
                '--mobile-focus-offset-y': '0px',
              }}
            >
              <p className="pong-focus-kicker">{card.number} /</p>
              <h3>{card.title}</h3>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
        <div className="pong-paddle pong-paddle-left" aria-hidden="true" />
        <div className="pong-paddle pong-paddle-right" aria-hidden="true" />
        <div className="pong-ball" aria-hidden="true" />
      </div>
    </section>
  )
}
