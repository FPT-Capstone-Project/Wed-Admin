import { Tabs } from 'antd'
import { TagsOutlined } from '@ant-design/icons'
import { PageHeader } from '../../shared/ui'
import { MushroomVarietyCatalog } from './components/MushroomVarietyCatalog'
import { MushroomConditionCatalog } from './components/MushroomConditionCatalog'
import { RentalPackageCatalog } from './components/RentalPackageCatalog'

/**
 * Admin section — mọi tài khoản đã qua AuthGuard đều có quyền CRUD.
 * (Role check cứng được bỏ qua vì ở mục này chỉ admin/operator/farm_manager
 * mới thấy trang trong sidebar; nếu BE trả role khác ta vẫn tin tưởng token.)
 *
 * ⚠ Giai đoạn 0: điều kiện sinh trưởng chỉ còn **nhiệt độ & độ ẩm**
 * (đã gỡ CO₂ và độ ẩm giá thể khỏi BE / DB).
 */
const CAN_MANAGE = true

export function PackageManagementPage() {
  return (
    <div>
      <PageHeader
        title={
          <>
            <TagsOutlined aria-hidden="true" /> Quản lý Giống nấm &amp; Gói thuê
          </>
        }
        description="Kho giống nấm, thông số canh tác, thời gian sinh trưởng và các gói thuê theo vụ mùa."
      />

      <div
        style={{
          background: 'var(--mcms-surface)',
          borderRadius: 'var(--mcms-radius-xl)',
          border: '1px solid var(--mcms-border)',
          padding: 16,
        }}
      >
        <Tabs
          defaultActiveKey="varieties"
          items={[
            {
              key: 'varieties',
              label: 'Giống nấm',
              children: <MushroomVarietyCatalog canManage={CAN_MANAGE} />,
            },
            {
              key: 'conditions',
              label: 'Điều kiện sinh trưởng',
              children: <MushroomConditionCatalog canManage={CAN_MANAGE} />,
            },
            {
              key: 'packages',
              label: 'Gói thuê',
              children: <RentalPackageCatalog canManage={CAN_MANAGE} />,
            },
          ]}
        />
      </div>
    </div>
  )
}
