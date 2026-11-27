import type { Consultation, ConversationMessage, Evidence, Issue, IssueStatus, Severity, Treatment, TreatmentReview } from './issues.api'

type Row = Record<string, unknown>
export const record = (value: unknown): Row => value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
export const array = (value: unknown): unknown[] => Array.isArray(value) ? value : []
export const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value : null
export const number = (value: unknown): number | null => (typeof value === 'number' || typeof value === 'string' && value.trim() !== '') && Number.isFinite(Number(value)) ? Number(value) : null
export function field(row: Row, key: string): unknown { return row[key] ?? row[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] }
const str = (r: Row, key: string) => text(field(r, key))
export function unwrapEntity(value: unknown): Row {
  let row = record(value)
  for (let depth = 0; depth < 5 && row.data && !Array.isArray(row.data); depth++) row = record(row.data)
  return row
}
export function normalizeEvidence(value: unknown): Evidence {
  const r = record(value)
  return { media_id: number(field(r, 'media_id')) ?? 0, media_url: str(r, 'media_url') ?? '', media_type: str(r, 'media_type')?.toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE', caption: str(r, 'caption'), media_stage: str(r, 'media_stage') ?? undefined }
}
const media = (r: Row) => array(r.media ?? r.images).map(normalizeEvidence).filter(m => m.media_url)
export function normalizeIssue(value: unknown): Issue {
  const envelope = record(value)
  const r = { ...record(envelope.issue), ...envelope }
  const nested = record(r.session)
  const source = { ...record(r.source_inspection ?? r.sourceInspection), ...nested, ...r }
  const stringFields = ['session_status', 'session_start_at', 'expected_harvest_date', 'growth_stage', 'growth_condition', 'growth_updated_at', 'tray_code', 'tray_condition', 'mushroom_condition', 'inspection_notes', 'inspection_at', 'spawn_condition', 'mushroom_name', 'reported_growth_stage'] as const
  const strings = Object.fromEntries(stringFields.map(key => [key, str(source, key)])) as Pick<Issue, typeof stringFields[number]>
  // If progress records are supplied, current stage comes from the newest dated record only.
  const progressDate = (row: Row) => field(row, 'updated_at') ?? field(row, 'recorded_at') ?? field(row, 'created_at')
  const progress = array(r.progress ?? r.progress_history ?? r.progressHistory).map(record).filter(p => timestamp(progressDate(p)) > 0).sort((a, b) => timestamp(progressDate(b)) - timestamp(progressDate(a)))[0]
  if (progress) {
    strings.growth_stage = str(progress, 'growth_stage') ?? str(progress, 'stage')
    strings.growth_updated_at = text(progressDate(progress))
    strings.growth_condition = str(progress, 'growth_condition') ?? str(progress, 'condition')
  }
  strings.mushroom_name ??= str(source, 'mushroom_type_name') ?? text(record(source.mushroom_type ?? source.mushroomType).name)
  const ids = array(field(r, 'consultation_ids')).map(number)
  ids.push(number(field(r, 'consultation_id')))
  ids.push(number(field(record(r.consultation), 'consultation_id')))
  for (const c of array(r.consultations)) ids.push(number(field(record(c), 'consultation_id')))
  const snapshot = record(field(r, 'environment_snapshot'))
  return {
    ...strings, issue_id: number(field(r, 'issue_id')) ?? 0, title: str(r, 'title') ?? 'Chưa ghi nhận', description: str(r, 'description') ?? 'Chưa ghi nhận',
    severity: (str(r, 'severity') ?? '') as Severity, status: (str(r, 'status')?.toUpperCase() ?? '') as IssueStatus,
    created_at: str(r, 'created_at'), session_id: number(field(r, 'session_id')), tray_id: number(field(r, 'tray_id')), reported_by_name: str(r, 'reported_by_name'), media: media(r),
    consultation_ids: [...new Set(ids.filter((id): id is number => id != null && id > 0))], floor_id: number(field(source, 'floor_id')),
    growth_progress: number(progress ? field(progress, 'growth_progress') ?? field(progress, 'progress') : field(source, 'growth_progress')),
    environment_snapshot: Object.keys(snapshot).length ? snapshot : null,
  }
}
export function timestamp(value: unknown): number { const date = text(value); const ms = date ? Date.parse(date) : NaN; return Number.isFinite(ms) ? ms : 0 }
export function normalizeConsultation(value: unknown): Consultation {
  const envelope = record(value)
  const r = { ...record(envelope.consultation), ...envelope }
  const expert = record(r.expert)
  const expertName = str(r, 'expert_name') ?? str(expert, 'full_name') ?? str(expert, 'username') ?? str(expert, 'name')
  let question: unknown = r.question
  if (typeof question === 'string' && question.trim().startsWith('{')) { try { question = JSON.parse(question) } catch { /* Legacy free text is preserved. */ } }
  const structured = record(question)
  const messages = array(r.messages ?? structured.messages).map((item, index): ConversationMessage => {
    const m = typeof item === 'string' ? { message: item } : record(item)
    return { sender_id: number(field(m, 'sender_id') ?? field(record(m.sender), 'user_id') ?? record(m.sender).id), sender_role_id: number(field(m, 'sender_role_id') ?? field(m, 'role_id') ?? field(record(m.sender), 'role_id')), sender_role: str(m, 'sender_role') ?? str(m, 'role') ?? str(record(m.sender), 'role'), id: String(field(m, 'message_id') ?? m.id ?? index), sender_name: str(m, 'sender_name') ?? str(m, 'full_name') ?? text(record(m.sender).full_name), created_at: str(m, 'created_at') ?? str(m, 'sent_at') ?? str(m, 'timestamp'), message: str(m, 'message') ?? str(m, 'content') ?? str(m, 'text'), media_url: str(m, 'media_url'), type: str(m, 'type') ?? str(m, 'message_type'), diagnosis: str(m, 'diagnosis'), solution: str(m, 'solution') }
  }).sort((a, b) => timestamp(a.created_at) - timestamp(b.created_at))
  return { consultation_id: number(field(r, 'consultation_id')) ?? 0, issue_id: number(field(r, 'issue_id')) ?? 0, expert_id: number(field(r, 'expert_id') ?? field(expert, 'user_id') ?? expert.id), expert_name: expertName, question: text(question) ?? str(structured, 'original_question') ?? str(structured, 'question') ?? str(structured, 'original') ?? '', diagnosis: str(r, 'diagnosis'), solution: str(r, 'solution'), status: str(r, 'status')?.toUpperCase() ?? '', created_at: str(r, 'created_at'), messages }
}

export function hasInitialQuestion(consultation: Consultation): boolean {
  return !consultation.messages.length || consultation.messages[0].message?.trim() !== consultation.question.trim()
}
function review(value: unknown): TreatmentReview {
  const r = record(value)
  return { review_result: str(r, 'review_result') ?? str(r, 'result'), review_comment: str(r, 'review_comment') ?? str(r, 'comment'), reviewed_by_name: str(r, 'reviewed_by_name') ?? str(r, 'reviewer_name'), reviewed_at: str(r, 'reviewed_at') ?? str(r, 'created_at') }
}
export function normalizeTreatment(value: unknown): Treatment {
  const envelope = record(value)
  const r = { ...record(envelope.treatment), ...envelope }
  const reviews = array(r.reviews ?? field(r, 'review_history')).map(review)
  if (r.review) reviews.push(review(r.review))
  else if (field(r, 'review_result')) reviews.push(review(r))
  return { treatment_log_id: number(field(r, 'treatment_log_id') ?? field(r, 'treatment_id') ?? r.id) ?? 0, performed_by_name: str(r, 'performed_by_name'), performed_at: str(r, 'performed_at') ?? str(r, 'created_at'), action_description: str(r, 'action_description'), result_description: str(r, 'result_description'), media: media(r), reviews: reviews.filter(r => r.review_result || r.review_comment).sort((a, b) => timestamp(a.reviewed_at) - timestamp(b.reviewed_at)) }
}
