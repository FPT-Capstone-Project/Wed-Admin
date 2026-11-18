# Project Overview
- Project: mcms-web-admin (IoT / Telemetry monitoring admin dashboard for smart agriculture — Smart Mushroom Cultivation Management System).
- Tech stack: React 19, TypeScript, Tailwind CSS, Ant Design (`antd`), Recharts, Zustand, TanStack Query, Vite.
- Architecture: Feature-based (`src/features/...`, `components/`, `routes/`, `stores/`, `types/`).
- UI Language: All user-facing UI text (labels, status indicators, table headers, toast notifications, empty states) MUST be in natural, clear **Vietnamese**.

# Code & Development Guidelines
- Strictly adhere to existing code structure, patterns, and type definitions.
- Reuse existing tokenized project components (`StatCard`, `StatusBadge`, `ActionButton`, `UserAvatar`, `DataTable`, `PageHeader`) rather than raw unstyled Ant Design defaults.
- Do not refactor unrelated files or functions.
- Do not install new packages unless explicitly requested.
- Use strict TypeScript; reuse interfaces/types in `types/` and generated API schemas (`npm run update-api` when OpenAPI specs change).
- Keep explanations minimal: output clean, direct diffs without unnecessary chit-chat.

# Domain & Business Logic Rules
- **Mushroom Cultivation Lifecycle:** 4 active stages (`Ủ tơ`, `Kéo tơ`, `Nấm đang phát triển`, `Sẵn sàng thu hoạch`) plus `Hoàn thành` for finished sessions.
- **Role Boundaries (Admin vs. Farm OP):**
  - Web Admin is strictly for monitoring, analytics, resource/catalog management (packages, devices, users, rentals, harvest requests), and camera feeds (Imou/Tapo).
  - NEVER add session stage progression buttons or farm automation controls on Admin views; those actions belong exclusively to Farm OP.
- **Data Resolution & Safety:**
  - Always resolve raw numeric staff/user IDs to actual display names.
  - Safely guard against default/epoch dates or empty arrays from API responses to prevent broken UI states.
  - Fit primary management tables (sessions, harvest requests) cleanly within a standard desktop viewport (24-inch external monitor) without horizontal scrolling.

# Visual & UI/UX Standards (B2B Industrial IoT)
- Border Radius: Strictly use subtle corners: `rounded` (4px) or `rounded-md` (6px). NEVER use full rounded pill shapes (`rounded-full`) for menu items, cards, badges, or buttons.
- Color Palette:
  - Background: Crisp neutral/slate (`bg-slate-50` or `#F8FAFC`), card surfaces use pure white (`#FFFFFF`) with thin borders (`border-slate-200`).
  - Primary Green: Restrict to key interactive elements (CTA buttons, `#16A34A` / `#15803D` with WCAG AA contrast) and healthy/online states only.
  - Border Accents: Do NOT use thick colored borders (red, orange, green) on card edges or badges.
- Status Indicators:
  - Replace thick bordered badge tags with subtle "Status Dots": a 6px solid dot (green for active, red for offline, amber for warning) followed by medium neutral text.
  - Avoid high-saturation outline tags (`border border-green-500 text-green-500`).
- Sidebar Navigation:
  - Active menu state: subtle background highlight (`bg-slate-100` or `bg-emerald-50/50`) + a 3px vertical accent bar on the left edge.
  - Do NOT wrap selected menu items in thick pills or colored borders.
- Data Tables:
  - Compact industrial density: compact cell padding (`py-2 px-3` or `py-2.5 px-4`).
  - Action column: Use minimal text links or clean icon buttons; avoid heavy bordered buttons inside table rows.
- Charts (Recharts):
  - Thin line strokes (`strokeWidth={2}`).
  - Light dashed grid lines (`stroke="#E2E8F0"` / `strokeDasharray="3 3"`).
  - Compact axis labels and clean tooltip cards.

# Strict Anti-Patterns (Avoid "AI Slop")
- NO gradients anywhere (no `bg-gradient-to-...`).
- NO excessive drop shadows (avoid `shadow-lg`, `shadow-xl`, or glowing colored shadows); stick to `shadow-sm` or plain `border`.
- NO decorative emojis or toy-like icons in production controls.

# Strict UI & Production Rule
- Never render technical debug widgets, internal API endpoint tags (e.g. `Nguồn | GET /api/...`), schema inspectors, or raw HTTP debug badges in customer/admin-facing UI components. All views must strictly present polished business information.

# Data Fetching & Network Discipline
- Heavy/secondary data must load **lazily**: never mount a heavy sub-tree (charts, history tables, bulk aggregations) unless its tab/section is actually active. Gate with `activeTab === 'x' && <HeavyComponent />` AND a React Query `enabled` flag.
- Opening a Drawer/Modal must never trigger bulk pagination. Query the primary entity first and render it independently of secondary panels.
- Any "fetch-all pages" helper MUST have a hard page cap (e.g. max 20 pages for charts, max 5 for log tables) and an early-stop condition (stop once the oldest record crosses the requested `startTimestamp`).
- Respect backend `pageSize` limits; query the backend limit before choosing a page size, and clamp with `Math.min` rather than sending an invalid value.
- Use React Query `placeholderData: keepPreviousData` for range/filter switches so existing data stays visible (dimmed with a spinner) instead of collapsing to an empty skeleton.
- When aggregating for charts, downsample on the client to a target point count (e.g. 60–100 points per range) so large windows do not require tens of thousands of records.