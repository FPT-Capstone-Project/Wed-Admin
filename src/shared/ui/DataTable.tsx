import type { ReactNode } from 'react'
import { Alert, Button, Table } from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'
import { EmptyState } from './EmptyState'

export interface DataTableProps<T> {
  /** Cột của bảng. */
  columns: ColumnsType<T>
  /** Dữ liệu. */
  dataSource: T[] | undefined
  /** Khoá dòng — bắt buộc để React không re-mount sai dòng. */
  rowKey: TableProps<T>['rowKey']
  onRow?: TableProps<T>['onRow']
  onChange?: TableProps<T>['onChange']
  expandable?: TableProps<T>['expandable']
  rowClassName?: TableProps<T>['rowClassName']
  locale?: TableProps<T>['locale']
  scroll?: TableProps<T>['scroll']
  /** Đang tải — hiện spinner của antd. */
  loading?: boolean
  /** Background refresh; keep rows visible with subdued feedback. */
  isFetching?: boolean
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
  /**
   * Độ rộng tối thiểu để bảng cuộn ngang.
   *
   * ⚠ Truyền `null` ⇒ **KHÔNG** cuộn ngang: bảng co lại vừa bề rộng cột
   *   (dùng cho bảng gọn 1 màn hình desktop — xem `SessionListPage.tsx`).
   */
  scrollX?: number | null
  /** Phân trang (mặc định tắt — nhiều bảng dùng "Xem thêm"). */
  pagination?: TableProps<T>['pagination']
  size?: TableProps<T>['size']
  /**
   * Chiến lược bố trí bảng.
   *
   * ⚠ `'fixed'` ⇒ bảng **co theo** bề rộng cột đã khai báo (không co giãn
   *   theo nội dung) ⇒ dùng cho bảng cần vừa đúng 1 màn hình.
   */
  tableLayout?: TableProps<T>['tableLayout']
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
  dataSource = [],
  rowKey,
  onRow,
  onChange,
  expandable,
  rowClassName,
  locale,
  scroll,
  loading = false,
  isFetching = false,
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
  tableLayout,
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
            <Button type="text" size="small" onClick={onRetry} loading={loading}>
              Thử lại
            </Button>
          ) : undefined
        }
      />
    )
  }

  const hasHeader = Boolean(title || description || toolbar)

  return (
    <div className={['mcms-data-table', className].filter(Boolean).join(' ')} aria-busy={loading || isFetching}>
      {hasHeader && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--mcms-space-2)',
            marginBottom: 'var(--mcms-space-3)',
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
                gap: 'var(--mcms-space-2)',
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
        style={{ opacity: isFetching && !loading ? 0.6 : 1 }}
        rowKey={rowKey}
        onRow={onRow}
        onChange={onChange}
        expandable={expandable}
        rowClassName={rowClassName}
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        size={size}
        tableLayout={tableLayout}
        pagination={pagination === false ? false : {
          size: 'small',
          responsive: true,
          showSizeChanger: false,
          hideOnSinglePage: true,
          ...pagination,
        }}
        scroll={
          scrollX == null
            ? scroll
            : { x: scrollX, ...scroll }
        }
        locale={{
          emptyText: loading ? <span role="status">Đang tải dữ liệu…</span> : (
            <EmptyState
              title={emptyTitle}
              description={emptyDescription}
              action={emptyAction}
            />
          ),
          ...locale,
        }}
      />
    </div>
  )
}
