import { useStaffNames, type StaffNameMap } from '../../users/hooks/useStaffNames'

export type UserNameMap = StaffNameMap

/** Use the shared staff directory, including cached details for missing IDs. */
export function useConfiguratorNames(userId: number | null): UserNameMap {
  return useStaffNames([userId])
}
