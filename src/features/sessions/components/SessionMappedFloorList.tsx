import { ApartmentOutlined, NodeIndexOutlined } from '@ant-design/icons'
import { Flex, Tag, Typography } from 'antd'
import type { SessionFloorMapping } from '../types/session-floor-mapping.types'

/**
 * Danh sách **tầng đã map** sang thiết bị IoT trong phiên canh tác.
 *
 * ⚠ Nguồn dữ liệu: `GET /api/iot/floors` → lọc theo các tầng thuộc phiên
 *   (xem `utils/session-floor-matching.utils.ts` → `filterSessionFloorMappings`).
 *
 * ⚠ **Vì sao không dùng `floors` của `/iot-history` nữa?**
 *   BE đã **gỡ bỏ** endpoint `GET /api/cultivation-sessions/admin/{sessionId}/iot-history`
 *   (commit `4e136253`) ⇒ route trả **404**. Nguồn thay thế là danh sách tầng
 *   đã map (`/api/iot/floors`) — đây cũng là nguồn chuẩn mà BE dùng để gom
 *   lịch sử môi trường theo phiên (bảng `cultivation_environment_history`
 *   join qua `cultivation_session_trays` → `cultivation_trays` → `cultivation_floors`).
 *
 * ⚠ Vì sao cần hiển thị? Đây là thông tin **audit quan trọng**: cho biết
 *   thiết bị nào thực sự phục vụ phiên này (BE map theo thiết bị, không suy
 *   đoán được chỉ từ danh sách khay).
 *
 * ⚠ **`floorId` có thể `null`** — schema Swagger của `/api/iot/floors` không
 *   khai báo cột `floor_id` ⇒ ta hiển thị nhãn tầng theo `floor_name` /
 *   `floor_number` trước, chỉ fallback về `floor_id` khi không có gì khác.
 */
export function SessionMappedFloorList({
  floors,
}: {
  floors: SessionFloorMapping[]
}) {
  if (floors.length === 0) return null

  return (
    <section
      className="mcms-session-floor-mapping"
      aria-labelledby="session-floor-mapping-heading"
    >
      <Flex vertical gap={8}>
        <Flex align="center" gap={8}>
          <ApartmentOutlined aria-hidden="true" />
          <Typography.Text
            id="session-floor-mapping-heading"
            strong
            style={{ fontSize: 13 }}
          >
            Tầng & thiết bị phục vụ phiên
          </Typography.Text>
        </Flex>
        <Flex gap={8} wrap>
          {floors.map((floor, index) => (
            <Tag
              key={floor.floorId ?? `floor-${index}`}
              icon={<NodeIndexOutlined />}
              color="blue"
              style={{ padding: '4px 10px' }}
            >
              {/*
                ⚠ `floor_name` của BE đã là "Tầng 1" ⇒ không thêm tiều tố
                  "Tầng" để tránh lặp ("Tầng Tầng 1").
              */}
              {floor.floorName ??
                (floor.floorNumber != null
                  ? `Tầng ${floor.floorNumber}`
                  : floor.floorId != null
                    ? `Tầng #${floor.floorId}`
                    : `Tầng #${index + 1}`)}
              {floor.masterId != null ? ` · Master ${floor.masterId}` : ''}
              {floor.nodeAddress != null ? ` · Node ${floor.nodeAddress}` : ''}
            </Tag>
          ))}
        </Flex>
      </Flex>
    </section>
  )
}
