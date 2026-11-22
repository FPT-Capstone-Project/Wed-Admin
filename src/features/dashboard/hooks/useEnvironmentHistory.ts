import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEnvironmentHistory } from '../api/environment-history.api'
import { retryApiErrors } from '../../../shared/api/retry-policy'
import { toChartFloors, toLatestEnvironment } from '../utils/environment-history.utils'
import {
  ENVIRONMENT_HISTORY_KEY, ENVIRONMENT_REFRESH_MS, environmentSessionRevision,
  readEnvironmentSnapshot, saveEnvironmentSnapshot,
} from '../utils/environment-history-snapshot'

/** Only the layout owns the timer. Dashboard observes the same query without fetching on mount. */
export function useEnvironmentHistory({ enabled = true, background = true } = {}) {
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ENVIRONMENT_HISTORY_KEY,
    queryFn: async ({ signal }) => {
      const revision = environmentSessionRevision()
      const data = await fetchEnvironmentHistory({}, signal)
      if (!signal.aborted) saveEnvironmentSnapshot(data, revision)
      return data
    },
    enabled: enabled && background,
    initialData: () => readEnvironmentSnapshot()?.data,
    initialDataUpdatedAt: () => readEnvironmentSnapshot()?.savedAt,
    staleTime: ENVIRONMENT_REFRESH_MS,
    gcTime: 30 * 60 * 1000,
    refetchInterval: enabled && background ? ENVIRONMENT_REFRESH_MS : false,
    refetchIntervalInBackground: true,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: retryApiErrors,
  })
  const { refetch } = query

  useEffect(() => {
    if (!enabled || !background) return
    const state = client.getQueryState(ENVIRONMENT_HISTORY_KEY)
    // refetchOnMount is deliberately false; restore stale snapshots immediately in the background.
    if (state?.data && Date.now() - state.dataUpdatedAt >= ENVIRONMENT_REFRESH_MS && state.fetchStatus === 'idle') {
      void refetch({ cancelRefetch: false })
    }
  }, [enabled, background, client, refetch])

  useEffect(() => {
    if (!enabled || !background) return
    return () => { void client.cancelQueries({ queryKey: ENVIRONMENT_HISTORY_KEY, exact: true }) }
  }, [enabled, background, client])

  return query
}

export { toChartFloors, toLatestEnvironment }
export type { EnvironmentChartFloor, FloorLatestEnvironment } from '../utils/environment-history.utils'
