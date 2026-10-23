/**
 * Phạm vi node RS485 đang hoạt động.
 *
 * Hệ thống hiện chỉ có **2 node** (node 1, node 2), mỗi node có **3 sensor**
 * (sensor 1..3) → tổng 6 cảm biến.
 *
 * Node 3 (và 3 sensor tương ứng) đã được gỡ bỏ khỏi danh sách hiển thị.
 *
 * Khi BE trả về node mới, cập nhật `ACTIVE_NODE_IDS` tại đây — mọi nơi
 * (bảng cảm biến, drawer môi trường, tab lịch sử telemetry) đều tự động
 * đồng bộ vì đều đi qua bộ lọc này.
 */

/** Danh sách node ID được phép hiển thị. */
export const ACTIVE_NODE_IDS: readonly number[] = [1, 2]

/** Số sensor trên mỗi node (1..3). */
export const SENSORS_PER_NODE = 3

/** Node này có nằm trong phạm vi hoạt động không. */
export function isActiveNode(nodeId: number): boolean {
  return ACTIVE_NODE_IDS.includes(nodeId)
}

/** Lọc danh sách cảm biến chỉ giữ node trong phạm vi hoạt động. */
export function filterActiveSensors<T extends { nodeId: number }>(
  sensors: readonly T[],
): T[] {
  return sensors.filter((sensor) => isActiveNode(sensor.nodeId))
}
