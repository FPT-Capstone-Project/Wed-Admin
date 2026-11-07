import { ApartmentOutlined, NodeIndexOutlined } from '@ant-design/icons'
import { Flex, Tag, Typography } from 'antd'
import type { SessionMappedFloor } from '../types/session-iot-history.types'

/**
 * Danh sách **tầng đã map** sang thiết bị IoT trong phiên canh tác.
 *
 * ⚠ Nguồn dữ liệu: `GET /api/cultivation-sessions/admin/{sessionId}/iot-history`
 *   → trường `floors` / `mapped_floors` (xem `api/session-iot-history.api.ts`).
 *
 * ⚠ Vì sao cần hiển thị? Đây là thông tin **audit quan trọng**: cho biết
 *   lệnh & cảm biến nào thực sự phục vụ phiên này (BE map theo thiết bị,
 *   không suy đoán được từ danh sách khay).
 */
export function SessionMappedFloorList({
  floors,
}: {
  floors: SessionMappedFloor[]
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
              key={floor.floor_id ?? `floor-${index}`}
              icon={<NodeIndexOutlined />}
              color="blue"
              style={{ padding: '4px 10px' }}
            >
              {floor.floor_name ??
                (floor.floor_number != null
                  ? `Tầng ${floor.floor_number}`
                  : `Tầng #${floor.floor_id ?? index + 1}`)}
              {floor.master_identifier ?? floor.master_id
                ? ` · ${floor.master_identifier ?? floor.master_id}`
                : ''}
              {floor.node_address != null ? ` · Node ${floor.node_address}` : ''}
            </Tag>
          ))}
        </Flex>
      </Flex>
    </section>
  )
}
