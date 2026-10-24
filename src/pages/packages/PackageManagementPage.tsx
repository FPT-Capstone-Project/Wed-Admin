import { Tabs } from 'antd'
import { TagsOutlined } from '@ant-design/icons'
import { Typography } from 'antd'
import { MushroomVarietyCatalog } from './components/MushroomVarietyCatalog'
import { RentalPackageCatalog } from './components/RentalPackageCatalog'

/**
 * Admin section — mọi tài khoản đã qua AuthGuard đều có quyền CRUD.
 * (Role check cứng được bỏ qua vì ở mục này chỉ admin/operator/farm_manager
 *  mới thấy trang trong sidebar; nếu BE trả role khác ta vẫn tin tưởng token.)
 */
const CAN_MANAGE = true

export function PackageManagementPage() {
  return (
    <div>
      <Typography.Title level={3} style={{ margin: '0 0 20px' }}>
        <TagsOutlined /> Quản lý Giống nấm & Gói thuê
      </Typography.Title>

      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #f0f0f0',
          padding: 20,
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
