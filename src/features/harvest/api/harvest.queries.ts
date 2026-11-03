import { useQuery } from '@tanstack/react-query'
import { harvestApi, type HarvestQuery } from './harvest.api'
export const useHarvests = (filters: HarvestQuery) => useQuery({ queryKey: ['harvests', 'list', filters], queryFn: () => harvestApi.list(filters) })
export const useHarvest = (id: number) => useQuery({ queryKey: ['harvests', 'detail', id], queryFn: () => harvestApi.detail(id) })
