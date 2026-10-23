import { SyncOutlined } from '@ant-design/icons'
import { Alert, Button, Flex, Skeleton, Space, Tag, Typography } from 'antd'
import type { AutoControlEvaluateResult } from '../../../types/iot'

interface AutoMistingControlPanelProps {
  floorName: string
  /** ACTIVE | STOPPED */
  runState: 'ACTIVE' | 'STOPPED' | null
  /** Epoch ms */
  startedAt: number | null
  /** Epoch ms */
  lastEvaluationAt: number | null
  isLoadingStatus: boolean
  evaluateResult: AutoControlEvaluateResult | null
  isEvaluating: boolean
  isStarting: boolean
  isStopping: boolean
  onStart: () => void
  onStop: () => void
  onEvaluate: () => void
}

function formatDuration(ms: number) {
  const secs = Math.floor(ms / 1000)
  const mins = Math.floor(secs / 60)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}h ${mins % 60}m`
  if (mins > 0) return `${mins}m ${secs % 60}s`
  return `${secs}s`
}

export function AutoMistingControlPanel({
  runState,
  startedAt,
  lastEvaluationAt,
  isLoadingStatus,
  evaluateResult,
  isEvaluating,
  isStarting,
  isStopping,
  onStart,
  onStop,
  onEvaluate,
}: AutoMistingControlPanelProps) {
  const isActive = runState === 'ACTIVE'
  const now = Date.now()
  const uptimeMs = startedAt ? now - startedAt : null

  return (
    <div className="auto-misting-control-panel">
      <Flex align="center" justify="space-between" gap={12} wrap>
        {/* Status badge */}
        <Space>
          <Typography.Text strong>Hệ thống tưới tự động</Typography.Text>
          {isLoadingStatus ? (
            <Skeleton.Input size="small" active />
          ) : (
            <Tag color={isActive ? 'success' : 'default'}>
              {isActive ? 'ĐANG CHẠY' : 'ĐÃ DỪNG'}
            </Tag>
          )}
        </Space>

        {/* Runtime info */}
        {isActive && uptimeMs !== null && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            ⏱ Đã chạy {formatDuration(uptimeMs)}
            {lastEvaluationAt && (
              <> · Đánh giá lần cuối {formatDuration(now - lastEvaluationAt)} trước</>
            )}
          </Typography.Text>
        )}

        {/* Control buttons */}
        <Space>
          <Button
            size="small"
            icon={<SyncOutlined />}
            loading={isEvaluating}
            onClick={onEvaluate}
          >
            Đánh giá
          </Button>
          {isActive ? (
            <Button
              size="small"
              danger
              loading={isStopping}
              onClick={onStop}
            >
              Dừng AUTO
            </Button>
          ) : (
            <Button
              size="small"
              type="primary"
              loading={isStarting}
              onClick={onStart}
            >
              Bắt đầu AUTO
            </Button>
          )}
        </Space>
      </Flex>

      {/* Evaluate result */}
      {evaluateResult && (
        <Alert
          type={evaluateResult.matched ? 'success' : 'info'}
          showIcon
          style={{ marginTop: 8 }}
          message={
            evaluateResult.matched
              ? `Quyết định: BẬT tưới — ${evaluateResult.reason}`
              : `Quyết định: KHÔNG tưới — ${evaluateResult.reason}`
          }
          description={
            evaluateResult.metrics ? (
              <span style={{ fontSize: 11 }}>
                Độ ẩm TB: {evaluateResult.metrics.avgHumidity?.toFixed(1) ?? '—'}%RH ·{' '}
                Chênh lệch: {evaluateResult.metrics.spreadPercent?.toFixed(1) ?? '—'}% ·{' '}
                Sensor hợp lệ: {evaluateResult.metrics.validSensors}/3
              </span>
            ) : undefined
          }
        />
      )}
    </div>
  )
}
