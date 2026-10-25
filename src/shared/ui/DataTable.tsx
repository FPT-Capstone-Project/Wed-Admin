import type { ReactNode } from 'react'
import { Alert, Button, Table } from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'
import { EmptyState } from './EmptyState'

export interface DataTableProps<T> {
  /** Cột của bảng. */
  columns: ColumnsType<T>
  /** Dữ liệu. */
  dataSource: T[]
  /** Khoá dòng — bắt buộc để React không re-mount sai dòng. */
  rowKey: TableProps<T>['rowKey']
  /** Đang tải — hiện spinner của antd. */
  loading?: boolean
  /** Lỗi tải dữ liệu — hiển thị alert có nút thử lại. */
  error?: { message?: string } | null
  /** Tiêu đề bảng. */
  title?: ReactNode
  /** Mô tả dưới tiêu đề. */
  description?: ReactNode
  /** Thanh công cụ phía trên bảng (bộ lọc, tìm kiếm, nút thêm). */
  toolbar?: ReactNode
  /** Nội dung khi bảng rỗng. */
  emptyTitle?: ReactNode
  emptyDescription?: ReactNode
  emptyAction?: ReactNode
  /** Callback khi bấm "Thử lại" sau lỗi. */
  onRetry?: () => void
  /** Cho phép cuộn ngang trên màn hình nhỏ. */
  scrollX?: number
  /** Phân trang (mặc định tắt — nhiều bảng dùng "Xem thêm"). */
  pagination?: TableProps<T>['pagination']
  size?: TableProps<T>['size']
  className?: string
}

/**
 * Bảng dữ liệu chuẩn.
 *
 * Chuẩn hoá:
 *   - Header bảng có tiêu đề + mô tả + toolbar, tách rõ khỏi phần dữ liệu.
 *   - Lỗi tải → Alert có nút "Thử lại" (không để bảng trắng không giải thích).
 *   - Rỗng → EmptyState có hướng dẫn, không phải dòng "Không có dữ liệu".
 *   - Cuộn ngang khi bảng rộng (tránh bẻ cột làm khó đọc trên tablet).
 *
 * ⚠ Không thay đổi logic / API — chỉ bọc lớp trình bày.
 */
export function DataTable<T extends object>({
  columns,
  dataSource,
  rowKey,
  loading = false,
  error = null,
  title,
  description,
  toolbar,
  emptyTitle = 'Chưa có dữ liệu',
  emptyDescription,
  emptyAction,
  onRetry,
  scrollX = 900,
  pagination = false,
  size = 'small',
  className,
}: DataTableProps<T>) {
  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="Không tải được dữ liệu."
        description={error.message ?? 'Đã xảy ra lỗi không xác định.'}
        action={
          onRetry ? (
            <Button size="small" onClick={onRetry}>
              Thử lại
            </Button>
          ) : undefined
        }
      />
    )
  }

  const hasHeader = Boolean(title || description || toolbar)

  return (
    <div className={className}>
      {hasHeader && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            marginBottom: 12,
          }}
        >
          {(title || description) && (
            <div>
              {title && (
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--mcms-text)',
                  }}
                >
                  {title}
                </div>
              )}
              {description && (
                <div style={{ fontSize: 13, color: 'var(--mcms-text-muted)' }}>
                  {description}
                </div>
              )}
            </div>
          )}
          {toolbar && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {toolbar}
            </div>
          )}
        </div>
      )}

      <Table<T>
        rowKey={rowKey}
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        size={size}
        pagination={pagination}
        scroll={{ x: scrollX }}
        locale={{
          emptyText: (
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              action={emptyAction}
            />
          ),
        }}
      />
    </div>
  )
}
