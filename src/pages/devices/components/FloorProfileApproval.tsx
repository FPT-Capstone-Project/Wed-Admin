import { CheckOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  Alert,
  App,
  Button,
  Flex,
  Progress,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  useFloorAutoControlSuggestions,
  useSaveAutoControlConfig,
} from '../../../features/devices/hooks/useIoT'
import { IOT_AUTOMATION_MANAGE } from '../../../features/auth/permissions'
import { useHasPermission } from '../../../features/auth/hooks/usePermission'
import { getApiErrorMessage } from '../../../shared/api/error'
import type {
  AutoMistingConfiguration,
  AutoControlSuggestionProfile,
} from '../../../types/iot'

interface FloorProfileApprovalProps {
  floorId: number | null
  /** Config đang chạy — dùng để biết đã duyệt chưa. */
  config: AutoMistingConfiguration | null
}

const METRICS = [
  {
    key: 'temperature',
    label: 'Nhiệt độ',
    unit: '℃',
    min: -40,
    max: 80,
    color: '#f97316',
  },
  {
    key: 'humidity',
    label: 'Độ ẩm',
    unit: '%',
    min: 0,
    max: 100,
    color: '#0ea5e9',
  },
] as const

type MetricKey = (typeof METRICS)[number]['key']

function metricValue(
  profile: AutoControlSuggestionProfile,
  metric: MetricKey,
  bound: 'min' | 'max',
): number | null {
  const value = profile[`${metric}_${bound}`]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * Dải min–max của một chỉ số, vẽ trên thang 0–100 (hoặc -40–80 cho nhiệt độ).
 *
 * Mỗi profile nguồn là một đoạn; phần giao của tất cả (`common`) được tô đậm.
 * Nhờ vậy operator thấy ngay khoảng nào dùng chung được cho mọi mẻ trên sàn.
 */
function RangeBand({
  profiles,
  common,
  metric,
  color,
  min: scaleMin,
  max: scaleMax,
  unit,
}: {
  profiles: AutoControlSuggestionProfile[]
  common: Record<string, number | null> | null | undefined
  metric: MetricKey
  color: string
  min: number
  max: number
  unit: string
}) {
  const toPercent = (value: number) =>
    Math.min(
      100,
      Math.max(0, ((value - scaleMin) / (scaleMax - scaleMin)) * 100),
    )

  const commonMin = common?.[`${metric}_min`]
  const commonMax = common?.[`${metric}_max`]

  return (
    <div style={{ marginBottom: 12 }}>
      <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
        <Typography.Text style={{ fontSize: 13 }}>{metric === 'temperature' ? 'Nhiệt độ' : 'Độ ẩm'}</Typography.Text>
        {typeof commonMin === 'number' && typeof commonMax === 'number' && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Dùng chung: {commonMin}–{commonMax}
            {unit}
          </Typography.Text>
        )}
      </Flex>

      {/* Các profile nguồn xếp chồng */}
      {profiles.map((profile, index) => {
        const lo = metricValue(profile, metric, 'min')
        const hi = metricValue(profile, metric, 'max')
        if (lo === null || hi === null) return null

        return (
          <Tooltip
            key={`${profile.mushroomTypeId ?? 'p'}-${index}`}
            title={`${profile.profileName ?? 'Profile'} · ${lo}–${hi}${unit}`}
          >
            <div
              style={{
                position: 'relative',
                height: 6,
                marginBottom: 3,
                background: '#f1f5f9',
                borderRadius: 3,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: `${toPercent(lo)}%`,
                  width: `${toPercent(hi) - toPercent(lo)}%`,
                  height: '100%',
                  background: color,
                  opacity: 0.45,
                  borderRadius: 3,
                }}
              />
            </div>
          </Tooltip>
        )
      })}

      {/* Khoảng giao chung — phần quan trọng nhất */}
      {typeof commonMin === 'number' && typeof commonMax === 'number' && (
        <Progress
          percent={100}
          showInfo={false}
          strokeColor={color}
          trailColor="#f1f5f9"
          size={['100%', 10]}
          style={{ marginTop: 4 }}
          format={() => (
            <Typography.Text style={{ fontSize: 11, color: '#475569' }}>
              {commonMin}–{commonMax}
              {unit}
            </Typography.Text>
          )}
        />
      )}
    </div>
  )
}

