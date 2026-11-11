/**
 * ESLint rule: `no-raw-status-in-jsx`
 *
 * ## Mục tiêu
 *
 * Chặn việc render **trực tiếp** giá trị enum thô của BE vào JSX — vì
 * BE trả về `PLANNED` / `IN_PROGRESS` / `ACTIVE` / `WAITING_EXPERT`… và
 * người dùng Việt sẽ thấy chuỗi tiếng Anh.
 *
 * ## Cách dùng đúng
 *
 * ```tsx
 * // ❌ Sai — lộ giá trị gốc ra màn hình
 * <span>{order.status}</span>
 * <Tag>{session.growth_stage}</Tag>
 *
 * // ✅ Đúng — qua helper của module trung tâm
 * <StatusBadge {...presentStatus(ORDER_STATUS_DICTIONARY, order.status)} />
 * <span>{statusLabel(SESSION_GROWTH_STAGE_DICTIONARY, session.growth_stage)}</span>
 * ```
 *
 * ## Phạm vi
 *
 * ⚠ Rule chỉ xét **children** của JSX element — tức chỗ giá trị được
 *   **hiển thị thực sự** cho người dùng.
 *
 *   → **KHÔNG** chặt:
 *     - Giá trị truyền vào **attribute** (`<X status={s} />`) — đó là prop
 *       của component, component đó tự lo việc dịch.
 *     - Giá trị dùng làm **điều kiện** (`{s === 'ACTIVE' && …}`).
 *     - Biểu thức đã qua helper (`{statusLabel(dict, x)}`).
 *
 * @typedef {import('eslint').Rule.RuleModule} RuleModule
 */

/**
 * Danh sách tên field là enum trạng thái (snake_case + camelCase).
 *
 * ⚠ Chỉ liệt kê các field **thực sự là enum của BE** — không liệt kê mọi
 *   field có tên "status" vì nhiều field là dữ liệu nghiệp vụ.
 */
const ENUM_FIELD_NAMES = new Set([
  // Phiên canh tác
  'growth_stage',
  'current_stage',
  'harvest_status',
  'cultivation_status',
  'payment_status',
  'spawn_condition',
  // Thu hoạch
  'harvest_method',
  'harvest_request_status',
  'quality_grade',
  'receiving_method',
  // Sự cố / bệnh hại
  'severity',
  'issue_type',
  'media_stage',
  'condition',
  'tray_condition',
  'mushroom_condition',
  // IoT / thiết bị
  'control_state',
  'reported_state',
  'desired_state',
  'ssr_state',
  'run_status',
  'command_status',
  'event_type',
  // Camera
  'liveStatus',
  'live_status',
])

/**
 * Tên file được miễn trừ.
 *
 * - `StyleGuidePage` — dữ liệu demo tĩnh, không phải enum BE.
 * - Module trung tâm — chính là nơi định nghĩa nhãn.
 */
const IGNORED_FILES = [
  'src/pages/dev/StyleGuidePage.tsx',
  'src/shared/i18n/status/',
]

/**
 * Tên field chung (`status`, `state`, `stage`, `category`…) — chỉ chặt khi
 * biến là **dữ liệu từ API**, tức không phải tên biến local đơn giản.
 *
 * ⚠ Vì các tên này quá phổ biến nên ta **bỏ qua** khi biểu thức chỉ là
 *   `Identifier` đơn lẻ (vd `{status}` — có thể là state nội bộ đã Việt hóa).
 */
const GENERIC_FIELD_NAMES = new Set([
  'status',
  'state',
  'stage',
  'category',
  'source',
  'role',
  'action',
  'method',
  'mode',
  'billing_cycle',
  'billingCycle',
])

/** @type {import('eslint').Rule.RuleModule} */
const noRawStatusInJsx = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Cấm render trực tiếp enum trạng thái thô của BE vào JSX — phải qua presentStatus()/statusLabel()',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          fieldNames: {
            type: 'array',
            items: { type: 'string' },
          },
          genericFieldNames: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      rawStatus:
        'Không render trực tiếp "{{field}}" (enum thô của BE) vào JSX. Dùng `presentStatus(<TỪ_ĐIỂN>, value)` hoặc `statusLabel(<TỪ_ĐIỂN>, value)` từ `src/shared/i18n/status/`.',
    },
  },

  create(context) {
    const options = context.options[0] || {}
    const fieldNames = options.fieldNames
      ? new Set(options.fieldNames)
      : ENUM_FIELD_NAMES
    const genericFieldNames = options.genericFieldNames
      ? new Set(options.genericFieldNames)
      : GENERIC_FIELD_NAMES

    const filename = context.filename.replace(/\\/g, '/')
    if (IGNORED_FILES.some((pattern) => filename.includes(pattern))) {
      return {}
    }

    /** Lấy tên field cuối cùng của một MemberExpression (vd `a.b.c` → `c`). */
    function getFieldName(node) {
      if (node.type !== 'MemberExpression') return null
      if (node.computed) {
        return typeof node.property.value === 'string'
          ? node.property.value
          : null
      }
      if (node.property.type !== 'Identifier') return null
      return node.property.name
    }

    return {
      // ⚠ Chỉ xét `JSXElement > children` — bỏ qua `JSXAttribute`.
      JSXElement(node) {
        const children = node.children
        if (!children || children.length === 0) return

        for (const child of children) {
          if (child.type !== 'JSXExpressionContainer') continue

          const expression = child.expression
          if (!expression) continue

          // Bỏ qua biểu thức rỗng `{/* comment */}`.
          if (expression.type === 'JSXEmptyExpression') continue

          let field = null

          if (expression.type === 'MemberExpression') {
            field = getFieldName(expression)
            if (!field) continue

            if (fieldNames.has(field)) {
              // ⚠ Field enum **chuyên biệt** → luôn chặt.
              context.report({
                node: expression,
                messageId: 'rawStatus',
                data: { field },
              })
              continue
            }

            if (genericFieldNames.has(field)) {
              // ⚠ Field generic → chỉ chặt khi object là **dữ liệu từ API**.
              //   Heuristic: object không phải biến local kiểu `state`/`props`.
              const objectName =
                expression.object.type === 'Identifier'
                  ? expression.object.name
                  : null
              if (objectName && /^(state|props|ctx|context)$/i.test(objectName)) {
                continue
              }
              context.report({
                node: expression,
                messageId: 'rawStatus',
                data: { field },
              })
            }
            continue
          }

          // Identifier đơn lẻ (vd `{status}`) — bỏ qua: quá dễ trùng với
          // state nội bộ đã Việt hóa sẵn.
        }
      },
    }
  },
}

export default noRawStatusInJsx
export { ENUM_FIELD_NAMES, GENERIC_FIELD_NAMES, IGNORED_FILES }
