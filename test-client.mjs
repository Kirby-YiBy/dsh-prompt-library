// Offline smoke test for the client half: stub the loader, React and cordis ctx,
// then run apply() and the slot injections the way the shell would.
import fs from 'node:fs'

const source = fs.readFileSync('E:/DSHarness/plugins/dsh-prompt-library/client/client.js', 'utf8')

const registrations = []
let loaderId = null
let exported = null

const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  useState: (v) => [v, () => {}],
  useEffect: () => {},
  useMemo: (f) => f(),
  useCallback: (f) => f,
  useRef: (v) => ({ current: v }),
}

const sandboxWindow = {
  addEventListener: () => {},
  removeEventListener: () => {},
  innerWidth: 1440,
  innerHeight: 900,
  localStorage: { getItem: () => null, setItem: () => {} },
  matchMedia: () => ({ matches: false }),
}
sandboxWindow.__ModuleLoader__ = {
  load({ id, factory }) {
    loaderId = id
    const require = (name) => {
      if (name === 'react') return React
      if (name === 'react/jsx-runtime') return { jsx: React.createElement, jsxs: React.createElement }
      throw new Error(`unexpected require: ${name}`)
    }
    exported = factory(require)
  },
}

const fn = new Function(
  '__ModuleLoader__', 'document', 'window', 'fetch', 'navigator', 'setTimeout', 'clearTimeout', 'URL', 'Blob', 'Element', 'localStorage',
  source,
)
try {
  fn(
    sandboxWindow.__ModuleLoader__,
    { getElementById: () => null, createElement: () => ({ id: '', textContent: '' }), head: { appendChild: () => {} }, addEventListener: () => {} },
    sandboxWindow,
    async () => ({ ok: true, json: async () => ({ items: [] }) }),
    { clipboard: { writeText: async () => {} } },
    () => 0,
    () => {},
    { createObjectURL: () => '', revokeObjectURL: () => {} },
    class {},
    class {},
    sandboxWindow.localStorage,
  )
} catch (error) {
  console.error('FACTORY THREW:', error.message)
  process.exit(1)
}

console.log('loader id:', loaderId)
console.log('exports:', Object.keys(exported).join(','))
console.log('name:', exported.name, '| inject:', JSON.stringify(exported.inject))

// --- cordis context stub -------------------------------------------------
const fakeInput = {
  appendDraft: (text) => { fakeInput.lastAppend = text },
  setDraft: (text) => { fakeInput.lastSet = text },
}
const ctx = {
  get: (key) =>
    key === 'sessions'
      ? { scope: () => ({ get: (k) => (k === 'conversation' ? { input: { for: () => fakeInput } } : undefined) }) }
      : undefined,
  slots: {
    inject: (name, cb) => cb(),
    register: (entry, component) => {
      registrations.push({ entry, component })
      return () => {}
    },
  },
}

exported.apply(ctx)
console.log('\nregistrations:')
for (const { entry, component } of registrations) {
  console.log(`  - ${entry.name} / ${entry.id} / order=${entry.order ?? '-'} / component=${component?.name}`)
}

const bridge = registrations.find((r) => String(r.entry.id).includes('bridge'))
const overlay = registrations.find((r) => r.entry.name === 'shell.overlay')
const fails = []
if (registrations.length !== 4) fails.push(`expected 4 registrations, got ${registrations.length}`)
if (bridge === undefined) fails.push('missing composer bridge registration')
if (overlay === undefined) fails.push('missing shell.overlay registration')
if (overlay !== undefined && overlay.component?.name !== 'PromptBall') fails.push('overlay component is not PromptBall')
const glyph = registrations.find((r) => r.entry.name === 'sidebar.panellist')
const page = registrations.find((r) => r.entry.name === 'main')
if (glyph === undefined) fails.push('missing sidebar.panellist registration')
if (page === undefined) fails.push('missing main panel registration')
if (page !== undefined && page.entry.key !== 'dsh-folders') fails.push('main entry has no key')
if (glyph !== undefined && page !== undefined && glyph.entry.id !== page.entry.key) fails.push('glyph id does not address the main key')

if (bridge !== undefined) {
  const props = bridge.entry.inject('session-1')
  if (typeof props !== 'object' || props === null) fails.push('bridge inject did not return props')
}

// The ball and panel must be constructible React components.
for (const { component } of registrations) {
  if (typeof component !== 'function') fails.push(`component ${component?.name} is not a function`)
}

console.log('\nresult:', fails.length === 0 ? 'PASS' : `FAIL\n  - ${fails.join('\n  - ')}`)
process.exit(fails.length === 0 ? 0 : 1)
