import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, App, Button, Modal, Space, Spin, Typography } from 'antd'
import { DisconnectOutlined } from '@ant-design/icons'
import type Hls from 'hls.js'
import { cameraApi } from '../api/camera.api'
import { useCameraLiveStream, useStopLiveStream } from '../hooks/useCameras'
import { CAMERA_MANAGE } from '../../auth/permissions'
import { useHasPermission } from '../../auth/hooks/usePermission'
import { getApiErrorMessage } from '../../../shared/api/error'
import { ActionButton, EmptyState } from '../../../shared/ui'
import type { Camera } from '../../../types/camera.types'

interface CameraStreamModalProps {
  open: boolean
  /** Camera đang xem; null → modal đóng. */
  camera: Camera | null
  onClose: () => void
}

/**
 * Modal xem live stream của một camera.
 *
 * Luồng dữ liệu:
 *  1. Nếu camera có `streamUrl` (admin tự nhập) → phát thẳng URL đó.
 *  2. Nếu không → gọi `GET /api/cameras/{id}/live-stream`, BE trả
 *     `{ data: { cameraId, cameraName, channelId, stream: { url } } }` →
 *     hook đã unwrap lớp `data` → dùng `stream.url`.
 *
 * Phát:
 *  - Safari/iOS hỗ trợ HLS native → gán thẳng `video.src = url`.
 *  - Trình duyệt khác → `new Hls()` + `hls.loadSource(url)` +
 *    `hls.attachMedia(video)` (Media Source Extensions).
 *
 * ⚠ Vòng đời phiên live: khi đóng modal ta gọi `stopLiveStream` để giải phóng
 * phiên trên Imou cloud — nếu không, phiên sẽ treo và giữ tài nguyên.
 */
