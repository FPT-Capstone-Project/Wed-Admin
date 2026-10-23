import type { NodeId, TierId } from './room.types'

export const DEVICE_STATUSES = ['ONLINE', 'OFFLINE', 'WARNING', 'ERROR'] as const
export type DeviceStatus = (typeof DEVICE_STATUSES)[number]

export interface GatewayMaster {
  id: 'gateway-esp32-s3-master'
  model: 'ESP32-S3'
  ipAddress: string
  macAddress: string
  firmwareVersion: string
  lastPingTimestamp: string
  wifiRssi: number
  status: DeviceStatus
}

export interface Rs485Node {
  id: NodeId
  model: 'STM32'
  protocol: 'RS485'
  address: TierId
  tierId: TierId
  firmwareVersion: string
  status: DeviceStatus
  lastSeenAt: string
  latencyMs: number
  packetLossPercent: number
}

export interface CameraConfig {
  id: 'camera-front-overview'
  name: 'Front Overview Camera'
  streamUrl: string
  resolution: string
  fps: number
  isLive: boolean
  lastSnapshotUrl: string | null
}

export interface FloorClimateThresholdValues {
  tempMin: number
  tempMax: number
  humidityMin: number
  humidityMax: number
  co2Max: number
}

export interface FloorClimateConfig extends FloorClimateThresholdValues {
  tierId: TierId
  mode: 'AUTO'
  updatedAt: string
}
