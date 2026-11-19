import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  const query = window.matchMedia('print')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}
export function useReportPrint() {
  return useSyncExternalStore(subscribe, () => window.matchMedia('print').matches, () => false)
}
