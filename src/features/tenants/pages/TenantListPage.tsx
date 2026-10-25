import { useMemo, useState } from 'react'
import { PlusOutlined } from '@ant-design/icons'
import { Col, Flex, Row, message } from 'antd'
import { TenantForm } from '../components/TenantForm'
import { TenantTable } from '../components/TenantTable'
import { useTenantStore } from '../store/tenant.store'
import { ActionButton, PageHeader, StatCard } from '../../../shared/ui'
import type { Tenant, TenantFormValues } from '../types/tenant.types'

export function TenantListPage() {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const tenants = useTenantStore((state) => state.tenants)
  const addTenant = useTenantStore((state) => state.addTenant)
  const updateTenant = useTenantStore((state) => state.updateTenant)

  const summary = useMemo(
    () => ({
      total: tenants.length,
      active: tenants.filter((tenant) => tenant.status === 'active').length,
      expired: tenants.filter((tenant) => tenant.status === 'expired').length,
    }),
    [tenants],
  )

  const handleAddTenant = () => {
    setEditingTenant(null)
    setIsModalVisible(true)
  }

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant)
    setIsModalVisible(true)
  }

  const handleSubmit = async (values: TenantFormValues) => {
    await new Promise((resolve) => window.setTimeout(resolve, 500))

    if (editingTenant) {
      updateTenant(editingTenant.id, values)
      message.success('Đã cập nhật khách thuê và khay được gán.')
    } else {
      addTenant(values)
      message.success('Đã thêm khách thuê và gán khay.')
    }

    setIsModalVisible(false)
    setEditingTenant(null)
  }

  return (
    <div>
      <PageHeader
        title="Khách thuê khay"
        description="Quản lý khách thuê và khay nấm đang được giao canh tác"
        actions={
          <ActionButton
            icon={<PlusOutlined />}
            label="Thêm khách thuê mới"
            description="Thêm một khách thuê và gán khay trống."
            variant="primary"
            size="middle"
            onClick={handleAddTenant}
          />
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 'var(--mcms-space-5)' }}>
        <Col xs={12} lg={8}>
          <StatCard
            title="Tổng khách thuê"
            value={summary.total}
            tone="neutral"
            description="Tất cả khách thuê trong hệ thống"
          />
        </Col>
        <Col xs={12} lg={8}>
          <StatCard
            title="Đang thuê"
            value={summary.active}
            tone="ok"
            highlightValue
            description="Khách thuê đang canh tác"
          />
        </Col>
        <Col xs={12} lg={8}>
          <StatCard
            title="Hết hạn"
            value={summary.expired}
            tone="muted"
            description="Hợp đồng đã kết thúc"
          />
        </Col>
      </Row>

      <Flex vertical>
        <TenantTable onEdit={handleEditTenant} />
      </Flex>

      <TenantForm
        visible={isModalVisible}
        initialValues={editingTenant ?? undefined}
        editingCustomerId={editingTenant?.id}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingTenant(null)
        }}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