export function CameraStreamModal({
  open,
  camera,
  onClose,
}: CameraStreamModalProps) {
  const { message } = App.useApp()

  /**
   * DOM node của thẻ `<video>`.
   *
   * Dùng `ref` (không phải state) vì React Compiler chặn mutate giá trị do
   * `useState` trả về. `videoReady` là cờ state để phát tín hiệu "node đã
   * mount" — cần vì effect chạy **trước** khi Modal render content
   * (`destroyOnHidden`), nên `ref.current` có thể còn null ở lần chạy đầu.
   */
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [videoReady, setVideoReady] = useState(false)

  /**
   * Lỗi player gắn với URL cụ thể. Dùng state thay vì `setState` trong
   * effect (React Compiler chặn `react-hooks/set-state-in-effect`).
   * Khi đổi URL → lỗi cũ tự động không còn khớp → UI bỏ hiện.
   */
  const [playerError, setPlayerError] = useState<{
    url: string
    message: string
  } | null>(null)

  // Camera có sẵn link → không cần hỏi Imou cloud.
  const manualStreamUrl = camera?.streamUrl?.trim() || null
  const needsCloudLookup = !manualStreamUrl

  const {
    data: liveStream,
    isLoading: isLoadingStream,
    isError: isStreamError,
    error: streamError,
    refetch: refetchStream,
  } = useCameraLiveStream(needsCloudLookup && open ? camera?.id ?? null : null)

  // Response thực tế: `data.stream.url`.
  const cloudStreamUrl = liveStream?.stream?.url?.trim() || null
  const streamUrl = manualStreamUrl ?? cloudStreamUrl

  const stopLiveStream = useStopLiveStream({
    onError: (err) => {
      // Đóng modal vẫn phải thành công; chỉ cảnh báo nhẹ.
      message.warning(`Không dừng được phiên live: ${getApiErrorMessage(err)}`)
    },
  })

  /**
   * Dừng phiên thủ công — chỉ Admin.
   *
   * ⚠ `POST /api/cameras/{id}/live-stream/stop` là `authorizeRoles(1)`,
   * nên Farm Operator luôn nhận 403. Hiện nút cho vô nghĩa với role đó.
   */
  const canStopSession = useHasPermission(CAMERA_MANAGE)
  const isStoppingSession = stopLiveStream.isPending

  // ── Gắn source vào <video> ──────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current
    if (!open || !streamUrl || !video) return

    let disposed = false
    let hls: Hls | null = null

    /**
     * `hls.js` ~575 kB — import động để không kéo nó vào bundle của
     * CameraOverviewPage (chỉ tải khi thực sự mở modal xem HLS).
     */
    const attachSource = async () => {
      // Safari/iOS: phát HLS native, không cần hls.js.
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl
        return
      }

      const { default: HlsCtor } = await import('hls.js')
      // Modal có thể đã đóng trong lúc đang tải chunk → bỏ qua.
      if (disposed) return

      if (!HlsCtor.isSupported()) {
        setPlayerError({
          url: streamUrl,
          message: 'Trình duyệt không hỗ trợ phát luồng HLS.',
        })
        return
      }

      hls = new HlsCtor({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      })
      hls.loadSource(streamUrl)
      hls.attachMedia(video)
      hls.on(HlsCtor.Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        // Lỗi fatal → thử nhánh recovery một lần, nếu không được thì báo.
        if (data.type === HlsCtor.ErrorTypes.NETWORK_ERROR) {
          hls?.startLoad()
        } else if (data.type === HlsCtor.ErrorTypes.MEDIA_ERROR) {
          hls?.recoverMediaError()
        } else {
          setPlayerError({
            url: streamUrl,
            message: 'Không phát được luồng video (lỗi HLS).',
          })
          hls?.destroy()
          hls = null
        }
      })
    }

    void attachSource()

    // Autoplay có thể bị chặn → người dùng bấm play tay, không phải lỗi.
    void video.play().catch(() => {})

    return () => {
      disposed = true
      // Dọn tài nguyên: huỷ instance HLS + giải phóng buffer của <video>.
      hls?.destroy()
      hls = null
      video.removeAttribute('src')
      video.load()
    }
  }, [open, streamUrl, videoReady])

  // ── Dừng phiên live khi đóng modal ──────────────────────────────────
  /**
   * Đánh dấu phiên của camera hiện tại đã được yêu cầu dừng.
   *
   * Cần vì phiên có **hai** đường giải phóng: đóng modal và unmount
   * (điều hướng / hot-reload). `POST .../live-stream/stop` là thao tác
   * không idempotent trên Imou cloud — gọi hai lần sẽ nhận 502 ở lần hai.
   */
  const stoppedCameraRef = useRef<number | null>(null)

  const releaseCloudSession = useCallback(
    (cameraId: number) => {
      if (stoppedCameraRef.current === cameraId) return
      stoppedCameraRef.current = cameraId

      void cameraApi.stopLiveStream(cameraId).catch((error: unknown) => {
        // Đóng modal vẫn phải thành công; chỉ cảnh báo nhẹ.
        message.warning(
          `Không dừng được phiên live: ${getApiErrorMessage(error)}`,
        )
      })
    },
    [message],
  )

  const handleClose = () => {
    // Chỉ dừng phiên nếu ta thực sự lấy link từ Imou cloud (manual URL
    // không tạo phiên nào).
    if (needsCloudLookup && camera?.id) {
      releaseCloudSession(camera.id)
    }
    onClose()
  }

  /**
   * Giải phóng phiên live khi component **unmount** mà chưa qua `handleClose`
   * (vd: điều hướng sang trang khác, hot-reload).
   *
   * Phiên Imou là tài nguyên trên cloud: không dừng thì session treo và giữ
   * tốn băng thông. Ref guard ở trên đảm bảo không gọi trùng.
   */
  useEffect(() => {
    return () => {
      if (needsCloudLookup && camera?.id) {
        void cameraApi.stopLiveStream(camera.id).catch(() => {
          stoppedCameraRef.current = camera.id
        })
      }
    }
  }, [camera?.id, needsCloudLookup])

  /**
   * Người dùng chuyển tab / ẩn cửa sổ → pause player để không decode video
   * vô ích. KHÔNG gọi stop API ở đây: chuyển tab không có nghĩa hết ý định
   * xem, và stop sẽ tạo vòng lặp (mở lại modal lại phải lấy token mới).
   */
  useEffect(() => {
    if (!open) return

    const onVisibilityChange = () => {
      const video = videoRef.current
      if (!video) return

      if (document.hidden) {
        video.pause()
      } else {
        void video.play().catch(() => {
          // Autoplay bị chặn sau khi người dùng tương tác trước đó → bỏ qua.
        })
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [open])

  const isLoading =
    open && needsCloudLookup && (isLoadingStream || (!streamUrl && isStreamError))

  const errorMessage = playerError?.url === streamUrl ? playerError.message : null
  const apiErrorMessage = isStreamError ? getApiErrorMessage(streamError) : null

  return (
    <Modal
      title={
        <span>
          Live — {camera?.cameraName || camera?.cameraCode || 'Camera'}
        </span>
      }
      open={open}
      onCancel={handleClose}
      footer={
        canStopSession && needsCloudLookup && streamUrl ? (
          <Space>
            <ActionButton
              icon={<DisconnectOutlined />}
              label="Dừng phiên live"
              description="Kết thúc phiên live trên Imou cloud."
              variant="danger"
              size="middle"
              loading={isStoppingSession}
              onClick={() => {
                if (camera?.id) {
                  stopLiveStream.mutate(camera.id, {
                    onSuccess: () => onClose(),
                  })
                }
              }}
            />
            <Button type="primary" onClick={handleClose}>
              Đóng
            </Button>
          </Space>
        ) : (
          <Button type="primary" onClick={handleClose}>
            Đóng
          </Button>
        )
      }
      width={880}
      destroyOnHidden
      styles={{ body: { paddingTop: 8 } }}
    >
      <div className="camera-stream-modal">
        {errorMessage ?? apiErrorMessage ? (
          <Alert
            type="error"
            showIcon
            message="Không xem được luồng live."
            description={errorMessage ?? apiErrorMessage}
            action={
              isStreamError ? (
                <button
                  type="button"
                  className="camera-stream-modal-retry"
                  onClick={() => void refetchStream()}
                >
                  Thử lại
                </button>
              ) : undefined
            }
          />
        ) : null}

        <div className="camera-stream-modal-stage">
          {isLoading ? (
            <div className="camera-stream-modal-loading">
              <Spin size="large" tip="Đang lấy link live từ Imou cloud…" />
            </div>
          ) : null}

          {/*
            `src` không set ở JSX — effect tự gắn (hls.js cần gắn qua
            `attachMedia`, không phải thuộc tính `src`).
          */}
          <video
            ref={(node) => {
              videoRef.current = node
              // Cờ state để effect gắn source chạy lại khi node vừa mount.
              setVideoReady(node !== null)
            }}
            className="camera-stream-modal-video"
            controls
            autoPlay
            playsInline
            style={{ width: '100%', maxHeight: '500px' }}
          />

          {!streamUrl && !isLoading ? (
            <div className="camera-stream-modal-empty">
              <EmptyState
                title="Không có link stream cho camera này"
                description="Camera chưa được cấu hình đường dẫn stream, hoặc Imou cloud chưa cấp quyền xem trực tiếp."
              />
            </div>
          ) : null}
        </div>

        {streamUrl ? (
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12 }}
            className="camera-stream-modal-url"
          >
            Nguồn: {streamUrl}
          </Typography.Text>
        ) : null}
      </div>
    </Modal>
  )
}
