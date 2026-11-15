/**
 * Tra cứu tên nhân viên cho trang "Quản lý Thu hoạch".
 *
 * ⚠ Nguồn sự thật nay nằm ở `features/users/hooks/useStaffNames.ts`
 *   (dùng chung cho trang Thu hoạch **và** trang "Yêu cầu nhận nấm") ⇒
 *   chỉ có **một** cache `['users', 'name-lookup']` cho toàn app.
 *
 * → File này chỉ **re-export** để các import cũ vẫn chạy nguyên.
 */
export {
  resolveStaffName,
  useStaffNames as useHarvestStaffNames,
  type StaffNameMap,
} from '../../users/hooks/useStaffNames'
