/**
 * Cẩm nang giao diện MCMS — trang tạm CHỈ có ở môi trường dev.
 *
 * Mục đích: kiểm tra bằng mắt toàn bộ component trong `src/shared/ui` trước khi
 * áp dụng vào trang thật. Trang này KHÔNG gọi API, KHÔNG đụng logic nghiệp vụ.
 *
 * ⚠ Route chỉ được đăng ký khi `import.meta.env.DEV` (xem `src/app/router`),
 * nên bản build production không có route này. Guard bên dưới là lớp an toàn
 * thứ hai phòng khi page bị import nhầm.
 */

import {
  ApiOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  CloudOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FundOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  StopOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Card, Col, Flex, Input, Row, Space, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState, type ReactNode } from 'react'
import { toneLabels, type SemanticTone } from '../../app/theme/tokens'
import { IOT_TERMS } from '../../shared/i18n/terms'
import {
  ActionButton,
  DataTable,
  EmptyState,
  EmptyStateAction,
  PageHeader,
  StatCard,
  StatusBadge,
} from '../../shared/ui'

/* ──────────────────────────────────────────────────────────────────────────
 *  Dữ liệu mẫu (giả lập, không gọi API)
 * ────────────────────────────────────────────────────────────────────────── */

interface SampleTray {
  key: string
  code: string
  mushroom: string
  tier: string
  humidity: number
  temperature: number
  tone: SemanticTone
  status: string
}

const SAMPLE_TRAYS: SampleTray[] = [
  {
    key: 'kh-001',
    code: 'KH-001',
    mushroom: 'Nấm Bào Ngư King',
    tier: 'Tầng 1',
    humidity: 85,
    temperature: 24.5,
    tone: 'info',
    status: 'Đang cho thuê',
  },
  {
    key: 'kh-002',
    code: 'KH-002',
    mushroom: 'Nấm Bào Ngư Hồng',
    tier: 'Tầng 1',
    humidity: 78,
    temperature: 23.8,
    tone: 'ok',
    status: 'Còn trống',
  },
  {
    key: 'kh-003',
    code: 'KH-003',
    mushroom: 'Nấm Đông Cô',
    tier: 'Tầng 2',
    humidity: 91,
    temperature: 22.1,
    tone: 'warning',
    status: 'Độ ẩm cao',
  },
  {
    key: 'kh-004',
    code: 'KH-004',
    mushroom: 'Nấm Bào Ngư Xám',
    tier: 'Tầng 2',
    humidity: 64,
    temperature: 25.4,
    tone: 'danger',
    status: 'Mất kết nối',
  },
  {
    key: 'kh-005',
    code: 'KH-005',
    mushroom: 'Nấm Kim Châm',
    tier: 'Tầng 3',
    humidity: 88,
    temperature: 24,
    tone: 'muted',
    status: 'Tạm ngưng',
  },
]

/** Icon đi kèm mỗi tone — badge KHÔNG được chỉ dựa vào màu (WCAG 1.4.1). */
const TONE_ICONS: Record<SemanticTone, ReactNode> = {
  ok: <CheckCircleOutlined />,
  info: <InfoCircleOutlined />,
  warning: <WarningOutlined />,
  danger: <CloseCircleOutlined />,
  muted: <StopOutlined />,
  neutral: <QuestionCircleOutlined />,
}

const TONE_ORDER: SemanticTone[] = ['ok', 'info', 'warning', 'danger', 'muted', 'neutral']

/* ──────────────────────────────────────────────────────────────────────────
 *  Khung trình bày
 * ────────────────────────────────────────────────────────────────────────── */

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <Card
      size="small"
      title={<span style={{ fontSize: 15 }}>{title}</span>}
      extra={
        hint ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {hint}
          </Typography.Text>
        ) : undefined
      }
      styles={{ body: { padding: 16 } }}
    >
      {children}
    </Card>
  )
}

