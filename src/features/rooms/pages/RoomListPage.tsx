import '../rooms-industrial.css'
import { RoomAdministration } from '../components/RoomAdministration'
import {
  CheckCircleOutlined,
  InboxOutlined,
  ReloadOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { Suspense, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Tier, Tray } from '../../../types/room.types'
import { tokens } from '../../../app/theme/tokens'
import { ActionButton, EmptyState, PageHeader, StatCard, StatGrid } from '../../../shared/ui'
import { getApiErrorMessage } from '../../../shared/api/error'
import { RackView } from '../components/RackView'
import { TrayAttentionBanner, type AttentionTray } from '../components/TrayAttentionBanner'
import { TrayDetailDrawer } from '../../../app/router/lazy-modals'
import { TrayStatusLegend } from '../components/TrayStatusLegend'
import { useTiersWithEnvironment } from '../hooks/useTiersWithEnvironment'
import { useTraySessionSummaries } from '../hooks/useTraySessionSummaries'
import { formatTrayCode } from '../../../shared/i18n/terms'
import type { ClimateThresholds } from '../utils/tray-climate.utils'

// ── Page ─────────────────────────────────────────────────────────────────────
export function RoomListPage() {
  const navigate = useNavigate()
  const { id = null } = useParams<{ id: string }>()

  const { tiersWithEnv, floorLayouts, isLoading, isError, error, refetch } =
    useTiersWithEnvironment()
  const sessionSummaries = useTraySessionSummaries()

  const tiers = useMemo(
    () => tiersWithEnv.map((t) => t.tier),
    [tiersWithEnv],
  )

  const tiersError = isError
  const tiersErrorMessage: string | null = isError
    ? getApiErrorMessage(error)
    : null

  const summary = useMemo(() => {
    const trays = tiers.flatMap((t) => t.trays)
    return {
      total: trays.length,
      empty: trays.filter((t) => t.status === 'empty').length,
      occupied: trays.filter(
        (t) => t.status === 'rented' || t.status === 'harvesting',
      ).length,
    }
  }, [tiers])

  /**
   * Khay cần người dùng xử lý — nhiễm bệnh/cách ly + chờ thu hoạch.
   * Đây là câu trả lời trực tiếp cho "khay nào cần xử lý".
   *
   * "Chờ thu hoạch" được suy ra từ phiên canh tác đang chạy đã tới mốc
   * thu hoạch (BE không có trạng thái khay này — xem `useTraySessionSummaries`).
   */
  const attentionTrays = useMemo<AttentionTray[]>(() => {
    const result: AttentionTray[] = []

    for (const tier of tiers) {
      for (const tray of tier.trays) {
        const session = sessionSummaries.get(Number(tray.id))

        if (tray.status === 'maintenance') {
          result.push({
            id: tray.id,
            code: formatTrayCode(tray.code),
            kind: 'maintenance',
            customerName: session?.customerName ?? null,
            expectedHarvestDate: session?.expectedHarvestDate ?? null,
          })
          continue
        }

        if (tray.status === 'harvesting') {
          result.push({
            id: tray.id,
            code: formatTrayCode(tray.code),
            kind: 'harvesting',
            customerName: session?.customerName ?? null,
            expectedHarvestDate: session?.expectedHarvestDate ?? null,
          })
          continue
        }

        if (tray.status === 'rented' && session?.harvestDue) {
          result.push({
            id: tray.id,
            code: formatTrayCode(tray.code),
            kind: 'harvesting',
            customerName: session.customerName,
            expectedHarvestDate: session.expectedHarvestDate,
          })
        }
      }
    }

    // Nhiễm bệnh trước, chờ thu hoạch sau.
    return result.sort((a, b) =>
      a.kind === b.kind ? 0 : a.kind === 'maintenance' ? -1 : 1,
    )
  }, [tiers, sessionSummaries])

  /** Ngưỡng canh tác theo tầng — lấy từ BE `/environment`. */
  const thresholdsByTier = useMemo(() => {
    const map = new Map<Tier['tierId'], ClimateThresholds>()
    for (const entry of tiersWithEnv) {
      if (entry.thresholds) map.set(entry.tier.tierId, entry.thresholds)
    }
    return map
  }, [tiersWithEnv])

  /**
   * Số đo môi trường THẬT theo tầng.
   *
   * Không dùng `tier.telemetry` vì giá trị đó fallback về `DEFAULT_TELEMETRY`
   * (24.5°C / 85%RH — số giả). Hiển thị số giả kèm màu cảnh báo khiến người
   * dùng tưởng tầng đang vượt ngưỡng.
   */
  const liveReadings = useMemo(() => {
    const map = new Map<
      Tier['tierId'],
      { temperature: number | null; humidity: number | null }
    >()
    for (const entry of tiersWithEnv) {
      map.set(entry.tier.tierId, {
        temperature: entry.liveTemperature,
        humidity: entry.liveHumidity,
      })
    }
    return map
  }, [tiersWithEnv])

  const handleSelectTray = (tray: Tray) => navigate(`/rooms/${tray.id}`)

  return (
    <div className="mcms-rooms-view" style={{ display: 'flex', flexDirection: 'column', gap: tokens.space['4'] }}>

      {/* ── Page header ──────────────────────────────────────────────── */}

      <PageHeader
        title="Quản lý khay nấm"
        description={`${tiers.length} tầng nuôi · ${summary.total} khay`}
      />

      <RoomAdministration />
      {/* ── Legend nhỏ — chú thích trạng thái, không phải nút bấm ───── */}
      <TrayStatusLegend />

      {/* ── Dải cảnh báo: khay cần xử lý ────────────────────────────── */}
      {!isLoading && (
        <TrayAttentionBanner
          trays={attentionTrays}
          onSelectTray={(trayId) => navigate(`/rooms/${trayId}`)}
        />
      )}

      {/* ── Stat cards (bỏ "Cần chú ý" — đã lên dải cảnh báo) ───────── */}
      <StatGrid columns={3}>
        <StatCard
          title="Tổng khay"
          value={summary.total}
          suffix="khay"
          tone="neutral"
          icon={<ToolOutlined />}
          description="Toàn bộ khay của các tầng nuôi"
        />
        <StatCard
          title="Đang thuê"
          value={summary.occupied}
          suffix="khay"
          tone="ok"
          highlightValue
          icon={<CheckCircleOutlined />}
          description="Đang có phiên canh tác chạy"
        />
        <StatCard
          title="Còn trống"
          value={summary.empty}
          suffix="khay"
          tone="muted"
          icon={<InboxOutlined />}
          description="Sẵn sàng gán cho vụ thuê mới"
        />
      </StatGrid>

      {/* ── Rack / Error ──────────────────────────────────────────────── */}
      {tiersError ? (
        <EmptyState
          title="Không tải được dữ liệu kệ nấm"
          description={tiersErrorMessage ?? 'Lỗi không xác định.'}
          action={
            <ActionButton
              icon={<ReloadOutlined />}
              label="Thử lại"
              description="Tải lại danh sách kệ nấm từ máy chủ."
              variant="primary"
              size="middle"
              onClick={() => void refetch()}
            />
          }
        />
      ) : (
        <RackView
          tiers={tiers}
          floorLayouts={floorLayouts}
          selectedTrayId={id}
          onSelectTray={handleSelectTray}
          thresholdsByTier={thresholdsByTier}
          sessionSummaries={sessionSummaries}
          liveReadings={liveReadings}
        />
      )}

      {/* ── Drawer ───────────────────────────────────────────────────── */}
            <Suspense fallback={null}>
              <TrayDetailDrawer
              trayId={id}
              onClose={() => navigate('/rooms', { replace: true })}
              />
            </Suspense>
    </div>
  )
}
