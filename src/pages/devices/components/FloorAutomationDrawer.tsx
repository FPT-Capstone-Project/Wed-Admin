import { ControlOutlined } from '@ant-design/icons'
import { App, Drawer, Flex, Space } from 'antd'
import { useMemo, useState } from 'react'
import {
  useEvaluateAutoMisting,
  useFloorAutoControlStatus,
  useFloorConfig,
  useStartAutoMisting,
  useStopAutoMisting,
} from '../../../features/devices/hooks/useIoT'
import type { AutoControlEvaluateResult } from '../../../types/iot'
import { AutoControlLogsTable } from './AutoControlLogsTable'
import { AutoMistingControlPanel } from './AutoMistingControlPanel'
import { FloorProfileApproval } from './FloorProfileApproval'

interface FloorAutomationDrawerProps {
  /** Định danh tầng của BE = `cultivation_floors.floor_id`. */
  floorId: number | null
  floorName: string
  open: boolean
  onClose: () => void
}

/**
 * Drawer điều khiển hệ thống tưới tự động của một tầng.
 *
 * Gom 3 phần backend thật vào 1 chỗ:
 *  1. `AutoMistingControlPanel` — đánh giá dry-run / bắt đầu / dừng AUTO
 *     (`POST /api/iot/floors/{floorId}/auto-control/{start,stop,evaluate}`).
 *  2. `FloorProfileApproval` — duyệt profile sàn
 *     (`GET .../auto-control/suggestions` + `PUT .../auto-control`).
 *  3. `AutoControlLogsTable` — lịch sử quyết định
 *     (`GET .../auto-control/logs`).
 *
 * ⚠ `floorId` là `floor_id` của BE, **không** phải `room_id`.
 */
export function FloorAutomationDrawer({
  floorId,
  floorName,
  open,
  onClose,
}: FloorAutomationDrawerProps) {
  const { message } = App.useApp()
  const [evaluateResult, setEvaluateResult] = useState<AutoControlEvaluateResult | null>(
    null,
  )

  const {
    data: runtimeStatus,
    isLoading: statusLoading,
  } = useFloorAutoControlStatus(floorId, {
    enabled: open,
    staleTime: 5_000,
  })

  /** Config đang lưu của tầng — nguồn cho panel Duyệt Profile. */
  const { data: floorConfig } = useFloorConfig(floorId, {
    enabled: open,
  })

  const startMutation = useStartAutoMisting({
    onSuccess: () => {
      message.success(`Đã bắt đầu tưới tự động cho ${floorName}.`)
    },
    onError: (err) => {
      message.error(`Lỗi bắt đầu AUTO: ${err.message}`)
    },
  })

  const stopMutation = useStopAutoMisting({
    onSuccess: () => {
      message.success(`Đã dừng tưới tự động cho ${floorName}.`)
      setEvaluateResult(null)
    },
    onError: (err) => {
      message.error(`Lỗi dừng AUTO: ${err.message}`)
    },
  })

  const evaluateMutation = useEvaluateAutoMisting({
    onSuccess: (result) => {
      setEvaluateResult(result)
    },
    onError: (err) => {
      message.error(`Lỗi đánh giá: ${err.message}`)
    },
  })

  const runState = useMemo<'ACTIVE' | 'STOPPED'>(
    () => (runtimeStatus?.run?.status === 'RUNNING' ? 'ACTIVE' : 'STOPPED'),
    [runtimeStatus],
  )

  return (
    <Drawer
      title={
        <Space>
          <ControlOutlined />
          <span>Điều khiển tưới tự động · {floorName}</span>
        </Space>
      }
      open={open}
      onClose={onClose}
      width={720}
      destroyOnHidden
    >
      <Flex vertical gap={16}>
        <AutoMistingControlPanel
          floorName={floorName}
          runState={runState}
          startedAt={runtimeStatus?.run?.started_at ?? null}
          lastEvaluationAt={runtimeStatus?.runtime?.last_evaluated_at ?? null}
          dryRun={runtimeStatus?.run?.dry_run ?? false}
          isLoadingStatus={statusLoading}
          evaluateResult={evaluateResult}
          isEvaluating={evaluateMutation.isPending}
          isStarting={startMutation.isPending}
          isStopping={stopMutation.isPending}
          onStart={() => startMutation.mutate(floorId as number)}
          onStop={() => stopMutation.mutate(floorId as number)}
          onEvaluate={() => evaluateMutation.mutate(floorId as number)}
        />

        <FloorProfileApproval
          floorId={floorId}
          config={floorConfig ?? null}
        />

        <AutoControlLogsTable floorId={floorId} />
      </Flex>
    </Drawer>
  )
}
