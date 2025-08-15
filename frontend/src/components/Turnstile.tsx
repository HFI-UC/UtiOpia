import React, { useRef, useEffect } from 'react'

interface TurnstileProps {
  siteKey?: string
  onVerified: (token: string) => void
  className?: string
}

export function Turnstile({ siteKey, onVerified, className }: TurnstileProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<number | null>(null)
  let widgetId: any = null

  const actualSiteKey = siteKey || (import.meta.env.VITE_TURNSTILE_SITE_KEY as string)

  const renderWidget = () => {
    if (!elementRef.current) return
    const turnstile = (window as any).turnstile
    if (!turnstile || typeof turnstile.render !== 'function') return
    
    try {
      widgetId = turnstile.render(elementRef.current, {
        sitekey: actualSiteKey,
        callback: (token: string) => onVerified(token),
      })
    } catch (error) {
      console.error('Failed to render Turnstile widget:', error)
    }
  }

  useEffect(() => {
    if ((window as any).turnstile?.render) {
      renderWidget()
    } else {
      intervalRef.current = window.setInterval(() => {
        if ((window as any).turnstile?.render) {
          window.clearInterval(intervalRef.current!)
          intervalRef.current = null
          renderWidget()
        }
      }, 120)
    }

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      const turnstile = (window as any).turnstile
      if (widgetId && turnstile && typeof turnstile.remove === 'function') {
        try { 
          turnstile.remove(widgetId) 
        } catch (error) {
          console.error('Failed to remove Turnstile widget:', error)
        }
      }
    }
  }, [actualSiteKey, onVerified])

  return <div ref={elementRef} className={className} />
}
