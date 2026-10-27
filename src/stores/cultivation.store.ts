import { create } from 'zustand'
import dayjs from 'dayjs'
import type {
  CultivationBatch,
  CultivationLogInput,
  GallerySnapshot,
  GrowthStage,
  HarvestScheduleInput,
  MushroomQuality,
  RecordHarvestInput,
  SnapshotStage,
} from '../types/cultivation.types'

/* ──────────────────────────────────────────────────────────────────────────
 *  IMAGE URL CONSTANTS — PHẢI khai báo TRƯỚC tất cả object/factory khác
 *  vì `MUSHROOM_DAILY_URLS` (line ~50) tham chiếu `DAILY_GROWTH_URLS`.
 *  Trước đây file có thứ tự sai → ném `Cannot access 'DAILY_GROWTH_URLS'
 *  before initialization` do Temporal Dead Zone.
 * ────────────────────────────────────────────────────────────────────────── */

// 7 ảnh Unsplash nấm nuôi trồng — theo thứ tự Ngày 1 → Ngày 7 (chu kỳ bào ngư)
// Tất cả link đã được verify HTTP 200 (HEAD check).
const DAILY_GROWTH_URLS: readonly string[] = [
  'https://images.unsplash.com/photo-1595231776515-ddffb1f4eb73?auto=format&fit=crop&w=800&q=80', // N1 - Ủ tơ / sợi trắng
  'https://images.unsplash.com/photo-1604999333679-b86d54738315?auto=format&fit=crop&w=800&q=80', // N2 - Tơ lan tỏa (verified 200, thay cho link 404 cũ)
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80', // N3 - Ghim nụ đầu tiên
  'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=800&q=80', // N4 - Nụ lớn hình tai nhỏ
  'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=800&q=80', // N5 - Xòe tán (verified 200, thay cho link cũ trùng FRUITING)
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80', // N6 - Cụm nở dày, tán rộng
  'https://images.unsplash.com/photo-1574226516831-e1dff420e562?auto=format&fit=crop&w=800&q=80', // N7 - Hoàn chỉnh, sẵn sàng thu hoạch
] as const

// Bộ ảnh dự phòng cho Nấm Linh Chi (đỏ/gỗ tự nhiên)
const LINH_CHI_URL =
  'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80'

/**
 * Ảnh nấm fallback — dùng khi một trong các link trên Unsplash bị 404
 * (phỏng theo `photo-1604999333679-b86d54738315` — đã verify HTTP 200).
 */
const FALLBACK_MUSHROOM_URL =
  'https://images.unsplash.com/photo-1604999333679-b86d54738315?auto=format&fit=crop&w=800&q=80'

// Bộ ảnh nấm bào ngư — 4 stage, mỗi stage dùng 1 URL riêng biệt từ DAILY_GROWTH_URLS
// (không trùng nhau; bám sát chu kỳ 7 ngày đã verify ở trên).
const MUSHROOM_DAILY_URLS: Record<SnapshotStage, string> = {
  INCUBATION: DAILY_GROWTH_URLS[0],
  PINNING: DAILY_GROWTH_URLS[2],
  FRUITING: DAILY_GROWTH_URLS[4],
  HARVEST_READY: DAILY_GROWTH_URLS[6],
}

export const GROWTH_STAGE_ORDER: GrowthStage[] = [
  'INCUBATION',
  'PINNING',
  'FRUITING',
  'READY_TO_HARVEST',
  'HARVESTED',
]

const STAGE_PROGRESS: Record<GrowthStage, number> = {
  INCUBATION: 15,
  PINNING: 38,
  FRUITING: 65,
  READY_TO_HARVEST: 90,
  HARVESTED: 100,
}

const SNAPSHOT_STAGE_BY_GROWTH_STAGE: Partial<
  Record<GrowthStage, SnapshotStage>
> = {
  INCUBATION: 'INCUBATION',
  PINNING: 'PINNING',
  FRUITING: 'FRUITING',
  READY_TO_HARVEST: 'HARVEST_READY',
}

/** snapshot factory — phải đặt TRƯỚC createDailySnapshots vì phụ thuộc call-site */
function createSnapshot(
  id: string,
  stage: SnapshotStage,
  timestamp: string,
  note: string,
): GallerySnapshot {
  return {
    id,
    imageUrl: MUSHROOM_DAILY_URLS[stage],
    timestamp,
    stage,
    note,
  }
}

