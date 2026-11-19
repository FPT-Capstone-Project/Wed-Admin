import test from 'node:test'
import assert from 'node:assert/strict'
import {
  containsVietnameseDiacritics,
  isVietnameseDescription,
} from '../src/shared/i18n/vietnamese-text.ts'
import {
  CATALOG_STATUS_DICTIONARY,
  PACKAGE_STATUS_DICTIONARY,
} from '../src/shared/i18n/status/package.ts'

test('catalog statuses use the ACTIVE/INACTIVE wording of the database', () => {
  assert.equal(CATALOG_STATUS_DICTIONARY.ACTIVE.label, 'Đang áp dụng')
  assert.equal(CATALOG_STATUS_DICTIONARY.INACTIVE.label, 'Ngừng áp dụng')
  assert.equal(CATALOG_STATUS_DICTIONARY.ACTIVE.tone, 'ok')
  assert.equal(CATALOG_STATUS_DICTIONARY.INACTIVE.tone, 'muted')
})

test('the rental package dictionary reuses the same wording', () => {
  assert.equal(PACKAGE_STATUS_DICTIONARY.ACTIVE.label, 'Đang áp dụng')
  assert.equal(PACKAGE_STATUS_DICTIONARY.INACTIVE.label, 'Ngừng áp dụng')
})

test('the old order-status wording is gone from the catalog dictionaries', () => {
  const labels = [
    ...Object.values(CATALOG_STATUS_DICTIONARY).map((entry) => entry.label),
    ...Object.values(PACKAGE_STATUS_DICTIONARY).map((entry) => entry.label),
  ]
  assert.equal(labels.includes('Đang nhận đơn'), false)
  assert.equal(labels.includes('Tạm ngưng'), false)
})

test('english seed descriptions are not shown as Vietnamese', () => {
  assert.equal(isVietnameseDescription('Premium package'), false)
  assert.equal(
    isVietnameseDescription('Basic oyster mushroom cultivation package'),
    false,
  )
  assert.equal(
    isVietnameseDescription(
      'Standard oyster mushroom cultivation pack with IoT monitoring',
    ),
    false,
  )
  assert.equal(isVietnameseDescription('Mushroom cultivation expert'), false)
})

test('valid Vietnamese descriptions are kept', () => {
  assert.equal(
    isVietnameseDescription('Gói 30 ngày gồm 1 khay, camera và nhân công.'),
    true,
  )
  assert.equal(
    isVietnameseDescription('Gói tiêu chuẩn — bao gồm 1 khay nuôi, IoT + camera.'),
    true,
  )
  // Mô tả không dấu nhưng có từ khoá tiếng Việt vẫn hợp lệ.
  assert.equal(isVietnameseDescription('Goi 30 ngay, bao gom 1 khay.'), true)
})

test('empty descriptions are never shown', () => {
  assert.equal(isVietnameseDescription(''), false)
  assert.equal(isVietnameseDescription('   '), false)
  assert.equal(isVietnameseDescription(null), false)
  assert.equal(isVietnameseDescription(undefined), false)
})

test('vietnamese diacritics are detected', () => {
  assert.equal(containsVietnameseDiacritics('Gói thuê'), true)
  assert.equal(containsVietnameseDiacritics('Premium package'), false)
})