function SectionHint({ children }: { children: ReactNode }) {
  return (
    <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
      {children}
    </Typography.Text>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Nội dung cẩm nang
 * ────────────────────────────────────────────────────────────────────────── */

function StyleGuideContent() {
  const [searchText, setSearchText] = useState('')

  const filteredTrays = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()
    if (!keyword) return SAMPLE_TRAYS
    return SAMPLE_TRAYS.filter(
      (tray) =>
        tray.code.toLowerCase().includes(keyword) ||
        tray.mushroom.toLowerCase().includes(keyword) ||
        tray.tier.toLowerCase().includes(keyword),
    )
  }, [searchText])

  const columns: ColumnsType<SampleTray> = [
    {
      title: 'Mã khay',
      dataIndex: 'code',
      key: 'code',
      width: 110,
    },
    {
      title: 'Giống nấm',
      dataIndex: 'mushroom',
      key: 'mushroom',
    },
    {
      title: 'Tầng',
      dataIndex: 'tier',
      key: 'tier',
      width: 90,
    },
    {
      title: 'Độ ẩm',
      dataIndex: 'humidity',
      key: 'humidity',
      width: 100,
      align: 'right',
      render: (value: number) => `${value}%`,
    },
    {
      title: 'Nhiệt độ',
      dataIndex: 'temperature',
      key: 'temperature',
      width: 100,
      align: 'right',
      render: (value: number) => `${value}℃`,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 170,
      render: (_, tray) => (
        <StatusBadge
          tone={tray.tone}
          label={tray.status}
          icon={TONE_ICONS[tray.tone]}
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 190,
      onCell: () => ({ className: 'ant-table-cell-action' }),
      render: () => (
        <Space size={4}>
          {/* Hành động chính → LUÔN hiện chữ. */}
          <ActionButton icon={<EyeOutlined />} label="Xem" />
          <ActionButton icon={<EditOutlined />} label="Sửa" />
          {/* Xóa → icon-only, tooltip vẫn bắt buộc. */}
          <ActionButton
            icon={<DeleteOutlined />}
            label="Xóa"
            description="Xóa khay khỏi tầng"
            variant="danger"
            hideLabel
          />
        </Space>
      ),
    },
  ]

  return (
    <Flex vertical gap={16}>
      <PageHeader
        title="Cẩm nang giao diện"
        description="Trang tạm dùng để kiểm tra bằng mắt các component dùng chung. Chỉ có ở môi trường phát triển."
        actions={
          <>
            <ActionButton
              icon={<ReloadOutlined />}
              label="Tải lại"
              description="Tải lại dữ liệu mẫu"
              onClick={() => setSearchText('')}
            />
            <ActionButton
              icon={<DownloadOutlined />}
              label="Xuất báo cáo"
              variant="primary"
            />
          </>
        }
      />

      {/* ── StatusBadge ─────────────────────────────────────────────────── */}
      <Section
        title="Trạng thái (StatusBadge)"
        hint="Luôn có chữ, không chỉ dựa vào màu"
      >
        <Flex vertical gap={16}>
          <Flex gap={8} wrap align="center">
            {TONE_ORDER.map((tone) => (
              <StatusBadge
                key={tone}
                tone={tone}
                label={toneLabels[tone]}
                icon={TONE_ICONS[tone]}
              />
            ))}
          </Flex>

          <Flex gap={20} wrap align="center">
            <Flex gap={8} align="center">
              <SectionHint>Chấm tròn (dùng trong biểu đồ):</SectionHint>
              {TONE_ORDER.map((tone) => (
                <StatusBadge
                  key={tone}
                  tone={tone}
                  label={toneLabels[tone]}
                  dot
                />
              ))}
            </Flex>
          </Flex>
        </Flex>
      </Section>

      {/* ── StatCard ────────────────────────────────────────────────────── */}
      <Section title="Thẻ số liệu (StatCard)" hint="Con số là trọng tâm">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <StatCard
              title="Tỷ lệ lấp đầy khay"
              value={72}
              suffix="%"
              tone="ok"
              description="72 / 100 khay đang được thuê"
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard
              title="Doanh thu tháng này"
              value="18,4"
              suffix="triệu ₫"
              tone="info"
              icon={<FundOutlined />}
              description="Tính trên các vụ thuê đã hoàn tất"
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard
              title="Nhiệt độ trung bình"
              value={24.2}
              suffix="℃"
              tone="warning"
              description="Tầng 2 đang vượt ngưỡng"
              highlightValue
              hint="Ngưỡng đề xuất cho nấm Bào Ngư: 22–26℃"
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard
              title="Cảm biến mất tín hiệu"
              value={3}
              suffix="cảm biến"
              tone="danger"
              icon={<ApiOutlined />}
              description="Kiểm tra kết nối RS485"
              highlightValue
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard
              title="Khay còn trống"
              value={28}
              suffix="khay"
              tone="muted"
              description="Sẵn sàng cho vụ thuê mới"
            />
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <StatCard
              title="Hồ sơ vi khí hậu"
              value={12}
              suffix="hồ sơ"
              tone="neutral"
              description="Chưa gắn loại nấm"
            />
          </Col>
        </Row>
      </Section>

      {/* ── ActionButton ────────────────────────────────────────────────── */}
      <Section
        title="Nút hành động (ActionButton)"
        hint="Hành động chính luôn hiện chữ"
      >
        <Flex vertical gap={16}>
          <div>
            <SectionHint>
              Hành động chính — luôn hiện chữ (Xem, Sửa, Duyệt, Tưới ngay).
            </SectionHint>
            <Flex gap={8} wrap style={{ marginTop: 8 }}>
              <ActionButton icon={<EyeOutlined />} label="Xem" variant="primary" />
              <ActionButton icon={<EditOutlined />} label="Sửa" />
              <ActionButton icon={<CheckOutlined />} label="Duyệt" />
              <ActionButton icon={<CloudOutlined />} label="Tưới ngay" />
            </Flex>
          </div>

          <div>
            <SectionHint>
              Xóa và hành động phụ — ẩn chữ, giữ tooltip và nhãn trợ năng.
            </SectionHint>
            <Flex gap={8} wrap align="center" style={{ marginTop: 8 }}>
              <ActionButton
                icon={<DeleteOutlined />}
                label="Xóa"
                description="Xóa vụ thuê"
                variant="danger"
                hideLabel
              />
              <ActionButton
                icon={<ReloadOutlined />}
                label="Tải lại"
                hideLabel
              />
              <ActionButton
                icon={<EditOutlined />}
                label="Ghi chú"
                description="Ghi chú vụ thuê"
                hideLabel
              />
              <ActionButton
                icon={<DownloadOutlined />}
                label="Xuất báo cáo"
                hideLabel
              />
            </Flex>
          </div>

          <div>
            <SectionHint>Trạng thái nút.</SectionHint>
            <Flex gap={8} wrap align="center" style={{ marginTop: 8 }}>
              <ActionButton
                icon={<EyeOutlined />}
                label="Không có quyền"
                disabled
              />
              <ActionButton
                icon={<CheckOutlined />}
                label="Đang lưu"
                loading
              />
              <ActionButton
                icon={<CloudOutlined />}
                label="Tưới ngay (cỡ lớn)"
                size="large"
              />
            </Flex>
          </div>
        </Flex>
      </Section>

      {/* ── DataTable ───────────────────────────────────────────────────── */}
      <Section
        title="Bảng dữ liệu (DataTable)"
        hint="Có tiêu đề, thanh công cụ và cột thao tác"
      >
        <Flex vertical gap={16}>
          <DataTable<SampleTray>
            className="mcms-data-table"
            title="Danh sách khay nấm"
            description="Dữ liệu mẫu để kiểm tra bố cục bảng và cột thao tác."
            toolbar={
              <>
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="Tìm theo mã khay, giống nấm…"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  style={{ width: 260 }}
                />
                <ActionButton
                  icon={<PlusOutlined />}
                  label="Thêm khay"
                  variant="primary"
                />
              </>
            }
            columns={columns}
            dataSource={filteredTrays}
            rowKey="key"
            scrollX={900}
            emptyTitle="Không tìm thấy khay nào"
            emptyDescription="Thử lại với từ khoá khác, ví dụ “KH-00”."
          />

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <DataTable<SampleTray>
                className="mcms-data-table"
                title="Bảng đang tải"
                description="Hiển thị spinner trong lúc chờ dữ liệu."
                columns={columns}
                dataSource={[]}
                rowKey="key"
                loading
                scrollX={900}
              />
            </Col>
            <Col xs={24} lg={12}>
              <DataTable<SampleTray>
                className="mcms-data-table"
                title="Bảng lỗi"
                description="Có nút thử lại để không bỏ lỡ dữ liệu."
                columns={columns}
                dataSource={[]}
                rowKey="key"
                error={{ message: 'Không kết nối được máy chủ.' }}
                onRetry={() => undefined}
                scrollX={900}
              />
            </Col>
          </Row>

          <DataTable<SampleTray>
            className="mcms-data-table"
            title="Bảng chưa có dữ liệu"
            description="Trạng thái rỗng kèm hướng dẫn và nút hành động."
            columns={columns}
            dataSource={[]}
            rowKey="key"
            scrollX={900}
            emptyTitle="Chưa có khay nào trong tầng này"
            emptyDescription="Thêm khay đầu tiên để bắt đầu cho thuê."
            emptyAction={
              <EmptyStateAction onClick={() => undefined}>Thêm khay</EmptyStateAction>
            }
          />
        </Flex>
      </Section>

      {/* ── EmptyState ──────────────────────────────────────────────────── */}
      <Section
        title="Trạng thái rỗng (EmptyState)"
        hint="Nói rõ đang trống vì lý do gì và làm gì tiếp theo"
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card size="small" styles={{ body: { padding: 0 } }}>
              <EmptyState
                title="Chưa có vụ thuê nào"
                description="Khi khách đặt khay, vụ thuê sẽ xuất hiện ở đây."
                action={
                  <EmptyStateAction onClick={() => undefined}>
                    Xem gói cước đang mở
                  </EmptyStateAction>
                }
                secondaryAction={
                  <EmptyStateAction type="default" onClick={() => undefined}>
                    Hướng dẫn thêm khay
                  </EmptyStateAction>
                }
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card size="small" styles={{ body: { padding: 0 } }}>
              <EmptyState
                icon={<CloudOutlined style={{ color: 'var(--mcms-text-muted)' }} />}
                title="Chưa gắn thiết bị tưới"
                description="Gắn bộ điều khiển trung tâm cho tầng để bật tưới tự động."
                action={
                  <EmptyStateAction onClick={() => undefined}>
                    Gắn thiết bị
                  </EmptyStateAction>
                }
              />
            </Card>
          </Col>
        </Row>
      </Section>

      {/* ── Thuật ngữ ───────────────────────────────────────────────────── */}
      <Section
        title="Bảng thuật ngữ"
        hint="Nhãn dùng xuyên suốt giao diện"
      >
        <Flex vertical gap={12}>
          {Object.values(IOT_TERMS).slice(0, 8).map((term) => (
            <div key={term.label}>
              <Typography.Text strong>{term.label}</Typography.Text>
              {term.description && (
                <Typography.Text
                  type="secondary"
                  style={{ fontSize: 13, display: 'block' }}
                >
                  {term.description}
                </Typography.Text>
              )}
            </div>
          ))}
        </Flex>
      </Section>
    </Flex>
  )
}

/* ──────────────────────────────────────────────────────────────────────────
 *  Trang (có guard môi trường)
 * ────────────────────────────────────────────────────────────────────────── */

export function StyleGuidePage() {
  if (!import.meta.env.DEV) return null
  return <StyleGuideContent />
}
