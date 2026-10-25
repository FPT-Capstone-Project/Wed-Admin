import {
  CheckCircleOutlined,
  InboxOutlined,
  SettingOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Button, Card, Col, Empty, Flex, Row, Skeleton, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { TrayStatus } from '../../../types/room.types'
import { tokens } from '../../../app/theme/tokens'
import { StatusBadge } from '../../../shared/ui/StatusBadge'
import { RackView } from '../components/RackView'
import { TrayDetailDrawer } from '../components/TrayDetailDrawer'
import { RoomsTraysAdminPanel } from '../components/RoomsTraysAdminPanel'
import { useTiersWithEnvironment } from '../hooks/useTiersWithEnvironment'

// ── Cấu hình legend 4 trạng thái (dùng tokens) ──────────────────────────────
interface LegendItem {
  status: TrayStatus
  label: string
  tone: 'ok' | 'warning' | 'danger' | 'muted'
}
const LEGEND_ITEMS: LegendItem[] = [
  { status: 'rented',      label: 'Đang thuê',           tone: 'ok' },
  { status: 'harvesting',  label: 'Chờ thu hoạch',        tone: 'warning' },
  { status: 'maintenance', label: 'Nhiễm bệnh / Cách ly', tone: 'danger' },
  { status: 'empty',       label: 'Khay trống',           tone: 'muted' },
]

// ── StatCard nhỏ gọn ─────────────────────────────────────────────────────────
interface MiniStatProps {
  icon: React.ReactNode
  label: string
  value: number | string
  loading: boolean
  accentColor?: string
  accentBg?: string
}
function MiniStat({ icon, label, value, loading, accentColor, accentBg }: MiniStatProps) {
  return (
    <div
      style={{
        backgroundColor: tokens.color.surface,
        border: `1px solid ${tokens.color.border}`,
        borderRadius: tokens.radius.lg,
        padding: `${tokens.space['3']} ${tokens.space['4']}`,
        boxShadow: tokens.shadow.xs,
        display: 'flex',
        alignItems: 'center',
        gap: tokens.space['3'],
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: tokens.radius.md,
          backgroundColor: accentBg ?? tokens.color.surfaceMuted,
          color: accentColor ?? tokens.color.textMuted,
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div>
        <div
          style={{
            fontSize: 11,
            color: tokens.color.textMuted,
            marginBottom: 1,
            lineHeight: 1.2,
          }}
        >
          {label}
        </div>
        {loading ? (
          <Skeleton.Input active size="small" style={{ width: 40, height: 20 }} />
        ) : (
          <div
            style={{
              fontSize: 22,
              fontWeight: tokens.typography.weightBold,
              color: accentColor ?? tokens.color.text,
              lineHeight: 1,
              fontFamily: tokens.typography.fontNumeric,
            }}
          >
            {value}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export function RoomListPage() {
  const navigate = useNavigate()
  const { id = null } = useParams<{ id: string }>()
  const [showAdminPanel, setShowAdminPanel] = useState(false)

  const { tiersWithEnv, isLoading, refetch } = useTiersWithEnvironment()

  const tiers = useMemo(
    () => tiersWithEnv.map((t) => t.tier),
    [tiersWithEnv],
  )

  const tiersError = false
  const tiersErrorMessage: string | null = null

  const summary = useMemo(() => {
    const trays = tiers.flatMap((t) => t.trays)
    return {
      total: trays.length,
      empty: trays.filter((t) => t.status === 'empty').length,
      occupied: trays.filter(
        (t) => t.status === 'rented' || t.status === 'harvesting',
      ).length,
      attention: trays.filter((t) => t.status === 'maintenance').length,
    }
  }, [tiers])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.space['5'] }}>

      {/* ── Page header ──────────────────────────────────────────────── */}
      <Flex align="flex-start" justify="space-between" gap={16} wrap>
        <div>
          <Typography.Title
            level={3}
            style={{ margin: 0, color: tokens.color.text }}
          >
            Quản lý khay nấm
          </Typography.Title>
          <Typography.Text style={{ color: tokens.color.textMuted, fontSize: 13 }}>
            {tiers.length} tầng nuôi &middot; {summary.total} khay
          </Typography.Text>
        </div>

        <Flex gap={8} wrap align="center">
          {/* Legend 4 trạng thái */}
          {LEGEND_ITEMS.map((item) => (
            <StatusBadge
              key={item.status}
              tone={item.tone}
              label={item.label}
            />
          ))}

          <Button
            icon={<SettingOutlined />}
            type={showAdminPanel ? 'primary' : 'default'}
            onClick={() => setShowAdminPanel((prev) => !prev)}
            style={{ minHeight: tokens.targetSize.control }}
          >
            {showAdminPanel ? 'Ẩn quản trị' : 'Quản trị'}
          </Button>
        </Flex>
      </Flex>

      {/* ── Stat cards ───────────────────────────────────────────────── */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <MiniStat
            icon={<ToolOutlined />}
            label="Tổng khay"
            value={summary.total}
            loading={isLoading}
            accentColor={tokens.color.primary}
            accentBg={tokens.color.primarySoft}
          />
        </Col>
        <Col xs={12} sm={6}>
          <MiniStat
            icon={<InboxOutlined />}
            label="Còn trống"
            value={summary.empty}
            loading={isLoading}
          />
        </Col>
        <Col xs={12} sm={6}>
          <MiniStat
            icon={<CheckCircleOutlined />}
            label="Đang vận hành"
            value={summary.occupied}
            loading={isLoading}
            accentColor={tokens.tone.ok.text}
            accentBg={tokens.tone.ok.bg}
          />
        </Col>
        <Col xs={12} sm={6}>
          <MiniStat
            icon={<WarningOutlined />}
            label="Cần chú ý"
            value={summary.attention}
            loading={isLoading}
            accentColor={summary.attention > 0 ? tokens.tone.danger.text : tokens.color.textMuted}
            accentBg={summary.attention > 0 ? tokens.tone.danger.bg : tokens.color.surfaceMuted}
          />
        </Col>
      </Row>

      {/* ── Rack / Error ──────────────────────────────────────────────── */}
      {tiersError ? (
        <Empty
          description={
            <Flex vertical align="center" gap={8}>
              <Typography.Text type="danger">
                Không tải được dữ liệu kệ nấm từ máy chủ.
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {tiersErrorMessage ?? 'Lỗi không xác định.'}
              </Typography.Text>
              <Typography.Text
                type="secondary"
                style={{ fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => void refetch()}
              >
                Nhấn để thử lại
              </Typography.Text>
            </Flex>
          }
        />
      ) : (
        <RackView
          tiers={tiers}
          selectedTrayId={id}
          onSelectTray={(tray) => navigate(`/rooms/${tray.id}`)}
        />
      )}

      {/* ── Admin panel (collapsible) ─────────────────────────────────── */}
      {showAdminPanel && (
        <Card
          style={{ borderColor: tokens.color.border }}
          styles={{ body: { padding: tokens.space['5'] } }}
        >
          <RoomsTraysAdminPanel onChanged={() => { void refetch() }} />
        </Card>
      )}

      {/* ── Drawer ───────────────────────────────────────────────────── */}
      <TrayDetailDrawer
        trayId={id}
        onClose={() => navigate('/rooms', { replace: true })}
      />
    </div>
  )
}