import { LoadErrorAlert } from '../../../shared/ui/LoadErrorAlert'
import { Suspense, useMemo, useState } from 'react'
import { FilterOutlined, SearchOutlined } from '@ant-design/icons'
import {
  Button,
  Empty,
  Flex,
  Input,
  Pagination,
  Select,
  Skeleton,
  Typography,
} from 'antd'
import { MetadataBadge, StatCard } from '../../../shared/ui'
import { CultivationBatchCard } from '../components/CultivationBatchCard'
import { CultivationGalleryModal } from '../../../app/router/lazy-modals'
import { useCultivationBatches } from '../hooks/useCultivationBatches'
import {
  GROWTH_STAGE_META,
  type CultivationBatch,
  type GrowthStage,
  type SpawnHealthFilter,
} from '../types/cultivation.types'

const STAGE_OPTIONS = (
  Object.keys(GROWTH_STAGE_META) as GrowthStage[]
).map((value) => ({ value, label: GROWTH_STAGE_META[value].label }))

const HEALTH_OPTIONS: Array<{ value: SpawnHealthFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả sức khỏe' },
  { value: 'NORMAL', label: 'Bình thường' },
  { value: 'WARNING', label: 'Cần theo dõi' },
  { value: 'ABNORMAL', label: 'Bất thường' },
  { value: 'UNKNOWN', label: 'Chưa kiểm tra' },
]

const PAGE_SIZE = 4

/**
 * Trang Sinh trưởng & Thu hoạch — **100% READ-ONLY**.
 *
 * Dữ liệu thật từ:
 *   - `GET /api/farm/sessions` (tiến độ + giai đoạn + khách)
 *   - `GET /api/farm/sessions` (phôi đã cấp / còn lại)
 *   - `GET /api/farm/sessions/{id}/spawn-inspections` (lịch sử kiểm tra phôi +
 *     ảnh thực tế trên Cloudinary)
 *
 * ⚠ Không có nút chỉnh sửa / chuyển giai đoạn / ghi nhận kiểm tra phôi —
 *   các thao tác đó do nhân viên (staff) thực hiện trên mobile app.
 */
