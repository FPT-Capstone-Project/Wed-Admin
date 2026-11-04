import { useQuery, useQueryClient } from '@tanstack/react-query'
import { iotApi } from '../../devices/api/iot.api'
import { iotKeys } from '../../devices/hooks/useIoT'
import { aggregateFloorHistory, type SensorSample } from '../utils/floor-history.utils'

export function useFloorHistory(masterId: string | null, nodeId: number, sensorIds: number[], from: number, to: number) {
  const client = useQueryClient()
  return useQuery({
    queryKey: ['dashboard-floor-history', masterId, nodeId, sensorIds, from, to],
    enabled: masterId != null && sensorIds.length > 0,
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: async () => {
      const results = await Promise.allSettled(sensorIds.map(async sensorId => {
        const samples: SensorSample[] = []
        for (let offset = 0; ; offset += 1000) {
          const params = { from: new Date(from).toISOString(), to: new Date(to).toISOString(), limit: 1000, offset }
          const response = await client.fetchQuery({
            queryKey: [...iotKeys.history(masterId!, nodeId, sensorId), params],
            queryFn: () => iotApi.getHistory(masterId!, nodeId, sensorId, params),
            staleTime: 5 * 60_000,
            gcTime: 5 * 60_000,
            retry: false,
          })
          const readings = response?.readings ?? []
          samples.push(...readings.map(reading => ({ ...reading, sensorId })))
          if (readings.length < 1000) break
          if (offset >= 1_000_000) throw new Error('Lịch sử vượt giới hạn phân trang của API')
        }
        return samples
      }))
      const samples = results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
      return { points: aggregateFloorHistory(samples, from, to), failedSensors: results.filter(result => result.status === 'rejected').length }
    },
  })
}