/**
 * Tạo 7 ảnh 08:00 cho mẻ theo chu kỳ.
 * - `startDate`: ngày bắt đầu (Ngày 1).
 * - `batchCode`: tiền tố ID ảnh.
 * - `mushroomType`: loại nấm (ảnh hưởng bộ ảnh: bào ngư / linh chi).
 * - Ngày đã qua → `imageUrl` có URL thật; Ngày tương lai → `imageUrl = ''`.
 */
function createDailySnapshots(
  startDate: string,
  batchCode: string,
  mushroomType: string = '',
): GallerySnapshot[] {
  const base = dayjs(startDate).startOf('day')
  const now = dayjs()
  const isLinhChi = mushroomType.includes('Linh Chi')

  return Array.from({ length: 7 }, (_, i) => {
    const dayIndex = i + 1
    const timestamp = base.add(dayIndex - 1, 'day').hour(8).toISOString()
    const dayMoment = dayjs(timestamp)
    const isPastOrToday = !dayMoment.isAfter(now)

    // Chọn URL theo ngày; Linh Chi dùng ảnh linh chi, các loại khác dùng bộ nấm bào ngư.
    // Nếu URL cho ngày đó rỗng (chưa có trong DAILY_GROWTH_URLS) → fallback ảnh nấm chung.
    const rawUrl = isLinhChi ? LINH_CHI_URL : (DAILY_GROWTH_URLS[i] ?? '')
    const imageUrl = rawUrl || FALLBACK_MUSHROOM_URL

    const stage: SnapshotStage = (
      dayIndex <= 2 ? 'INCUBATION'
      : dayIndex <= 4 ? 'PINNING'
      : dayIndex <= 6 ? 'FRUITING'
      : 'HARVEST_READY'
    )

    return {
      id: `${batchCode}-D${String(dayIndex).padStart(2, '0')}`,
      timestamp,
      stage,
      note: `Ngày ${dayIndex} - ${getStageNote(stage, dayIndex)}.`,
      // Ngày tương lai → placeholder rỗng (component sẽ vẽ icon)
      imageUrl: isPastOrToday ? imageUrl : '',
    }
  })
}

function getStageNote(stage: SnapshotStage, dayIndex: number) {
  switch (stage) {
    case 'INCUBATION':
      return dayIndex === 1
        ? 'Sợi nấm bắt đầu phát triển.'
        : 'Phôi nấm lan rộng đều.'
    case 'PINNING':
      return dayIndex === 3
        ? 'Bắt đầu ra ghim đầu tiên.'
        : 'Mầm ghim rõ rệt trên giá thể.'
    case 'FRUITING':
      return dayIndex === 5
        ? 'Thể quả bắt đầu phát triển.'
        : 'Nấm tiếp tục lớn nhanh.'
    case 'HARVEST_READY':
      return 'Sẵn sàng thu hoạch.'
    default:
      return ''
  }
}

const createLog = (
  id: string,
  stage: GrowthStage,
  note: string,
  loggedBy: string,
  actionTaken: string,
  timestamp: string,
  snapshot?: GallerySnapshot,
) => ({
  id,
  stage,
  note,
  loggedBy,
  actionTaken,
  timestamp,
  ...(snapshot
    ? {
        snapshotUrl: snapshot.imageUrl,
        snapshotTimestamp: snapshot.timestamp,
        snapshotStage: snapshot.stage,
      }
    : {}),
})

