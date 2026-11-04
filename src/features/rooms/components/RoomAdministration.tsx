import { DataTable } from '../../../shared/ui/DataTable'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Button, Collapse, Flex, Form, Input, InputNumber, Modal, Popconfirm } from 'antd'
import { cultivationRoomApi, type RoomRequest } from '../api/cultivation-room.api'
import { cultivationKeys, useCultivationRooms } from '../hooks/useCultivation'
import { iotKeys, useFloorList } from '../../devices/hooks/useIoT'
import { extractApiError, getApiErrorMessage } from '../../../shared/api/error'
import { QueryFeedback } from '../../../shared/ui/QueryFeedback'
import type { CultivationRoom } from '../../../types/cultivation'
function useResourceAction<T>(mutationFn: (value: T) => Promise<void>) {
  const client = useQueryClient()
  const { message } = App.useApp()
  return useMutation({ mutationFn, onSuccess: async () => {
    await Promise.all([client.invalidateQueries({ queryKey: cultivationKeys.all }), client.invalidateQueries({ queryKey: iotKeys.all })])
    void message.success('Đã cập nhật tài nguyên')
  }, onError: (error: Error) => {
    const detail = extractApiError(error)
    void message.error(detail.status === 409 ? `Không thể thực hiện do xung đột dữ liệu. ${detail.message}` : getApiErrorMessage(error))
  } })
}
function RoomForm({ room, onClose }: { room: CultivationRoom | null; onClose: () => void }) {
  const [form] = Form.useForm<RoomRequest>()
  const save = useResourceAction((payload: RoomRequest) => room ? cultivationRoomApi.update(room.room_id, payload) : cultivationRoomApi.create(payload))
  return <Modal open title={room ? 'Cập nhật phòng' : 'Thêm phòng'} onCancel={onClose} onOk={() => form.submit()} confirmLoading={save.isPending} cancelButtonProps={{ disabled: save.isPending }} closable={!save.isPending} maskClosable={false}>
    <Form form={form} layout="vertical" initialValues={room ? { roomCode: room.room_code, roomName: room.room_name, capacity: room.capacity, description: room.description } : { capacity: 1 }} onFinish={values => save.mutate(values, { onSuccess: onClose })}>
      <Form.Item name="roomCode" label="Mã phòng" rules={[{ required: true, whitespace: true }]}><Input maxLength={50} /></Form.Item>
      <Form.Item name="roomName" label="Tên phòng" rules={[{ required: true, whitespace: true }]}><Input maxLength={100} /></Form.Item>
      <Form.Item name="capacity" label="Sức chứa khay" rules={[{ required: true }, { type: 'integer', min: 0 }]}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="description" label="Mô tả"><Input.TextArea rows={3} /></Form.Item>
    </Form>
  </Modal>
}
export function FloorTrayActions({ floorId }: { floorId: number }) {
  const generate = useResourceAction(cultivationRoomApi.generateTrays)
  const clear = useResourceAction(cultivationRoomApi.clearTrays)
  const pending = generate.isPending || clear.isPending
  return <Flex gap={8} wrap>
    <Popconfirm title="Tạo lưới khay tự động?" description="Sinh khay theo số dòng và cột đã lưu trên tầng này." onConfirm={() => generate.mutateAsync(floorId).catch(() => undefined)}><Button disabled={pending} loading={generate.isPending}>Tạo lưới khay tự động</Button></Popconfirm>
    <Popconfirm title="Dọn dẹp khay trống?" description="Xóa các khay trống chưa gán phiên trên tầng. Hãy kiểm tra cấu hình trước khi tiếp tục." okText="Xóa khay trống" okButtonProps={{ danger: true }} onConfirm={() => clear.mutateAsync(floorId).catch(() => undefined)}><Button danger disabled={pending} loading={clear.isPending}>Dọn dẹp khay trống</Button></Popconfirm>
  </Flex>
}
export function RoomAdministration() {
  const rooms = useCultivationRooms()
  const floors = useFloorList()
  const [editing, setEditing] = useState<CultivationRoom | null | undefined>()
  const remove = useResourceAction(cultivationRoomApi.remove)
  return <>
    <Flex justify="end"><Button type="primary" onClick={() => setEditing(null)}>+ Thêm phòng</Button></Flex>
    <Collapse items={[{ key: 'resources', label: 'Cấu hình phòng & lưới khay', children: <>
      <QueryFeedback query={rooms} />
      {!rooms.isError && <DataTable<CultivationRoom> size="small" rowKey="room_id" dataSource={rooms.data} loading={rooms.isLoading} pagination={false} scroll={{ x: 650 }} columns={[
        { title: 'Mã phòng', dataIndex: 'room_code' }, { title: 'Tên phòng', dataIndex: 'room_name' }, { title: 'Sức chứa', dataIndex: 'capacity' },
        { title: 'Thao tác', render: (_, room) => <Flex gap={8}><Button onClick={() => setEditing(room)}>Sửa</Button><Popconfirm title="Xóa phòng này?" description="Phòng còn khay sẽ không thể xóa." onConfirm={() => remove.mutateAsync(room.room_id).catch(() => undefined)}><Button danger loading={remove.isPending && remove.variables === room.room_id} disabled={remove.isPending}>Xóa</Button></Popconfirm></Flex> },
      ]} />}
      <QueryFeedback query={floors} />
      {!floors.isError && <Collapse style={{ marginTop: 12 }} items={floors.data?.map(floor => ({ key: floor.floor_id, label: `${floor.floor_name} · Phòng #${floor.room_id} · Tầng #${floor.floor_id}`, children: <FloorTrayActions floorId={floor.floor_id} /> }))} />}
    </> }]} />
    {editing !== undefined && <RoomForm room={editing} onClose={() => setEditing(undefined)} />}
  </>
}
