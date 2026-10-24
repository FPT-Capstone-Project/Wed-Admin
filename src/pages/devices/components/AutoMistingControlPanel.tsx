import { PlayCircleOutlined, StopOutlined, ThunderboltOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Flex,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useHasPermission } from '../../../features/auth/hooks/usePermission'
import { IOT_AUTOMATION_MANAGE } from '../../../features/auth/permissions'
import type { AutoControlEvaluateResult } from '../../../types/iot'

interface AutoMistingControlPanelProps {
  floorName: string
  /** `ACTIVE` khi run.status = 'RUNNING'. */
  runState: 'ACTIVE' | 'STOPPED' | null
  /** ISO timestamp — BE trả `run.started_at`. */
  startedAt: string | null
  /** ISO timestamp — BE trả `runtime.last_evaluated_at`. */
  lastEvaluationAt: string | null
  /** `true` khi BE chạy ở chế độ `dry_run` (không gửi lệnh thật). */
  dryRun?: boolean
  isLoadingStatus: boolean
  evaluateResult: AutoControlEvaluateResult | null
  isEvaluating: boolean
  isStarting: boolean
  isStopping: boolean
  onStart: () => void
  onStop: () => void
  onEvaluate: () => void
}

/** Định dạng ISO timestamp của BE sang "3 phút trước". */
function timeAgo(iso: string | null): string | null {
  if (!iso) return null
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return null

  const diffMs = Date.now() - time
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'vừa xong'
  if (mins < 60) return `${mins} phút trước`

  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} giờ trước`
  return `${Math.floor(hrs / 24)} ngày trước`
}

function formatClock(iso: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('vi-VN', { timeStyle: 'medium' }).format(date)
}

/**
 * Bảng điều khiển AUTO: Đánh giá (dry-run) / Bắt đầu / Dừng.
 *
 * Phân quyền: BE chặn bằng permission `iot.automation.manage`
 * (`middlewares/autoMisting.middleware.js`) cho start/stop/evaluate/put.
 * Nút bị disable (không ẩn) để người dùng hiểu vì sao không dùng được.
 */
export function AutoMistingControlPanel({
  runState,
  startedAt,
  lastEvaluationAt,
  dryRun = false,
  isLoadingStatus,
  evaluateResult,
  isEvaluating,
  isStarting,
  isStopping,
  onStart,
  onStop,
  onEvaluate,
}: AutoMistingControlPanelProps) {
  const canManage = useHasPermission(IOT_AUTOMATION_MANAGE)
  const isActive = runState === 'ACTIVE'

  const lastEvaluationLabel = timeAgo(lastEvaluationAt)

  return (
    <div className="auto-misting-control-panel">
      <Flex align="center" justify="space-between" gap={12} wrap>
        <Space wrap>
          <Typography.Text strong>Hệ thống tưới tự động</Typography.Text>
          {isLoadingStatus ? (
            <Skeleton.Input size="small" active />
          ) : (
            <Tag color={isActive ? 'success' : 'default'}>
              {isActive ? 'ĐANG CHẠY' : 'ĐÃ DỪNG'}
            </Tag>
          )}
          {isActive && dryRun && (
            <Tag color="warning" title="Không gửi lệnh thật tới thiết bị">
              CHẠY THỬ (dry-run)
            </Tag>
          )}
        </Space>

        {isActive && lastEvaluationLabel && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Đánh giá lần cuối: {lastEvaluationLabel}
          </Typography.Text>
        )}

        <Space>
          <Tooltip title="Chạy thuật toán một lần, không gửi lệnh thật">
            <Button
              size="small"
              icon={<ThunderboltOutlined />}
              loading={isEvaluating}
              disabled={!canManage}
              onClick={onEvaluate}
            >
              Đánh giá &amp; Chạy thử
            </Button>
          </Tooltip>

          {isActive ? (
            <Tooltip title="Dừng vận hành tự động">
              <Button
                size="small"
                danger
                icon={<StopOutlined />}
                loading={isStopping}
                disabled={!canManage}
                onClick={onStop}
              >
                Dừng AUTO
              </Button>
            </Tooltip>
          ) : (
            <Tooltip title="Bắt đầu vận hành tự động">
              <Button
                size="small"
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={isStarting}
                disabled={!canManage}
                onClick={onStart}
              >
                Bắt đầu Tự động
              </Button>
            </Tooltip>
          )}
        </Space>
      </Flex>

      {/* Kết quả đánh giá: quyết định + lý do + số đo thật từ BE */}
      {evaluateResult && (
        <Alert
          type={
            evaluateResult.decision.action === 'ON'
              ? 'success'
              : evaluateResult.decision.action === 'FAULT'
                ? 'error'
                : 'info'
          }
          showIcon
          style={{ marginTop: 8 }}
          message={
            <Space wrap size={6}>
              <span>
                Quyết định:{' '}
                {evaluateResult.decision.action === 'ON'
                  ? 'BẬT tưới'
                  : evaluateResult.decision.action === 'OFF'
                    ? 'TẮT tưới'
                    : evaluateResult.decision.action === 'FAULT'
                      ? 'LỖI — dừng an toàn'
                      : 'KHÔNG hành động'}
              </span>
              <Tag>{evaluateResult.decision.state}</Tag>
            </Space>
          }
          description={
            <Space direction="vertical" size={4} style={{ fontSize: 12 }}>
              <Typography.Text>
                <strong>Lý do:</strong> {evaluateResult.decision.reason}
              </Typography.Text>
              {evaluateResult.metrics && (
                <Typography.Text type="secondary">
                  Độ ẩm TB:{' '}
                  {evaluateResult.metrics.avgHumidity?.toFixed(1) ?? '—'}%RH ·
                  Chênh lệch:{' '}
                  {evaluateResult.metrics.spreadPercent?.toFixed(1) ?? '—'}% ·
                  Sensor hợp lệ: {evaluateResult.metrics.validSensors}/3
                </Typography.Text>
              )}
              <Typography.Text type="secondary">
                Chế độ dry-run — không có lệnh nào được gửi tới thiết bị.
              </Typography.Text>
            </Space>
          }
        />
      )}

      {isActive && startedAt && (
        <Typography.Text
          type="secondary"
          style={{ display: 'block', marginTop: 6, fontSize: 12 }}
        >
          Bắt đầu lúc {formatClock(startedAt)}
        </Typography.Text>
      )}
    </div>
  )
}