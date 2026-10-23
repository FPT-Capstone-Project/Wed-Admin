import { useMemo, useState } from 'react'
import {
  FilterOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Empty,
  Flex,
  Input,
  Pagination,
  Select,
  Tag,
  Typography,
} from 'antd'
import { useAuthStore } from '../../features/auth/store/auth.store'
import { useCultivationStore } from '../../stores/cultivation.store'
import { CultivationBatchCard } from './components/CultivationBatchCard'
import { BatchDailyPhotosModal } from './components/BatchDailyPhotosModal'
import type {
  CultivationBatch,
  GrowthStage,
  MushroomQuality,
} from '../../types/cultivation.types'

const STAGE_OPTIONS = [
  { value: 'INCUBATION', label: 'Ủ tơ / Nuôi sợi' },
  { value: 'PINNING', label: 'Kích nụ / Ra ghim' },
  { value: 'FRUITING', label: 'Phát triển thể quả' },
  { value: 'READY_TO_HARVEST', label: 'Sẵn sàng thu hoạch' },
  { value: 'HARVESTED', label: 'Đã thu hoạch' },
] satisfies Array<{ value: GrowthStage; label: string }>

const QUALITY_OPTIONS = [
  { value: 'GRADE_A', label: 'Grade A' },
  { value: 'GRADE_B', label: 'Grade B' },
  { value: 'WARNING_CONTAMINATED', label: 'Cần xử lý sâu bệnh/mốc' },
] satisfies Array<{ value: MushroomQuality; label: string }>

const PAGE_SIZE = 4

function canManageCultivation(role: string | undefined) {
  const normalizedRole = role?.toUpperCase()

  return (
    normalizedRole === 'ADMIN' ||
    normalizedRole === 'OPERATOR' ||
    normalizedRole === 'FARM_MANAGER'
  )
}

export function CultivationManagementPage() {
  const batches = useCultivationStore((state) => state.batches)
  const authUser = useAuthStore((state) => state.user)
  const canManage = canManageCultivation(authUser?.role)

  const [searchText, setSearchText] = useState('')
  const [stageFilter, setStageFilter] = useState<GrowthStage | undefined>()
  const [mushroomFilter, setMushroomFilter] = useState<string | undefined>()
  const [qualityFilter, setQualityFilter] = useState<
    MushroomQuality | undefined
  >()
  const [currentPage, setCurrentPage] = useState(1)
  const [dailyPhotosBatch, setDailyPhotosBatch] =
    useState<CultivationBatch | null>(null)

  const mushroomOptions = useMemo(
    () =>
      [...new Set(batches.map((batch) => batch.mushroomType))].map((type) => ({
        value: type,
        label: type,
      })),
    [batches],
  )

  const filteredBatches = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()

    return batches.filter((batch) => {
      const isVisibleToCustomer =
        canManage || batch.tenantName === authUser?.fullName
      const matchesSearch = normalizedSearch
        ? [batch.batchCode, batch.trayId, batch.trayName].some((value) =>
            value.toLowerCase().includes(normalizedSearch),
          )
        : true
      const matchesStage = stageFilter
        ? batch.currentStage === stageFilter
        : true
      const matchesMushroom = mushroomFilter
        ? batch.mushroomType === mushroomFilter
        : true
      const matchesQuality = qualityFilter
        ? batch.healthStatus === qualityFilter
        : true

      return (
        isVisibleToCustomer &&
        matchesSearch &&
        matchesStage &&
        matchesMushroom &&
        matchesQuality
      )
    })
  }, [
    authUser?.fullName,
    batches,
    canManage,
    mushroomFilter,
    qualityFilter,
    searchText,
    stageFilter,
  ])

  const maxPage = Math.max(1, Math.ceil(filteredBatches.length / PAGE_SIZE))
  const visiblePage = Math.min(currentPage, maxPage)
  const visibleBatches = filteredBatches.slice(
    (visiblePage - 1) * PAGE_SIZE,
    visiblePage * PAGE_SIZE,
  )

  const handleOpenDailyPhotos = (batch: CultivationBatch) => {
    setDailyPhotosBatch(batch)
  }

  const resetFilters = () => {
    setSearchText('')
    setStageFilter(undefined)
    setMushroomFilter(undefined)
    setQualityFilter(undefined)
    setCurrentPage(1)
  }

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
            Camera giám sát sinh trưởng nấm
          </Typography.Title>
          <Typography.Text type="secondary">
            Theo dõi 7 ngày sinh trưởng của mỗi mẻ qua ảnh chụp tự động 08:00 mỗi sáng
          </Typography.Text>
        </div>

        <Tag
          icon={<FilterOutlined />}
          color={canManage ? 'processing' : 'default'}
        >
          {canManage ? 'Toàn quyền vận hành' : 'Chỉ xem mẻ của bạn'}
        </Tag>
      </Flex>

      <Flex gap={12} wrap style={{ marginBottom: 20 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Tìm mã mẻ, mã khay hoặc tên khay"
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
          style={{ width: 190 }}
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
          style={{ width: 190 }}
        />

        <Select<MushroomQuality>
          allowClear
          placeholder="Lọc theo sức khỏe"
          options={QUALITY_OPTIONS}
          value={qualityFilter}
          onChange={(value) => {
            setQualityFilter(value)
            setCurrentPage(1)
          }}
          style={{ width: 190 }}
        />

        {(searchText || stageFilter || mushroomFilter || qualityFilter) && (
          <Button onClick={resetFilters}>Xóa bộ lọc</Button>
        )}
      </Flex>

      {visibleBatches.length === 0 ? (
        <Empty description="Không có mẻ nấm phù hợp" />
      ) : (
        <Flex vertical gap={20}>
          {visibleBatches.map((batch) => (
            <CultivationBatchCard
              key={batch.id}
              batch={batch}
              onDailyPhotos={handleOpenDailyPhotos}
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

      <BatchDailyPhotosModal
        key={dailyPhotosBatch?.id ?? 'daily-photos-closed'}
        open={Boolean(dailyPhotosBatch)}
        batch={dailyPhotosBatch}
        onCancel={() => setDailyPhotosBatch(null)}
      />
    </div>
  )
}