export const MOCK_CULTIVATION_BATCHES: CultivationBatch[] = [
  {
    id: 'BATCH-001',
    batchCode: 'MCMS-2608-A01',
    trayId: 'T1-K1',
    trayName: 'Tầng 1 · Khay 1',
    mushroomType: 'Nấm Bào Ngư Xám',
    startDate: '2026-09-13',
    estimatedHarvestDate: '2026-09-19',
    actualHarvestDate: null,
    currentStage: 'PINNING',
    progressPercent: 57,
    expectedYieldKg: 4.5,
    actualYieldKg: null,
    operatorInCharge: 'Trần Quốc Huy',
    tenantName: 'Nguyễn Minh Anh',
    healthStatus: 'GRADE_A',
    logs: [
      createLog(
        'LOG-001',
        'INCUBATION',
        'Sợi nấm phủ đều bề mặt giá thể, bắt đầu nuôi sợi ổn định.',
        'Trần Quốc Huy',
        'Duy trì ẩm 88%, giảm thông gió tối đa.',
        '2026-09-11T08:00:00+07:00',
        createSnapshot(
          'SNAP-001-INCUBATION',
          'INCUBATION',
          '2026-09-11T08:00:00+07:00',
          'Phôi nấm trắng phủ kín bề mặt giá thể.',
        ),
      ),
      createLog(
        'LOG-002',
        'PINNING',
        'Đã xuất hiện các điểm ghim đầu tiên sau 3 ngày nuôi sợi.',
        'Trần Quốc Huy',
        'Tăng chu kỳ chiếu sáng lên 10 giờ/ngày.',
        '2026-09-13T08:00:00+07:00',
        createSnapshot(
          'SNAP-001-PINNING',
          'PINNING',
          '2026-09-13T08:00:00+07:00',
          'Các mầm ghim nhỏ li ti bắt đầu nhú ra từ giá thể.',
        ),
      ),
    ],
    /** 7 ngày ảnh 08:00 — Ngày 1-4 đã chụp (10-13/09), Ngày 5-7 placeholder rỗng */
    gallerySnapshots: createDailySnapshots('2026-09-13', 'MCMS-2608-A01', 'Nấm Bào Ngư Xám'),
  },
  {
    id: 'BATCH-002',
    batchCode: 'MCMS-2607-L02',
    trayId: 'T2-K1',
    trayName: 'Tầng 2 · Khay 1',
    mushroomType: 'Nấm Linh Chi',
    startDate: '2026-09-11',
    estimatedHarvestDate: '2026-09-17',
    actualHarvestDate: null,
    currentStage: 'FRUITING',
    progressPercent: 86,
    expectedYieldKg: 6.2,
    actualYieldKg: null,
    operatorInCharge: 'Phạm Hoàng Nam',
    tenantName: 'Trần Quốc Bảo',
    healthStatus: 'GRADE_A',
    logs: [
      createLog(
        'LOG-003',
        'FRUITING',
        'Tai nấm phát triển đồng đều, màu sắc ổn định.',
        'Phạm Hoàng Nam',
        'Giữ độ ẩm ổn định 80–90%RH.',
        '2026-08-30T14:20:00+07:00',
        createSnapshot(
          'SNAP-002-FRUITING',
          'FRUITING',
          '2026-08-30T14:20:00+07:00',
          'Cụm nấm phát triển đều, chuẩn bị bước vào kỳ hái.',
        ),
      ),
    ],
    gallerySnapshots: createDailySnapshots('2026-09-11', 'MCMS-2607-L02', 'Nấm Linh Chi'),
  },
  {
    id: 'BATCH-003',
    batchCode: 'MCMS-2606-B03',
    trayId: 'T3-K1',
    trayName: 'Tầng 3 · Khay 1',
    mushroomType: 'Nấm Bào Ngư Trắng',
    startDate: '2026-09-10',
    estimatedHarvestDate: '2026-09-16',
    actualHarvestDate: null,
    currentStage: 'READY_TO_HARVEST',
    progressPercent: 100,
    expectedYieldKg: 5.0,
    actualYieldKg: null,
    operatorInCharge: 'Phạm Hoàng Nam',
    tenantName: 'Võ Ngọc Thảo',
    healthStatus: 'GRADE_A',
    logs: [
      createLog(
        'LOG-004',
        'READY_TO_HARVEST',
        'Mũ nấm đạt kích thước tiêu chuẩn, đã đến ngày thu hoạch.',
        'Phạm Hoàng Nam',
        'Đặt lịch thu hoạch đợt đầu và chuẩn bị xuất hóa đơn.',
        '2026-09-16T07:45:00+07:00',
        createSnapshot(
          'SNAP-003-HARVEST',
          'HARVEST_READY',
          '2026-09-16T07:45:00+07:00',
          'Mũ nấm đạt kích thước tiêu chuẩn, sẵn sàng thu hoạch.',
        ),
      ),
    ],
    gallerySnapshots: createDailySnapshots('2026-09-10', 'MCMS-2606-B03', 'Nấm Bào Ngư Trắng'),
  },
  {
    id: 'BATCH-004',
    batchCode: 'FLOOR-1-HOANG-KIM',
    trayId: 'T1-K2',
    trayName: 'Tầng 1 · Khay 2',
    mushroomType: 'Nấm Hoàng Kim',
    startDate: '2026-08-30',
    estimatedHarvestDate: '2026-09-05',
    actualHarvestDate: null,
    currentStage: 'FRUITING',
    progressPercent: 62,
    expectedYieldKg: 3.6,
    actualYieldKg: null,
    operatorInCharge: 'Phạm Hoàng Nam',
    tenantName: 'Phạm Thanh Tùng',
    healthStatus: 'GRADE_A',
    logs: [
      {
        id: 'LOG-007',
        stage: 'PINNING' as const,
        note: 'Nấm Hoàng Kim bắt đầu ra ghim, đúng tiến độ.',
        loggedBy: 'Phạm Hoàng Nam',
        actionTaken: 'Tăng tần suất phun sương lên 2 lần/ngày.',
        timestamp: '2026-09-02T08:00:00+07:00',
      },
    ],
    gallerySnapshots: createDailySnapshots('2026-08-30', 'FLOOR-1-HOANG-KIM', 'Nấm Hoàng Kim'),
  },
  {
    // ── ARCHIVED: Đông Trùng Hạ Thảo đã thu hoạch 27/08/2026 ──────
    // Đã kết thúc vòng đời — chuyển sang archive, không còn tranh chấp T1-K2 với FLOOR-1-HOANG-KIM.
    id: 'BATCH-005',
    batchCode: 'MCMS-2605-C05',
    trayId: 'T1-K2-ARCHIVED',
    trayName: 'Tầng 1 · Khay 2 [Lịch sử]',
    mushroomType: 'Đông Trùng Hạ Thảo',
    startDate: '2026-05-01',
    estimatedHarvestDate: '2026-08-28',
    actualHarvestDate: '2026-08-27',
    currentStage: 'HARVESTED',
    progressPercent: 100,
    expectedYieldKg: 2.5,
    actualYieldKg: 2.3,
    operatorInCharge: 'Trần Quốc Huy',
    tenantName: 'Nguyễn Minh Anh',
    healthStatus: 'GRADE_A',
    logs: [
      {
        id: 'LOG-005',
        stage: 'HARVESTED' as const,
        note: 'Đã hoàn tất thu hoạch, chất lượng đạt Grade A.',
        loggedBy: 'Trần Quốc Huy',
        actionTaken: 'Đóng gói và chuyển kho mát.',
        timestamp: '2026-08-27T16:00:00+07:00',
      },
    ],
    gallerySnapshots: [
      createSnapshot(
        'SNAP-005-FRUITING',
        'FRUITING',
        '2026-08-20T11:30:00+07:00',
        'Đông trùng đã lên màu đều trước khi thu.',
      ),
      createSnapshot(
        'SNAP-005-HARVEST',
        'HARVEST_READY',
        '2026-08-27T16:00:00+07:00',
        'Đã hoàn tất thu hoạch, chất lượng đạt Grade A.',
      ),
    ],
  },
  {
    id: 'BATCH-006',
    batchCode: 'MCMS-2607-W06',
    trayId: 'T1-K3',
    trayName: 'Tầng 1 · Khay 3',
    mushroomType: 'Nấm Bào Ngư Xám',
    startDate: '2026-07-30',
    estimatedHarvestDate: '2026-09-12',
    actualHarvestDate: null,
    currentStage: 'FRUITING',
    progressPercent: 61,
    expectedYieldKg: 4.8,
    actualYieldKg: null,
    operatorInCharge: 'Phạm Hoàng Nam',
    tenantName: 'Trần Quốc Bảo',
    healthStatus: 'WARNING_CONTAMINATED',
    logs: [
      {
        id: 'LOG-006',
        stage: 'FRUITING' as const,
        note: 'Phát hiện đốm mốc xanh ở góc khay.',
        loggedBy: 'Phạm Hoàng Nam',
        actionTaken: 'Cách ly khay và giảm độ ẩm xuống 78%.',
        timestamp: '2026-08-29T10:30:00+07:00',
      },
    ],
    gallerySnapshots: createDailySnapshots('2026-07-30', 'MCMS-2607-W06', 'Nấm Bào Ngư Xám'),
  },
]

