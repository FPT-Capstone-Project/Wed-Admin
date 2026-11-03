import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Flex, Form, Input, Modal, Popconfirm, Select, Table } from 'antd'
import { useDeleteCamera, useRegisterCamera, useUpdateCamera } from '../hooks/useCameras'
import { cameraApi } from '../api/camera.api'
import { useCultivationRooms } from '../../rooms/hooks/useCultivation'
import { CAMERA_STATUSES, type Camera, type CreateCameraRequest } from '../../../types/camera.types'
import { getApiErrorMessage } from '../../../shared/api/error'
import { QueryFeedback } from '../../../shared/ui/QueryFeedback'
export function CameraFormModal({ camera, onClose }: { camera: Camera | null; onClose: () => void }) {
  const [form] = Form.useForm<CreateCameraRequest>()
  const rooms = useCultivationRooms()
  const { message } = App.useApp()
  const options = { onSuccess: () => { void message.success('Đã lưu camera'); onClose() }, onError: (error: Error) => { void message.error(getApiErrorMessage(error)) } }
  const create = useRegisterCamera(options)
  const update = useUpdateCamera(options)
  const pending = create.isPending || update.isPending
  return <Modal open title={camera ? 'Cập nhật Camera Imou' : 'Đăng ký Camera Imou'} onCancel={onClose} onOk={() => form.submit()} confirmLoading={pending} cancelButtonProps={{ disabled: pending }} closable={!pending} maskClosable={false} okButtonProps={{ disabled: rooms.isLoading || rooms.isError }}>
    <QueryFeedback query={rooms} />
    <Form form={form} layout="vertical" initialValues={camera ?? { status: 'ACTIVE' }} onFinish={values => { const payload = { ...values, cameraCode: values.cameraCode.trim(), cameraName: values.cameraName.trim(), streamUrl: values.streamUrl?.trim() || null }; if (camera) update.mutate({ id: camera.id, ...payload }); else create.mutate(payload) }}>
      <Form.Item name="roomId" label="Phòng" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={rooms.data?.map(room => ({ value: room.room_id, label: `${room.room_code} · ${room.room_name}` }))} /></Form.Item>
      <Form.Item name="cameraCode" label="Imou Device ID" rules={[{ required: true, whitespace: true }]}><Input maxLength={100} /></Form.Item>
      <Form.Item name="cameraName" label="Tên camera" rules={[{ required: true, whitespace: true }]}><Input maxLength={255} /></Form.Item>
      <Form.Item name="streamUrl" label="Stream URL (tùy chọn)" rules={[{ validator: (_, value: string | undefined) => !value?.trim() || /^(https?|rtsp):\/\/\S+$/i.test(value.trim()) ? Promise.resolve() : Promise.reject(new Error('Nhập URL HTTP, HTTPS hoặc RTSP hợp lệ')) }]}><Input /></Form.Item>
      <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}><Select options={CAMERA_STATUSES.map(value => ({ value, label: value }))} /></Form.Item>
    </Form>
  </Modal>
}
export function CameraRowActions({ camera }: { camera: Camera }) {
  const [editing, setEditing] = useState(false)
  const { message } = App.useApp()
  const remove = useDeleteCamera({ onSuccess: () => { void message.success('Đã xóa camera') }, onError: error => { void message.error(getApiErrorMessage(error)) } })
  return <Flex gap={8}><Button onClick={() => setEditing(true)}>Sửa</Button><Popconfirm title="Xóa camera khỏi hệ thống?" description="Camera sẽ không còn khả dụng trong danh sách giám sát." onConfirm={() => remove.mutateAsync(camera.id).catch(() => undefined)}><Button danger loading={remove.isPending}>Xóa</Button></Popconfirm>{editing && <CameraFormModal camera={camera} onClose={() => setEditing(false)} />}</Flex>
}
export function CameraRegistrationButton() {
  const [open, setOpen] = useState(false)
  return <><Button type="primary" onClick={() => setOpen(true)}>+ Đăng ký Camera</Button>{open && <CameraFormModal camera={null} onClose={() => setOpen(false)} />}</>
}
export function LiveSessionManager() {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const client = useQueryClient()
  const { message } = App.useApp()
  const query = useQuery({ queryKey: ['live-streams', 'admin', page], queryFn: () => cameraApi.adminLiveSessions(page, 20), enabled: open, gcTime: 0 })
  const stop = useMutation({ mutationFn: cameraApi.stopLiveSession, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['live-streams'] }); void message.success('Đã dừng phiên stream') }, onError: (error: Error) => { void message.error(getApiErrorMessage(error)) } })
  return <><Button onClick={() => setOpen(true)}>Quản lý phiên stream</Button><Modal open={open} title="Phiên stream đang hoạt động" onCancel={() => { setOpen(false); stop.reset() }} footer={null} width={760} destroyOnHidden>
    <QueryFeedback query={query} />{!query.isError && <Table size="small" rowKey="liveToken" loading={query.isLoading} dataSource={query.data?.lives} pagination={{ current: page, pageSize: 20, total: query.data?.count, onChange: setPage, showSizeChanger: false }} columns={[
      { title: 'Camera', render: (_, live) => live.camera?.cameraName ?? live.deviceId ?? 'Thiết bị chưa đăng ký' },
      { title: 'Kênh', dataIndex: 'channelId' },
      { title: 'Trạng thái', dataIndex: 'liveStatus' },
      { title: 'Thao tác', render: (_, live) => <Popconfirm title="Dừng phiên stream?" description="Người đang xem phiên này sẽ bị ngắt kết nối." onConfirm={() => stop.mutateAsync(live.liveToken).catch(() => undefined)}><Button danger disabled={stop.isPending} loading={stop.isPending && stop.variables === live.liveToken}>Dừng stream</Button></Popconfirm> },
    ]} />}
  </Modal></>
}
