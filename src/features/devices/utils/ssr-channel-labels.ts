/**
 * Nhãn kênh SSR (1..8).
 *
 * BE hiện KHÔNG trả metadata loại thiết bị (`deviceType`) cho từng kênh —
 * `GET /api/iot/masters/{id}/ssr` chỉ có `channel / desiredState / reportedState`.
 * Vì vậy FE hiển thị nhãn trung tính "Kênh N" thay vì đoán (van / quạt / đèn).
 *
 * Khi BE bổ sung `deviceType` vào `IotSsrChannelState`, cập nhật lại hàm này
 * để map sang tên thiết bị thật.
 */
export const SSR_CHANNEL_LABELS: Record<number, string> = {
  1: 'Kênh 1',
  2: 'Kênh 2',
  3: 'Kênh 3',
  4: 'Kênh 4',
  5: 'Kênh 5',
  6: 'Kênh 6',
  7: 'Kênh 7',
  8: 'Kênh 8',
}

/** Nhãn hiển thị cho kênh SSR. */
export function getSsrChannelLabel(channel: number): string {
  return SSR_CHANNEL_LABELS[channel] ?? `Kênh ${channel}`
}
