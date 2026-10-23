import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  GlobalServiceFee,
  MushroomVariety,
  PricingCycleWeeks,
} from '../types/pricing.types'

const DEFAULT_SERVICE_FEE: GlobalServiceFee = {
  serviceFeePerTrayPerWeek: 100_000,
  deliveryFeePerOrder: 30_000,
}

export const MUSHROOM_VARIETY_PHOTOS: Record<string, string> = {
  'Nấm Bào Ngư Xám':
    'https://images.unsplash.com/photo-1595231776515-ddffb1f4eb73?auto=format&fit=crop&w=400&q=80',
  'Nấm Bào Ngư Trắng':
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
  'Nấm Hoàng Kim':
    'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=400&q=80',
  'Nấm Mối Đen':
    'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=400&q=80',
  'Nấm Linh Chi':
    'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=400&q=80',
  'Đông Trùng Hạ Thảo':
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
}

export const MOCK_MUSHROOM_VARIETIES: MushroomVariety[] = [
  {
    id: 'VAR-001',
    name: 'Nấm Bào Ngư Xám',
    imageUrl: MUSHROOM_VARIETY_PHOTOS['Nấm Bào Ngư Xám']!,
    description:
      'Giống PN-01, thịt dày, xòe tán rộng. Phù hợp khí hậu 22–28°C, ẩm 80–90%.',
    cycleWeeks: 1,
    spawnPricePerTray: 50_000,
    availability: 'AVAILABLE',
    createdAt: '2025-09-01',
  },
  {
    id: 'VAR-002',
    name: 'Nấm Bào Ngư Trắng',
    imageUrl: MUSHROOM_VARIETY_PHOTOS['Nấm Bào Ngư Trắng']!,
    description:
      'Giống PN-02, màu trắng ngà, dễ trồng. Nhiệt độ lý tưởng 24–26°C.',
    cycleWeeks: 1,
    spawnPricePerTray: 50_000,
    availability: 'AVAILABLE',
    createdAt: '2025-09-01',
  },
  {
    id: 'VAR-003',
    name: 'Nấm Hoàng Kim',
    imageUrl: MUSHROOM_VARIETY_PHOTOS['Nấm Hoàng Kim']!,
    description:
      'Giống HK-02, màu vàng óng, hương thơm nhẹ. Cần tưới 2 lần/ngày.',
    cycleWeeks: 1,
    spawnPricePerTray: 50_000,
    availability: 'AVAILABLE',
    createdAt: '2025-09-01',
  },
  {
    id: 'VAR-004',
    name: 'Nấm Mối Đen',
    imageUrl: MUSHROOM_VARIETY_PHOTOS['Nấm Mối Đen']!,
    description:
      'Giống MD-03, chu kỳ dài hơn, cần ổn định CO₂ < 800ppm.',
    cycleWeeks: 2,
    spawnPricePerTray: 70_000,
    availability: 'AVAILABLE',
    createdAt: '2025-09-15',
  },
  {
    id: 'VAR-005',
    name: 'Nấm Linh Chi',
    imageUrl: MUSHROOM_VARIETY_PHOTOS['Nấm Linh Chi']!,
    description:
      'Giống LG-04, dược liệu quý, cần theo dõi vi khí hậu chặt chẽ.',
    cycleWeeks: 3,
    spawnPricePerTray: 50_000,
    availability: 'AVAILABLE',
    createdAt: '2025-10-01',
  },
  {
    id: 'VAR-006',
    name: 'Đông Trùng Hạ Thảo',
    imageUrl: MUSHROOM_VARIETY_PHOTOS['Đông Trùng Hạ Thảo']!,
    description:
      'Giống DTHT-01, chu kỳ 4 tuần (28 ngày), yêu cầu kỹ thuật cao.',
    cycleWeeks: 4,
    spawnPricePerTray: 280_000,
    availability: 'OUT_OF_STOCK',
    createdAt: '2026-02-10',
  },
]

interface PricingState {
  serviceFee: GlobalServiceFee
  varieties: MushroomVariety[]

  /** Cập nhật phí dịch vụ & phí giao nhận */
  updateServiceFee: (next: Partial<GlobalServiceFee>) => void

  /** CRUD Mushroom Variety */
  addVariety: (
    values: Omit<MushroomVariety, 'id' | 'createdAt'>,
  ) => void
  updateVariety: (
    id: string,
    values: Partial<Omit<MushroomVariety, 'id' | 'createdAt'>>,
  ) => void
  toggleVarietyAvailability: (id: string) => void
  deleteVariety: (id: string) => void
}

function getToday() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getNextVarietyId(varieties: MushroomVariety[]) {
  const highest = varieties.reduce((max, item) => {
    const match = /^VAR-(\d+)$/.exec(item.id)
    return Math.max(max, match ? Number(match[1]) : 0)
  }, 0)
  return `VAR-${String(highest + 1).padStart(3, '0')}`
}

/**
 * Pricing store với PERSIST cho serviceFee.
 *
 * Chỉ persist `serviceFee` vì:
 * - varieties đến từ API (luôn fetch mới từ /api/mushroom-types)
 * - serviceFee là cấu hình local mà BE chưa hỗ trợ lưu
 *
 * Key localStorage: 'mcms-pricing-store'
 */
export const usePricingStore = create<PricingState>()(
  persist(
    (set) => ({
      serviceFee: DEFAULT_SERVICE_FEE,
      varieties: MOCK_MUSHROOM_VARIETIES,

      updateServiceFee: (next) =>
        set((state) => ({
          serviceFee: {
            ...state.serviceFee,
            ...next,
          },
        })),

      addVariety: (values) =>
        set((state) => ({
          varieties: [
            {
              ...values,
              id: getNextVarietyId(state.varieties),
              createdAt: getToday(),
            },
            ...state.varieties,
          ],
        })),

      updateVariety: (id, values) =>
        set((state) => ({
          varieties: state.varieties.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...values,
                }
              : item,
          ),
        })),

      toggleVarietyAvailability: (id) =>
        set((state) => ({
          varieties: state.varieties.map((item) =>
            item.id === id
              ? {
                  ...item,
                  availability:
                    item.availability === 'AVAILABLE' ? 'OUT_OF_STOCK' : 'AVAILABLE',
                }
              : item,
          ),
        })),

      deleteVariety: (id) =>
        set((state) => ({
          varieties: state.varieties.filter((item) => item.id !== id),
        })),
    }),
    {
      name: 'mcms-pricing-store',
      // Chỉ persist serviceFee — varieties luôn từ API
      partialize: (state) => ({
        serviceFee: state.serviceFee,
      }),
    },
  ),
)

export const PRICING_CYCLE_OPTIONS: Array<{
  value: PricingCycleWeeks
  label: string
  shortLabel: string
}> = [
  { value: 1, label: '1 tuần (7 ngày)', shortLabel: '1 Tuần' },
  { value: 2, label: '2 tuần (14 ngày)', shortLabel: '2 Tuần' },
  { value: 3, label: '3 tuần (21 ngày)', shortLabel: '3 Tuần' },
  { value: 4, label: '4 tuần (28 ngày)', shortLabel: '4 Tuần' },
]
