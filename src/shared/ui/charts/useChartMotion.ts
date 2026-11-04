import { useSyncExternalStore } from 'react'

const query = '(prefers-reduced-motion: reduce)'
function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const media = window.matchMedia(query)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
function reducedMotion() {
  return typeof window === 'undefined' || !window.matchMedia ? true : window.matchMedia(query).matches
}
export function useChartMotion() {
  return !useSyncExternalStore(subscribe, reducedMotion, () => true)
}
