import { timestamp } from '../api/issues.normalizers'
export const missing = 'Chưa ghi nhận'
export const show = (value: string | number | null | undefined) => value == null || value === '' ? missing : value
export const dateText = (value: string | null) => timestamp(value) > 0 && new Date(value!).getUTCFullYear() > 1970 ? new Date(value!).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : missing
