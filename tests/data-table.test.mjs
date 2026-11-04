import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const require = createRequire(import.meta.url)
const source = readFileSync(new URL('../src/shared/ui/DataTable.tsx', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const exports = {}
const Table = () => null
runInNewContext(code, { exports, require: id => id === 'antd'
  ? { Table, Alert: () => null, Button: () => null }
  : id === './EmptyState' ? { EmptyState: () => null } : require(id) })

test('DataTable preserves server pagination, sorting callback, expanded rows and row classes', () => {
  const onChange = () => {}
  const pageChange = () => {}
  const expandable = { expandedRowRender: () => 'Detail' }
  const rowClassName = () => 'selected'
  const tree = exports.DataTable({ columns: [], dataSource: [], rowKey: 'id', onChange,
    expandable, rowClassName, scrollX: 1050,
    pagination: { current: 3, pageSize: 20, total: 120, onChange: pageChange, showSizeChanger: true },
  })
  const table = tree.props.children.find(child => child?.type === Table)
  assert.equal(table.props.onChange, onChange)
  assert.equal(table.props.pagination.current, 3)
  assert.equal(table.props.pagination.pageSize, 20)
  assert.equal(table.props.pagination.total, 120)
  assert.equal(table.props.pagination.onChange, pageChange)
  assert.equal(table.props.pagination.showSizeChanger, true)
  assert.equal(table.props.expandable, expandable)
  assert.equal(table.props.rowClassName, rowClassName)
  assert.equal(table.props.scroll.x, 1050)
})