export function CultivationManagementPage() {
  const [searchText, setSearchText] = useState('')
  const [stageFilter, setStageFilter] = useState<GrowthStage | undefined>()
  const [mushroomFilter, setMushroomFilter] = useState<string | undefined>()
  const [healthFilter, setHealthFilter] = useState<SpawnHealthFilter>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [galleryBatch, setGalleryBatch] = useState<CultivationBatch | null>(null)

  const { data, isLoading, isError, error, refetch } = useCultivationBatches()

  const batches = useMemo(() => data?.batches ?? [], [data])
  const stats = data?.stats

  const mushroomOptions = useMemo(() => {
    const unique = new Set(
      batches.map((batch) => batch.mushroomType).filter(Boolean),
    )
    return [...unique].map((value) => ({ value, label: value }))
  }, [batches])

  const filteredBatches = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    return batches.filter((batch) => {
      const matchesSearch = keyword
        ? [
            batch.batchCode,
            batch.tenantName,
            batch.mushroomType,
            ...batch.trays.map((tray) => tray.code),
          ]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(keyword))
        : true
      const matchesStage = stageFilter
        ? batch.currentStage === stageFilter
        : true
      const matchesMushroom = mushroomFilter
        ? batch.mushroomType === mushroomFilter
        : true
      const matchesHealth =
        healthFilter === 'ALL' ? true : batch.healthStatus === healthFilter

      return matchesSearch && matchesStage && matchesMushroom && matchesHealth
    })
  }, [batches, healthFilter, mushroomFilter, searchText, stageFilter])

  const maxPage = Math.max(1, Math.ceil(filteredBatches.length / PAGE_SIZE))
  const visiblePage = Math.min(currentPage, maxPage)
  const visibleBatches = filteredBatches.slice(
    (visiblePage - 1) * PAGE_SIZE,
    visiblePage * PAGE_SIZE,
  )

  const hasFilters = Boolean(
    searchText || stageFilter || mushroomFilter || healthFilter !== 'ALL',
  )

  const resetFilters = () => {
    setSearchText('')
    setStageFilter(undefined)
    setMushroomFilter(undefined)
    setHealthFilter('ALL')
    setCurrentPage(1)
  }

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />
  }

  if (isError) return <LoadErrorAlert error={error} resource="dữ liệu sinh trưởng" onRetry={refetch} />

  return (
    <div>
      <Flex
        align="center"
        justify="space-between"
        gap={16}
        wrap
        style={{ marginBottom: 20 }}
      >
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Sinh trưởng & thu hoạch
          </Typography.Title>
          <Typography.Text type="secondary">
            Tiến độ mẻ nấm, giai đoạn sinh trưởng và lịch sử kiểm tra phôi (chỉ đọc)
          </Typography.Text>
        </div>

        <MetadataBadge
          icon={<FilterOutlined />}
          label="Chế độ chỉ đọc — dữ liệu từ API thật"
        />
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 20 }}>
        <StatCard
          title="Tổng mẻ canh tác"
          value={stats?.total ?? 0}
          tone="neutral"
          description="Phiên đang theo dõi trong hệ thống"
        />
        <StatCard
          title="Ảnh kiểm tra phôi"
          value={stats?.totalPhotos ?? 0}
          tone="info"
          description="Ảnh thực tế lưu trên Cloudinary"
        />
        <StatCard
          title="Lần kiểm tra phôi"
          value={stats?.totalInspections ?? 0}
          tone="ok"
          description="Tổng số lần nhân viên đã kiểm tra"
        />
        <StatCard
          title="Phôi bất thường"
          value={stats?.abnormalCount ?? 0}
          tone={stats?.abnormalCount ? 'danger' : 'ok'}
          highlightValue={Boolean(stats?.abnormalCount)}
          description="Cần cách ly và xử lý"
        />
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 20 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm mã mẻ, khách thuê hoặc mã khay"
          value={searchText}
          onChange={(event) => {
            setSearchText(event.target.value)
            setCurrentPage(1)
          }}
          style={{ width: 320, maxWidth: '100%' }}
        />

        <Select<GrowthStage>
          allowClear
          placeholder="Lọc theo giai đoạn"
          options={STAGE_OPTIONS}
          value={stageFilter}
          onChange={(value) => {
            setStageFilter(value)
            setCurrentPage(1)
          }}
          style={{ width: 200 }}
        />

        <Select
          allowClear
          placeholder="Lọc theo loại nấm"
          options={mushroomOptions}
          value={mushroomFilter}
          onChange={(value: string | undefined) => {
            setMushroomFilter(value)
            setCurrentPage(1)
          }}
          style={{ width: 200 }}
        />

        <Select<SpawnHealthFilter>
          placeholder="Lọc theo sức khỏe phôi"
          options={HEALTH_OPTIONS}
          value={healthFilter}
          onChange={(value) => {
            setHealthFilter(value)
            setCurrentPage(1)
          }}
          style={{ width: 190 }}
        />

        {hasFilters && <Button onClick={resetFilters}>Xóa bộ lọc</Button>}
      </Flex>

      {visibleBatches.length === 0 ? (
        <Empty description="Không có mẻ nấm phù hợp với bộ lọc" />
      ) : (
        <Flex vertical gap={20}>
          {visibleBatches.map((batch) => (
            <CultivationBatchCard
              key={batch.id}
              batch={batch}
              onOpenGallery={setGalleryBatch}
            />
          ))}
        </Flex>
      )}

      {filteredBatches.length > PAGE_SIZE && (
        <Flex justify="flex-end" style={{ marginTop: 20 }}>
          <Pagination
            current={visiblePage}
            pageSize={PAGE_SIZE}
            total={filteredBatches.length}
            showSizeChanger={false}
            showTotal={(total) => `${total} mẻ nấm`}
            onChange={setCurrentPage}
          />
        </Flex>
      )}

            <Suspense fallback={null}>
              <CultivationGalleryModal
              key={galleryBatch?.id ?? 'gallery-closed'}
              open={Boolean(galleryBatch)}
              batch={galleryBatch}
              onCancel={() => setGalleryBatch(null)}
              />
            </Suspense>
    </div>
  )
}
