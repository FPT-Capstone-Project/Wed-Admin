import test from 'node:test'
import assert from 'node:assert/strict'
import { conversationSide } from '../src/shared/ui/conversation-sender.ts'
import { normalizeConsultation } from '../src/features/disease-management/api/issues.normalizers.ts'

test('consultation retains sender identity to distinguish expert and operator without roles', () => {
  const consultation = normalizeConsultation({ expert_id: 8, messages: [
    { sender_id: 8, message: 'Expert response', media_url: 'photo.jpg' },
    { senderId: 12, message: 'Operator follow-up' },
  ] })
  assert.equal(conversationSide({ senderId: consultation.messages[0].sender_id, externalId: consultation.expert_id }), 'left')
  assert.equal(conversationSide({ senderId: consultation.messages[1].sender_id, externalId: consultation.expert_id }), 'right')
  assert.equal(consultation.messages[0].media_url, 'photo.jpg')
})

test('roles classify staff/admin right and customer/expert left; identity and name are fallbacks', () => {
  for (const roleId of [1, 2]) assert.equal(conversationSide({ roleId }), 'right')
  assert.equal(conversationSide({ roleId: 3 }), 'left')
  for (const role of ['farm_operator', 'STAFF', 'ADMIN']) assert.equal(conversationSide({ role }), 'right')
  for (const role of ['mushroom_expert', 'CUSTOMER']) assert.equal(conversationSide({ role }), 'left')
  assert.equal(conversationSide({ senderId: 20, externalId: 20 }), 'left')
  assert.equal(conversationSide({ senderId: 21, externalId: 20 }), 'right')
  assert.equal(conversationSide({ senderName: ' Expert ', externalName: 'expert' }), 'left')
})

test('nested and camel-case sender roles survive normalization', () => {
  const { messages } = normalizeConsultation({ messages: [
    { senderId: '12', senderRoleId: '2', senderRole: 'STAFF' },
    { sender: { user_id: 8, role: 'EXPERT', role_id: 4, full_name: 'Expert' } },
  ] })
  assert.equal(messages[0].sender_id, 12)
  assert.equal(messages[0].sender_role_id, 2)
  assert.equal(messages[1].sender_role, 'EXPERT')
})
