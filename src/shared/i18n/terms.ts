/**
 * Bảng thuật ngữ MCMS — chuyển từ tiếng Anh kỹ thuật sang tiếng Việt dễ hiểu.
 *
 * Đối tượng chính là chủ trang trại và nhân viên vận hành, KHÔNG phải kỹ thuật
 * viên. "Master / Node / SSR / Dry-run" với họ gần như vô nghĩa, trong khi
 * "Bộ điều khiển trung tâm / Cụm cảm biến / Rơ-le / Chạy thử" thì ai cũng
 * hiểu.
 *
 * Nguyên tắc:
 *   - **Giá trị gốc từ API/DB giữ nguyên** — chỉ tra cứu ở tầng hiển thị.
 *   - Không dịch tên riêng (tên giống nấm, tên khách) — chỉ dịch thuật ngữ hệ thống.
 *   - Có `description` để giải thích ngắn khi chuỗi dài dễ gây hiểu nhầm.
 */

/** Một mục thuật ngữ. */
export interface TermEntry {
  /** Nhãn tiếng Việt dùng trong UI. */
  readonly label: string
  /** Giải thích ngắn — hiển thị khi cần (tooltip, help). */
  readonly description?: string
}

/**
 * Thuật ngữ IoT / tự động hoá.
 *
 * Duyệt ngày 2026-10-25.
 */
export const IOT_TERMS = {
  /** Master — bộ điều khiển trung tâm của một khu trại. */
  master: {
    label: 'Bộ điều khiển trung tâm',
    description:
      'Thiết bị trung tâm kết nối với cảm biến và điều khiển thiết bị tưới trong khu trại.',
  },
  /** Node — nhóm cảm biến RS485 trên một tầng. */
  node: {
    label: 'Cụm cảm biến',
    description:
      'Nhóm cảm biến nối chung trên một tầng. Mỗi cụm có 3 cảm biến nhiệt độ và độ ẩm.',
  },
  /** Sensor — cảm biến đơn lẻ. */
  sensor: {
    label: 'Cảm biến',
    description: 'Cảm biến đo nhiệt độ và độ ẩm không khí.',
  },
  /** Gateway — bộ trung chuyển tín hiệu. */
  gateway: {
    label: 'Bộ trung chuyển',
    description: 'Thiết bị trung gian chuyển tín hiệu giữa mạng RS485 và hệ thống.',
  },
  /** SSR — rơ-le điều khiển thiết bị. */
  ssr: {
    label: 'Rơ-le',
    description:
      'Rơ-le điện tử điều khiển thiết bị tưới, quạt, đèn. Đóng rơ-le = thiết bị hoạt động.',
  },
  /** Kênh SSR — một đầu ra của rơ-le. */
  ssrChannel: {
    label: 'Kênh điều khiển',
    description: 'Mỗi kênh điều khiển một thiết bị riêng.',
  },
  /** RS485 — chuẩn truyền tín hiệu giữa bộ điều khiển và cảm biến. */
  rs485: {
    label: 'Mạng RS485',
    description: 'Kết nối dây giữa bộ điều khiển trung tâm và các cảm biến.',
  },
  /** Auto-misting — tưới phun sương tự động. */
  autoMisting: {
    label: 'Tưới phun sương tự động',
    description:
      'Hệ thống tự quyết định tưới khi độ ẩm xuống dưới ngưỡng đã đặt.',
  },
  /** Kênh rơ-le máy bơm — SSR channel điều khiển máy bơm tưới. */
  mistingChannel: {
    label: 'Kênh rơ-le máy bơm',
    description: 'Kênh điện tử điều khiển máy bơm tưới phun sương cho tầng.',
  },
  /** Dry-run — chạy thử thuật toán, không gửi lệnh thật. */
  dryRun: {
    label: 'Chạy thử (không tưới thật)',
    description:
      'Thuật toán chạy để tính toán quyết định, nhưng KHÔNG gửi lệnh tưới xuống thiết bị.',
  },
  /** Profile — bộ ngưỡng canh tác. */
  profile: {
    label: 'Bộ ngưỡng',
    description:
      'Bộ giá trị giới hạn (nhiệt độ, độ ẩm) dùng cho hệ thống tự động.',
  },
  /** Ngưỡng — threshold. */
  threshold: {
    label: 'Ngưỡng',
    description: 'Mức giá trị mà tại đó hệ thống bắt đầu hoặc dừng hành động.',
  },
  /** Cooldown — thời gian chờ giữa hai lần tưới. */
  cooldown: {
    label: 'Thời gian chờ',
    description: 'Khoảng nghỉ bắt buộc giữa hai lần tưới liên tiếp.',
  },
  /** Pulse — xung tưới (một lần phun ngắn). */
  pulse: {
    label: 'Xung tưới',
    description: 'Một lần phun sương ngắn, thường kéo dài vài giây.',
  },
  /** Master ID / mã thiết bị. */
  deviceCode: {
    label: 'Mã thiết bị',
    description: 'Mã định danh của bộ điều khiển trung tâm.',
  },
  /** Floor — tầng. */
  floor: {
    label: 'Tầng',
    description: 'Tầng trong nhà trồng nấm, mỗi tầng có một bộ điều khiển riêng.',
  },
  /** Tray — khay. */
  tray: {
    label: 'Khay',
    description: 'Khay chứa nấm, là đơn vị cho thuê.',
  },
  /** Rack — giá đặt khay. */
  rack: {
    label: 'Giá khay',
    description: 'Khung giữ nhiều khay nấm theo tầng.',
  },
  /** Live stream — luồng camera trực tiếp. */
  liveStream: {
    label: 'Xem trực tiếp',
    description: 'Hình ảnh camera cập nhật liên tục.',
  },
  /** Telemetry — dữ liệu cảm biến theo thời gian. */
  telemetry: {
    label: 'Dữ liệu cảm biến',
    description: 'Giá trị nhiệt độ, độ ẩm ghi nhận theo thời gian.',
  },
  /** Watchdog — thiết bị giám sát an toàn. */
  watchdog: {
    label: 'Thiết bị giám sát an toàn',
    description:
      'Cơ chế tự tắt thiết bị tưới nếu hệ thống mất kết nối, tránh tưới quá lâu.',
  },
} as const satisfies Record<string, TermEntry>

