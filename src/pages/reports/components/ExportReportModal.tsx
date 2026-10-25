import { useState } from 'react'
import {
  FileExcelOutlined,
  FilePdfOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import {
  Modal,
  Radio,
  Space,
  Typography,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { tones } from '../../../app/theme/tokens'

interface ExportReportModalProps {
  open: boolean
  onCancel: () => void
  /** Tên gợi ý khi export */
  reportTitle: string
}

type ExportFormat = 'CSV' | 'PDF'

export function ExportReportModal({
  open,
  onCancel,
  reportTitle,
}: ExportReportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('CSV')
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // Demo: chỉ mô phỏng quá trình export
      await new Promise((resolve) => window.setTimeout(resolve, 600))

      if (format === 'CSV') {
        // Placeholder: các trang trước đã có handleExportCsv; ở đây chỉ notify
        message.success('Đã xuất báo cáo Executive CSV.')
      } else {
        message.success('Đã xuất báo cáo Executive PDF.')
      }
      onCancel()
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <Space>
          <DownloadOutlined />
          Xuất báo cáo Executive
        </Space>
      }
      onOk={handleExport}
      okText="Tải xuống"
      cancelText="Hủy"
      confirmLoading={isExporting}
      okButtonProps={{ icon: <DownloadOutlined /> }}
      destroyOnHidden
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Typography.Text type="secondary">
          Báo cáo: <strong>{reportTitle}</strong>
          <br />
          Thời điểm xuất: {dayjs().format('DD/MM/YYYY HH:mm')}
        </Typography.Text>

        <Radio.Group
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Radio value="CSV">
              <Space>
                <FileExcelOutlined style={{ color: tones.ok.solid }} />
                <strong>CSV</strong> — phù hợp import vào Excel/Google Sheets.
              </Space>
            </Radio>
            <Radio value="PDF">
              <Space>
                <FilePdfOutlined style={{ color: tones.danger.solid }} />
                <strong>PDF</strong> — bản trình bày hội đồng quản trị.
              </Space>
            </Radio>
          </Space>
        </Radio.Group>
      </Space>
    </Modal>
  )
}