/**
 * Duyệt profile sàn cho nhánh `config_source: 'FLOOR'`.
 *
 * BE (`autoMisting.profile.js`) gợi ý: nếu `issues` rỗng thì `config` khác
 * null, với `profile_approved: false`. Muốn bật AUTO, operator phải xem lại
 * xung/cooldown rồi bấm duyệt — BE từ chối start nếu profile chưa duyệt (409).
 *
 * ⚠ `assertCompatible` còn kiểm tra `source_profiles` khớp với DB; nếu điều kiện
 * canh tác của các khay thay đổi sau khi duyệt, BE trả 409 và yêu cầu duyệt
 * lại — vì vậy panel luôn hiển thị nút tải lại để lấy profile mới nhất.
 */
export function FloorProfileApproval({
  floorId,
  config,
}: FloorProfileApprovalProps) {
  const { message } = App.useApp()
  const canManage = useHasPermission(IOT_AUTOMATION_MANAGE)

  const {
    data: suggestions,
    isLoading,
    isFetching,
    refetch,
  } = useFloorAutoControlSuggestions(floorId, {
    enabled: floorId !== null && floorId > 0,
  })

  const saveMutation = useSaveAutoControlConfig({
    onSuccess: () => {
      message.success('Đã duyệt & áp dụng profile sàn.')
    },
    onError: (err) => message.error(getApiErrorMessage(err)),
  })

  const handleApprove = () => {
    const suggested = suggestions?.config
    if (!suggested) return

    saveMutation.mutate({
      floorId: floorId as number,
      payload: {
        ...config,
        ...suggested,
        // Giữ các tham số an toàn người dùng đã chỉnh, chỉ duyệt profile.
        profile_approved: true,
      },
    })
  }

  if (floorId === null) return null

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 4 }} />
  }

  const issues = suggestions?.issues ?? []
  const warnings = suggestions?.warnings ?? []
  const profiles = suggestions?.sourceProfiles ?? []
  const suggestedConfig = suggestions?.config
  const isApproved = config?.config_source === 'FLOOR' && config?.profile_approved === true
  const hasBlockers = issues.length > 0 || suggestedConfig === null

  return (
    <Flex vertical gap={12}>
      <Flex align="center" justify="space-between" gap={12} wrap>
        <Space wrap>
          <Typography.Text strong>Profile canh tác của sàn</Typography.Text>
          {config?.config_source === 'FLOOR' ? (
            isApproved ? (
              <Tag color="success" icon={<CheckOutlined />}>
                Đã duyệt
              </Tag>
            ) : (
              <Tag color="warning">Chưa duyệt</Tag>
            )
          ) : (
            <Tag color="default">Đang dùng cấu hình thủ công</Tag>
          )}
        </Space>

        <Button
          size="small"
          icon={<ReloadOutlined />}
          loading={isFetching}
          onClick={() => void refetch()}
        >
          Tải lại
        </Button>
      </Flex>

      {issues.map((issue, index) => (
        <Alert
          key={index}
          type="error"
          showIcon
          message={
            typeof issue.message === 'string' ? issue.message : 'Không đủ dữ liệu'
          }
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {issues.map((entry, i) => (
                <li key={i}>{entry.message ?? 'Điều kiện canh tác chưa đầy đủ.'}</li>
              ))}
            </ul>
          }
        />
      ))}

      {!hasBlockers && profiles.length > 0 && (
        <div
          style={{
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 14,
          }}
        >
          {METRICS.map((m) => (
            <RangeBand
              key={m.key}
              profiles={profiles}
              common={suggestions?.common}
              metric={m.key}
              color={m.color}
              min={m.min}
              max={m.max}
              unit={m.unit}
            />
          ))}

          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Nguồn:{' '}
            {profiles
              .map(
                (p) =>
                  `${p.profileName ?? `Loại #${p.mushroomTypeId ?? '?'}`} (${p.trayCount ?? 0} khay)`,
              )
              .join(' · ')}
          </Typography.Text>
        </div>
      )}

      {warnings.map((warning, index) => (
        <Alert
          key={index}
          type="warning"
          showIcon
          message={warning}
        />
      ))}

      <Flex justify="flex-end" gap={8} wrap>
        <Button
          type="primary"
          icon={<CheckOutlined />}
          disabled={hasBlockers || !canManage}
          loading={saveMutation.isPending}
          onClick={handleApprove}
        >
          Duyệt &amp; Áp dụng Profile
        </Button>
      </Flex>

      {hasBlockers && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Chưa thể duyệt: cần có phiên trồng ACTIVE gắn với vụ thuê ACTIVE trên
          cùng sàn, và mọi mẻ phải có khoảng điều kiện giao nhau.
        </Typography.Text>
      )}
    </Flex>
  )
}