interface CultivationState {
  batches: CultivationBatch[]
  advanceStage: (batchId: string) => void
  addLog: (batchId: string, values: CultivationLogInput) => void
  scheduleHarvest: (batchId: string, values: HarvestScheduleInput) => void
  recordHarvest: (batchId: string, values: RecordHarvestInput) => void
  markContaminated: (batchId: string) => void
  captureSnapshot: (batchId: string) => GallerySnapshot | null
}

function getNextLogId(logs: CultivationBatch['logs']) {
  return `LOG-${String(logs.length + 1).padStart(3, '0')}-${Date.now()}`
}

export const useCultivationStore = create<CultivationState>((set) => ({
  batches: MOCK_CULTIVATION_BATCHES,

  advanceStage: (batchId) =>
    set((state) => ({
      batches: state.batches.map((batch) => {
        if (batch.id !== batchId) {
          return batch
        }

        const currentIndex = GROWTH_STAGE_ORDER.indexOf(batch.currentStage)
        const nextStage =
          GROWTH_STAGE_ORDER[Math.min(currentIndex + 1, GROWTH_STAGE_ORDER.length - 1)]

        return {
          ...batch,
          currentStage: nextStage,
          progressPercent: Math.max(batch.progressPercent, STAGE_PROGRESS[nextStage]),
        }
      }),
    })),

  addLog: (batchId, values) =>
    set((state) => ({
      batches: state.batches.map((batch) =>
        batch.id === batchId
          ? {
              ...batch,
              logs: [
                {
                  ...values,
                  id: getNextLogId(batch.logs),
                  timestamp: new Date().toISOString(),
                },
                ...batch.logs,
              ],
            }
          : batch,
      ),
    })),

  scheduleHarvest: (batchId, values) =>
    set((state) => ({
      batches: state.batches.map((batch) =>
        batch.id === batchId
          ? {
              ...batch,
              estimatedHarvestDate: values.estimatedHarvestDate,
              expectedYieldKg: values.expectedYieldKg,
              operatorInCharge: values.operatorInCharge,
            }
          : batch,
      ),
    })),

  recordHarvest: (batchId, values) =>
    set((state) => ({
      batches: state.batches.map((batch) => {
        if (batch.id !== batchId) {
          return batch
        }

        const harvestLog = {
          id: getNextLogId(batch.logs),
          timestamp: new Date().toISOString(),
          stage: 'HARVESTED' as const,
          note: values.notes || 'Đã hoàn tất thu hoạch.',
          loggedBy: 'Quản trị viên MCMS',
          actionTaken: `Ghi nhận thực thu ${values.actualYieldKg} kg - ${values.quality}.`,
        }

        return {
          ...batch,
          currentStage: 'HARVESTED',
          progressPercent: 100,
          actualHarvestDate: values.actualHarvestDate,
          actualYieldKg: values.actualYieldKg,
          healthStatus: values.quality,
          logs: [harvestLog, ...batch.logs],
        }
      }),
    })),

  markContaminated: (batchId) =>
    set((state) => ({
      batches: state.batches.map((batch) => {
        if (batch.id !== batchId) {
          return batch
        }

        const warningLog = {
          id: getNextLogId(batch.logs),
          timestamp: new Date().toISOString(),
          stage: batch.currentStage,
          note: 'Mẻ nấm được đánh dấu cần xử lý sâu bệnh hoặc mốc.',
          loggedBy: 'Quản trị viên MCMS',
          actionTaken: 'Cách ly mẻ và tạo cảnh báo kiểm tra thủ công.',
        }

        return {
          ...batch,
          healthStatus: 'WARNING_CONTAMINATED' as MushroomQuality,
          logs: [warningLog, ...batch.logs],
        }
      }),
    })),

  captureSnapshot: (batchId) => {
    let capturedSnapshot: GallerySnapshot | null = null
    const timestamp = new Date().toISOString()

    set((state) => ({
      batches: state.batches.map((batch) => {
        if (batch.id !== batchId) {
          return batch
        }

        const snapshotStage =
          SNAPSHOT_STAGE_BY_GROWTH_STAGE[batch.currentStage] ?? 'HARVEST_READY'
        capturedSnapshot = {
          id: `SNAP-${batch.id}-${Date.now()}`,
          imageUrl: MUSHROOM_DAILY_URLS[snapshotStage],
          timestamp,
          stage: snapshotStage,
          note: `Ảnh chụp mới tại ${batch.trayName}.`,
        }
        const snapshotLog = {
          id: getNextLogId(batch.logs),
          timestamp,
          stage: batch.currentStage,
          note: `Đã chụp ảnh giai đoạn ${snapshotStage}.`,
          loggedBy: 'Quản trị viên MCMS',
          actionTaken: 'Lưu snapshot crop từ camera tầng vào gallery.',
          snapshotUrl: capturedSnapshot.imageUrl,
          snapshotTimestamp: timestamp,
          snapshotStage,
        }

        return {
          ...batch,
          logs: [snapshotLog, ...batch.logs],
          gallerySnapshots: [capturedSnapshot, ...batch.gallerySnapshots],
        }
      }),
    }))

    return capturedSnapshot
  },
}))