export type IotTermKey = keyof typeof IOT_TERMS

/**
 * Tra cứu nhãn tiếng Việt của một thuật ngữ.
 *
 * Trả về `fallback` nếu key không tồn tại — để gọi an toàn với dữ liệu BE
 * có thể có thêm loại thiết bị mới.
 */
export function getTerm(key: IotTermKey | string, fallback?: string): string {
  const entry = IOT_TERMS[key as IotTermKey]
  return entry?.label ?? fallback ?? key
}

/** Tra cứu mô tả giải thích của một thuật ngữ. */
export function getTermDescription(
  key: IotTermKey | string,
): string | undefined {
  const entry = IOT_TERMS[key as IotTermKey]
  return entry?.description
}

/**
 * Chuẩn hoá câu chữ để hiển thị tên thiết bị kèm mã.
 *
 * VD: `masterId = "3"` → "Bộ điều khiển trung tâm #3".
 */
export function formatDeviceLabel(
  masterId: string | number | null | undefined,
): string {
  if (masterId === null || masterId === undefined || masterId === '') {
    return getTerm('master')
  }
  return `${getTerm('master')} #${masterId}`
}

/**
 * Chuẩn hoá nhãn cảm biến theo cụm.
 *
 * VD: `nodeId = 2, sensorId = 3` → "Cụm cảm biến 2 · Cảm biến 3".
 */
export function formatSensorLabel(
  nodeId: number | null | undefined,
  sensorId: number | null | undefined,
): string {
  const parts: string[] = []
  if (nodeId !== null && nodeId !== undefined) {
    parts.push(`${getTerm('node')} ${nodeId}`)
  }
  if (sensorId !== null && sensorId !== undefined) {
    parts.push(`${getTerm('sensor')} ${sensorId}`)
  }
  return parts.length > 0 ? parts.join(' · ') : 'Cảm biến'
}

/**
 * Chuyển đổi mã phần cứng kỹ thuật (vd: "node-stm32-01", "node-stm32-04")
 * thành nhãn vị trí thân thiện với chủ trang trại (vd: "Cụm cảm biến Tầng 1").
 */
export function formatFriendlyDeviceLocation(deviceId?: string | null): string {
  if (!deviceId) return getTerm('node')

  const normalized = deviceId.trim()

  // Bộ điều khiển trung tâm — "master01" / "master-1" / "MASTER_01".
  const masterMatch = normalized.match(/^master[-_ ]?0*(\d+)$/i)
  if (masterMatch) {
    return `${getTerm('master')} Tầng ${masterMatch[1]}`
  }

  // Cụm cảm biến — "node-stm32-01" / "node01" / "tang-2".
  const nodeMatch = normalized.match(
    /(?:node[-_ ]?(?:stm32)?[-_ ]?|tang[-_ ]?)0*(\d+)/i,
  )
  if (nodeMatch) {
    return `${getTerm('node')} Tầng ${nodeMatch[1]}`
  }

  return normalized
}
