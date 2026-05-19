import { useEffect, useRef, useState } from 'react'

export default function FlyInBox({
  as: Element = 'div',
  children,
  className = '',
  delay = 0,
  once = true,
  rootMargin = '0px 0px -12% 0px',
  style,
  threshold = 0.2,
  trigger = 'viewport',
  ...props
}) {
  const boxRef = useRef(null)
  const [isReady, setIsReady] = useState(trigger === 'mount')
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const node = boxRef.current

    setIsReady(true)

    if (!node) {
      return undefined
    }

    if (trigger === 'mount') {
      const frame = window.requestAnimationFrame(() => setIsVisible(true))

      return () => window.cancelAnimationFrame(frame)
    }

    if (!('IntersectionObserver' in window)) {
      setIsVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)

          if (once) {
            observer.unobserve(entry.target)
          }
        } else if (!once) {
          setIsVisible(false)
        }
      },
      { rootMargin, threshold },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [once, rootMargin, threshold, trigger])

  const classNames = ['fly-in-box', className].filter(Boolean).join(' ')
  const flyInStyle = delay ? { ...style, '--fly-in-delay': `${delay}ms` } : style

  return (
    <Element
      {...props}
      ref={boxRef}
      className={classNames}
      data-ready={isReady ? 'true' : 'false'}
      data-visible={isVisible ? 'true' : 'false'}
      style={flyInStyle}
    >
      {children}
    </Element>
  )
}
