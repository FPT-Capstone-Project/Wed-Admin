import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Button, Modal, Radio, Space, Spin, Typography } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useImouPlayerToken } from '../hooks/useCameras'
import { getApiErrorMessage } from '../../../shared/api/error'
import { ActionButton, EmptyState } from '../../../shared/ui'
import type { Camera } from '../../../types/camera.types'
import {
  IMOU_API_DOMAIN,
  IMOU_PLAYER_DOM_ID,
  IMOU_WASM_LIB_PATH,
  describeImouPlayerError,
  loadImouPlayerSdk,
  readImouPlayerMessage,
  type ImouPlayerInstance,
  type ImouPlayerOptions,
} from '../utils/imou-player.sdk'

interface CameraStreamModalProps {
  open: boolean
  /** Camera đang xem; null → modal đóng. */
  camera: Camera | null
  onClose: () => void
}

/** Channel mặc định: channel 0 */
const DEFAULT_CHANNEL_ID = '0'
const HD_STREAM_ID = 0
const SD_STREAM_ID = 1

/** Tăng timeout lên 30s giống file index.html để Wasm kịp nạp luồng từ Singapore */
const BOOT_TIMEOUT_MS = 30_000

export function CameraStreamModal({
  open,
  camera,
  onClose,
}: CameraStreamModalProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<ImouPlayerInstance | null>(null)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [isPlayerBooting, setPlayerBooting] = useState(false)
  const [playerGeneration, setPlayerGeneration] = useState(0)

  // State chọn luồng HD (0) hoặc SD (1)
  const [selectedStreamId, setSelectedStreamId] = useState<number>(HD_STREAM_ID)

  const cameraId = open ? (camera?.id ?? null) : null

  // Truyền selectedStreamId vào API lấy KitToken
  const {
    data: tokenPayload,
    isLoading: isLoadingToken,
    isFetching: isFetchingToken,
    isError: isTokenError,
    error: tokenError,
    refetch: refetchToken,
  } = useImouPlayerToken(cameraId, {
    channelId: DEFAULT_CHANNEL_ID,
    streamId: selectedStreamId,
  })

  const kitToken = tokenPayload?.kitToken?.trim() || null
  const deviceId =
    tokenPayload?.deviceId?.trim() || camera?.cameraCode?.trim() || ''
  const channelId = tokenPayload?.channelId?.trim() || DEFAULT_CHANNEL_ID
  const currentStreamId = tokenPayload?.streamId ?? selectedStreamId

  /** Lấy token mới + dựng lại player */
  const handleRefreshToken = useCallback(() => {
    setPlayerGeneration((generation) => generation + 1)
    void refetchToken()
  }, [refetchToken])

  useEffect(() => {
    if (!open || !kitToken || !deviceId) {
      return
    }

    let disposed = false
    let bootTimer: number | null = null
    const host = hostRef.current

    const boot = async () => {
      setPlayerError(null)
      setPlayerBooting(true)

      try {
        const ImouPlayer = await loadImouPlayerSdk()
        if (disposed) return

        if (!host) {
          setPlayerError('Không tìm thấy khung phát camera.')
          setPlayerBooting(false)
          return
        }

        // Đợi layout xong trước khi đo kích thước khung
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve())
        })
        if (disposed) return

        host.replaceChildren()
        const mount = document.createElement('div')
        mount.id = IMOU_PLAYER_DOM_ID
        mount.className = 'camera-stream-modal-player-root'
        host.appendChild(mount)

        const width = Math.max(host.clientWidth || 0, 320)
        const height = Math.max(Math.round((width * 9) / 16), 180)

        // Cấu hình chuẩn theo file index.html
        const playerConfig: ImouPlayerOptions = {
          id: IMOU_PLAYER_DOM_ID,
          width,
          height,
          deviceId,
          channelId,
          token: kitToken,
          type: 1,
          streamId: currentStreamId,
          recordType: 'cloud',
          muted: false,
         
          title: camera?.cameraName || camera?.cameraCode || 'Camera',
          domain: IMOU_API_DOMAIN,
          WasmLibPath: IMOU_WASM_LIB_PATH,
          dpr: window.devicePixelRatio || 0,
          handleError: (err) => {
            if (disposed) return
            setPlayerError(describeImouPlayerError(err))
            setPlayerBooting(false)
          },
          handleCallBack: (event) => {
            if (disposed) return
            // Tắt trạng thái booting ngay khi nhận được frame đầu tiên
            if (event?.type === 'playStart') {
              setPlayerBooting(false)
              if (bootTimer !== null) {
                window.clearTimeout(bootTimer)
                bootTimer = null
              }
            }
          },
        }

        console.log('[ImouPlayer Config]', playerConfig)

        const player = new ImouPlayer(playerConfig)

        if (disposed) {
          player.destroy()
          return
        }

        playerRef.current = player

        // Hết 30 giây không phát được mới báo lỗi
        bootTimer = window.setTimeout(() => {
          if (disposed) return
          setPlayerBooting(false)
          const sdkMessage = readImouPlayerMessage(player)
          setPlayerError(
            sdkMessage
              ? `Imou không cấp được địa chỉ phát: ${sdkMessage}`
              : 'Player không phát được luồng. Kiểm tra thiết bị Imou hoặc đổi sang luồng SD.',
          )
        }, BOOT_TIMEOUT_MS)
      } catch (error: unknown) {
        if (disposed) return
        setPlayerError(
          error instanceof Error
            ? error.message
            : 'Không khởi tạo được trình phát ImouPlayer.',
        )
        setPlayerBooting(false)
      }
    }

    void boot()

    return () => {
      disposed = true
      if (bootTimer !== null) window.clearTimeout(bootTimer)
      const player = playerRef.current
      playerRef.current = null
      try {
        player?.stop()
      } catch {
        /* ignore */
      }
      try {
        player?.destroy()
      } catch {
        /* ignore */
      }
      host?.replaceChildren()
    }
  }, [
    open,
    kitToken,
    deviceId,
    channelId,
    currentStreamId,
    playerGeneration,
    camera?.cameraName,
    camera?.cameraCode,
  ])

  const apiErrorMessage = isTokenError ? getApiErrorMessage(tokenError) : null
  const missingToken =
    open && !isLoadingToken && !isTokenError && cameraId !== null && !kitToken
  const missingDevice =
    open && Boolean(kitToken) && !deviceId
      ? 'Thiếu Imou device ID (camera code) — không gắn được KitToken vào player.'
      : null

  const errorMessage =
    playerError ??
    apiErrorMessage ??
    (missingToken
      ? 'Máy chủ không trả về KitToken. Không thể mở luồng live.'
      : null) ??
    missingDevice

  const isLoading =
    open &&
    (isLoadingToken || isFetchingToken || (Boolean(kitToken) && isPlayerBooting))

  return (
    <Modal
      title={
        <span>
          Live — {camera?.cameraName || camera?.cameraCode || 'Camera'}
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={
        <Button type="primary" onClick={onClose}>
          Đóng
        </Button>
      }
      width={880}
      destroyOnHidden
      styles={{ body: { paddingTop: 8 } }}
    >
      <div className="camera-stream-modal">
        {errorMessage ? (
          <Alert
            type="error"
            showIcon
            title="Không xem được luồng live."
            description={errorMessage}
            action={
              <button
                type="button"
                className="camera-stream-modal-retry"
                onClick={handleRefreshToken}
              >
                Thử lại
              </button>
            }
          />
        ) : null}

        <div className="camera-stream-modal-stage">
          {isLoading ? (
            <div className="camera-stream-modal-loading">
              <Spin
                size="large"
                description="Đang nạp ImouPlayer và kết nối luồng live…"
              />
            </div>
          ) : null}

          <div ref={hostRef} className="camera-stream-modal-player" />

          {missingToken && !isLoading ? (
            <div className="camera-stream-modal-empty">
              <EmptyState
                title="Không có KitToken cho camera này"
                description="Backend chưa cấp token ImouPlayer, hoặc camera chưa được cấu hình trên Imou cloud."
                action={
                  <ActionButton
                    icon={<ReloadOutlined />}
                    label="Lấy lại KitToken"
                    variant="primary"
                    onClick={handleRefreshToken}
                  />
                }
              />
            </div>
          ) : null}
        </div>

        {kitToken ? (
          <div className="camera-stream-modal-meta">
            <Space size={12} wrap align="center">
              {/* Nút bấm chuyển đổi trực tiếp giữa HD (0) và SD (1) */}
              <Radio.Group
                size="small"
                value={selectedStreamId}
                onChange={(e) => {
                  setSelectedStreamId(e.target.value)
                  setPlayerGeneration((gen) => gen + 1)
                }}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value={HD_STREAM_ID}>HD (Luồng 0)</Radio.Button>
                <Radio.Button value={SD_STREAM_ID}>SD (Luồng 1)</Radio.Button>
              </Radio.Group>

              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Channel: {channelId}
              </Typography.Text>
              {deviceId ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Device: {deviceId}
                </Typography.Text>
              ) : null}
              <ActionButton
                icon={<ReloadOutlined />}
                label="Lấy lại token"
                description="KitToken có thời hạn — lấy token mới nếu video dừng hoặc báo lỗi."
                variant="text"
                size="small"
                loading={isFetchingToken}
                onClick={handleRefreshToken}
              />
            </Space>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}