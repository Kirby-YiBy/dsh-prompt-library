/**
 * dsh-prompt-library — host half.
 *
 * Owns the prompt store as one JSON file under DSH_HOME and exposes it to the
 * browser half over four exact HTTP routes. The store uses the same item shape
 * and export envelope as Gemini Voyager's prompt manager, so a Voyager export
 * imports here and this library exports back into Voyager unchanged.
 *
 * Nothing in this file may throw out of `apply`: a plugin that throws stops the
 * whole DSH boot, and a prompt library is never worth that.
 */
import { promises as fsp } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

export const name = 'dsh-prompt-library'
export const inject = ['webServer']

const API_PREFIX = '/dsh-prompts/api'
const BOOT_ID = `${String(process.pid)}-${Date.now().toString(36)}`
const MAX_BODY_BYTES = 4 * 1024 * 1024
const EXPORT_FORMAT = 'gemini-voyager.prompts.v1'
const STORE_VERSION = 1

function dshHome() {
  const fromEnv = process.env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.length > 0) return fromEnv
  return path.join(os.homedir(), '.dsh')
}

function storePath() {
  return path.join(dshHome(), 'prompt-library.json')
}

function emptyStore() {
  return { version: STORE_VERSION, updatedAt: new Date().toISOString(), items: [] }
}

function newId() {
  return `prompt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeTags(input) {
  if (!Array.isArray(input)) return []
  const seen = new Set()
  const out = []
  for (const raw of input) {
    const tag = String(raw ?? '').trim().toLowerCase()
    if (tag === '' || seen.has(tag)) continue
    seen.add(tag)
    out.push(tag)
  }
  return out
}

/** Coerce one untrusted record into a stored item, or null when it has no text. */
function normalizeItem(value, { keepId = true } = {}) {
  if (value === null || typeof value !== 'object') return null
  const text = typeof value.text === 'string' ? value.text.trim() : ''
  if (text === '') return null
  const now = Date.now()
  const item = {
    id: keepId && typeof value.id === 'string' && value.id !== '' ? value.id : newId(),
    text,
    tags: normalizeTags(value.tags),
    createdAt:
      typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) ? value.createdAt : now,
  }
  if (typeof value.name === 'string' && value.name.trim() !== '') item.name = value.name.trim()
  const updatedAt =
    typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt) ? value.updatedAt : undefined
  if (updatedAt !== undefined) item.updatedAt = updatedAt
  if (value.pinnedAt === null || (typeof value.pinnedAt === 'number' && Number.isFinite(value.pinnedAt))) {
    item.pinnedAt = value.pinnedAt
  }
  return item
}

/** Sort pinned first, then most recently changed. */
function sortItems(items) {
  // The array order IS the manual order (drag-reorder writes it). Pinning only
  // lifts a row into the first group; a stable sort keeps everything else put.
  return [...items].sort((left, right) => {
    const lp = typeof left.pinnedAt === 'number'
    const rp = typeof right.pinnedAt === 'number'
    if (lp !== rp) return lp ? -1 : 1
    return 0
  })
}

async function readStore(logger) {
  const file = storePath()
  let raw
  try {
    raw = await fsp.readFile(file, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return emptyStore()
    logger?.warn?.(`prompt library: cannot read ${file}: ${String(error)}`)
    return emptyStore()
  }
  try {
    const parsed = JSON.parse(raw)
    const items = Array.isArray(parsed?.items)
      ? parsed.items.map((entry) => normalizeItem(entry)).filter((entry) => entry !== null)
      : []
    return { version: STORE_VERSION, updatedAt: parsed?.updatedAt, items }
  } catch (error) {
    logger?.warn?.(`prompt library: ${file} is not valid JSON, starting empty: ${String(error)}`)
    return emptyStore()
  }
}

async function writeStore(store, logger) {
  const file = storePath()
  await fsp.mkdir(path.dirname(file), { recursive: true })
  const payload = JSON.stringify({ ...store, version: STORE_VERSION, updatedAt: new Date().toISOString() }, null, 2)
  const temp = `${file}.${process.pid}.tmp`
  await fsp.writeFile(temp, payload, 'utf8')
  await fsp.rename(temp, file)
  logger?.info?.(`prompt library: wrote ${store.items.length} prompts`)
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

/**
 * Whether this request comes from the UI we serve.
 *
 * A plain `Origin === Host` comparison is wrong on DSH Desktop: the page is
 * served through the app's own protocol (`dsh-app://…`), and the loopback name
 * may be `localhost` while `Host` is `127.0.0.1`. Both are the same surface, so
 * the check accepts the shell protocol and any loopback origin on our port, and
 * still refuses every other site.
 */
function trustedOrigin(request) {
  const raw = request.headers.origin
  const site = request.headers['sec-fetch-site']
  // A browser omits Origin on same-origin GETs; a shell page served from a
  // non-http scheme serializes its origin as the literal `null`. That is also
  // what a sandboxed third-party iframe sends, so this trades a narrow CSRF
  // surface on a loopback-only port for the Desktop shell actually working.
  if (typeof raw !== 'string' || raw === '' || raw === 'null') return true
  let origin
  try {
    origin = new URL(raw)
  } catch {
    return false
  }
  // The Desktop shell serves its page through its own protocol.
  if (origin.protocol === 'dsh-app:' || origin.protocol === 'app:' || origin.protocol === 'file:') return true
  if (origin.protocol !== 'http:' && origin.protocol !== 'https:') return false
  // Any loopback page. The port is deliberately not compared: the shell, its
  // fallback host and the host the page was opened from need not agree, and a
  // page that runs on this machine is the same trust domain as this plugin.
  return LOOPBACK_HOSTS.has(origin.hostname)
}

/** Reflect CORS only for the surfaces trustedOrigin accepts. */
function applyCors(request, response) {
  if (!trustedOrigin(request)) return
  const raw = request.headers.origin
  if (typeof raw !== 'string' || raw === '') return
  response.setHeader('access-control-allow-origin', raw)
  response.setHeader('access-control-allow-credentials', 'true')
  response.setHeader('access-control-allow-headers', 'content-type')
  response.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS')
  response.setHeader('vary', 'Origin')
}

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    request.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim()
      if (raw === '') return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('body is not valid JSON'))
      }
    })
    request.on('error', reject)
  })
}

export function apply(ctx) {
  const logger = typeof ctx.logger === 'function' ? ctx.logger('prompt-library') : undefined
  const disposers = []

  /** Serialize writes so two taps never lose an item. */
  let queue = Promise.resolve()
  const mutate = (work) => {
    const run = queue.then(work, work)
    queue = run.catch(() => {})
    return run
  }

  /** Append one line per mutation decision; the client cannot read a 403. */
  const logDecision = (routePath, request, accepted, extra) => {
    try {
      const line =
        JSON.stringify({
          at: new Date().toISOString(),
          kind: accepted ? 'mutation-accepted' : 'mutation-rejected',
          path: routePath,
          origin: String(request.headers.origin ?? ''),
          host: String(request.headers.host ?? ''),
          site: String(request.headers['sec-fetch-site'] ?? ''),
          referer: String(request.headers.referer ?? ''),
          ...(extra === undefined ? {} : { extra }),
        }) + '\n'
      void fsp.appendFile(path.join(dshHome(), 'prompt-library-debug.log'), line, 'utf8').catch(() => {})
    } catch {
      // never break a request for a log line
    }
  }

  const route = (routePath, method, handler, options) => {
    try {
      const dispose = ctx.webServer.register({
        kind: 'exact',
        path: routePath,
        handler: (request, response) => {
          applyCors(request, response)
          if (request.method === 'OPTIONS') {
            response.writeHead(204)
            response.end()
            return
          }
          if (request.method !== method) {
            response.writeHead(405, { allow: method })
            response.end()
            return
          }
          const unguarded = options !== undefined && options.guard === false
          if (method !== 'GET' && !unguarded) logDecision(routePath, request, trustedOrigin(request))
          if (method !== 'GET' && !unguarded && !trustedOrigin(request)) {
            sendJson(response, 403, {
              error: 'this request did not come from the DSH surface',
              origin: String(request.headers.origin ?? ''),
              host: String(request.headers.host ?? ''),
              site: String(request.headers['sec-fetch-site'] ?? ''),
            })
            return
          }
          Promise.resolve(handler(request, response)).catch((error) => {
            logger?.warn?.(`prompt library: ${routePath} failed: ${String(error)}`)
            if (!response.headersSent) sendJson(response, 500, { error: String(error?.message ?? error) })
            else response.end()
          })
        },
      })
      if (typeof dispose === 'function') disposers.push(dispose)
    } catch (error) {
      logger?.warn?.(`prompt library: cannot register ${routePath}: ${String(error)}`)
    }
  }

  route(`${API_PREFIX}/state`, 'GET', async (_request, response) => {
    const store = await readStore(logger)
    sendJson(response, 200, { items: sortItems(store.items), count: store.items.length, bootId: BOOT_ID })
  })

  route(`${API_PREFIX}/add`, 'POST', async (request, response) => {
    const body = await readJsonBody(request)
    const item = normalizeItem({ ...body, id: undefined, createdAt: undefined })
    if (item === null) return sendJson(response, 400, { error: 'text is required' })
    const saved = await mutate(async () => {
      const store = await readStore(logger)
      if (typeof item.name === 'string' && store.items.some((entry) => entry.name === item.name)) {
        throw Object.assign(new Error('a prompt with that name already exists'), { status: 409 })
      }
      store.items.unshift(item)
      await writeStore(store, logger)
      return item
    }).catch((error) => {
      sendJson(response, error.status ?? 500, { error: String(error.message ?? error) })
      return null
    })
    if (saved !== null) sendJson(response, 200, { item: saved })
  })

  route(`${API_PREFIX}/update`, 'POST', async (request, response) => {
    const body = await readJsonBody(request)
    if (typeof body.id !== 'string') return sendJson(response, 400, { error: 'id is required' })
    const result = await mutate(async () => {
      const store = await readStore(logger)
      const index = store.items.findIndex((entry) => entry.id === body.id)
      if (index < 0) return { status: 404, error: 'prompt not found' }
      const current = store.items[index]
      const next = normalizeItem(
        {
          ...current,
          name: body.name ?? current.name,
          text: body.text ?? current.text,
          tags: body.tags ?? current.tags,
          pinnedAt: body.pinnedAt === undefined ? current.pinnedAt : body.pinnedAt,
          updatedAt: Date.now(),
        },
        { keepId: true },
      )
      if (next === null) return { status: 400, error: 'text is required' }
      next.id = current.id
      store.items[index] = next
      await writeStore(store, logger)
      return { status: 200, item: next }
    })
    if (result.error !== undefined) return sendJson(response, result.status, { error: result.error })
    sendJson(response, 200, { item: result.item })
  })

  route(`${API_PREFIX}/reorder`, 'POST', async (request, response) => {
    const body = await readJsonBody(request)
    const ids = Array.isArray(body.ids) ? body.ids.filter((entry) => typeof entry === 'string') : null
    if (ids === null) return sendJson(response, 400, { error: 'ids is required' })
    const order = await mutate(async () => {
      const store = await readStore(logger)
      const byId = new Map(store.items.map((entry) => [entry.id, entry]))
      const ordered = []
      for (const id of ids) {
        const item = byId.get(id)
        if (item === undefined) continue
        ordered.push(item)
        byId.delete(id)
      }
      // Anything the caller did not name keeps its relative order at the end.
      for (const entry of store.items) if (byId.delete(entry.id)) ordered.push(entry)
      store.items = ordered
      await writeStore(store, logger)
      return ordered.map((entry) => entry.id)
    })
    sendJson(response, 200, { ids: order })
  })

  route(`${API_PREFIX}/remove`, 'POST', async (request, response) => {
    const body = await readJsonBody(request)
    if (typeof body.id !== 'string') return sendJson(response, 400, { error: 'id is required' })
    const removed = await mutate(async () => {
      const store = await readStore(logger)
      const before = store.items.length
      store.items = store.items.filter((entry) => entry.id !== body.id)
      if (store.items.length === before) return false
      await writeStore(store, logger)
      return true
    })
    sendJson(response, removed ? 200 : 404, removed ? { ok: true } : { error: 'prompt not found' })
  })

  route(`${API_PREFIX}/import`, 'POST', async (request, response) => {
    const body = await readJsonBody(request)
    // Accept a Voyager export envelope, a bare { items }, or an array.
    const incoming = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : null
    if (incoming === null) return sendJson(response, 400, { error: 'expected { items: [...] }' })
    const stats = await mutate(async () => {
      const store = await readStore(logger)
      const byId = new Map(store.items.map((entry) => [entry.id, entry]))
      const byText = new Map(store.items.map((entry) => [entry.text, entry]))
      let added = 0
      let updated = 0
      let skipped = 0
      for (const raw of incoming) {
        const item = normalizeItem(raw, { keepId: false })
        if (item === null) {
          skipped += 1
          continue
        }
        const existing = byId.get(raw?.id) ?? byText.get(item.text)
        if (existing === undefined) {
          store.items.push(item)
          byText.set(item.text, item)
          added += 1
          continue
        }
        // Same text: keep the newest revision of the name/tags.
        const existingAt = existing.updatedAt ?? existing.createdAt
        const incomingAt = item.updatedAt ?? item.createdAt
        if (incomingAt > existingAt || existing.name === undefined) {
          existing.name = item.name ?? existing.name
          existing.tags = normalizeTags([...existing.tags, ...item.tags])
          existing.updatedAt = Math.max(existingAt, incomingAt)
          updated += 1
        } else {
          skipped += 1
        }
      }
      await writeStore(store, logger)
      return { added, updated, skipped, total: store.items.length }
    })
    sendJson(response, 200, stats)
  })

  route(`${API_PREFIX}/export`, 'GET', async (_request, response) => {
    const store = await readStore(logger)
    sendJson(response, 200, {
      format: EXPORT_FORMAT,
      exportedAt: new Date().toISOString(),
      version: 'dsh-prompt-library',
      items: sortItems(store.items),
    })
  })

  // ---- conversation folders ------------------------------------------------
  // A second, independent store: folder definitions plus one folder id per
  // session id. Nothing here touches the prompt library file.
  const folderPath = () => path.join(dshHome(), 'session-folders.json')

  const emptyFolders = () => ({ version: 1, folders: [], assignments: {} })

  const readFolders = async () => {
    try {
      const raw = await fsp.readFile(folderPath(), 'utf8')
      const parsed = JSON.parse(raw)
      return {
        version: 1,
        folders: Array.isArray(parsed?.folders)
          ? parsed.folders
              .filter((entry) => entry && typeof entry.id === 'string' && typeof entry.name === 'string')
              .map((entry) => ({ id: entry.id, name: entry.name, createdAt: entry.createdAt ?? Date.now() }))
          : [],
        assignments:
          parsed?.assignments !== null && typeof parsed?.assignments === 'object'
            ? Object.fromEntries(
                Object.entries(parsed.assignments).filter(
                  ([sessionId, folderId]) => typeof sessionId === 'string' && typeof folderId === 'string',
                ),
              )
            : {},
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') logger?.warn?.(`prompt library: cannot read folders: ${String(error)}`)
      return emptyFolders()
    }
  }

  const writeFolders = async (state) => {
    const file = folderPath()
    await fsp.mkdir(path.dirname(file), { recursive: true })
    const temp = `${file}.${process.pid}.tmp`
    await fsp.writeFile(temp, JSON.stringify({ ...state, version: 1 }, null, 2), 'utf8')
    await fsp.rename(temp, file)
  }

  route(`${API_PREFIX}/folders/state`, 'GET', async (_request, response) => {
    const state = await readFolders()
    sendJson(response, 200, { folders: state.folders, assignments: state.assignments, bootId: BOOT_ID })
  })

  route(`${API_PREFIX}/folders/create`, 'POST', async (request, response) => {
    const body = await readJsonBody(request)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (name === '') return sendJson(response, 400, { error: 'name is required' })
    const folder = await mutate(async () => {
      const state = await readFolders()
      if (state.folders.some((entry) => entry.name === name)) {
        throw Object.assign(new Error('a folder with that name already exists'), { status: 409 })
      }
      const created = { id: `folder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, name, createdAt: Date.now() }
      state.folders.push(created)
      await writeFolders(state)
      return created
    }).catch((error) => {
      sendJson(response, error.status ?? 500, { error: String(error.message ?? error) })
      return null
    })
    if (folder !== null) sendJson(response, 200, { folder })
  })

  route(`${API_PREFIX}/folders/rename`, 'POST', async (request, response) => {
    const body = await readJsonBody(request)
    if (typeof body.id !== 'string') return sendJson(response, 400, { error: 'id is required' })
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (name === '') return sendJson(response, 400, { error: 'name is required' })
    const ok = await mutate(async () => {
      const state = await readFolders()
      const folder = state.folders.find((entry) => entry.id === body.id)
      if (folder === undefined) return false
      folder.name = name
      await writeFolders(state)
      return true
    })
    sendJson(response, ok ? 200 : 404, ok ? { ok: true } : { error: 'folder not found' })
  })

  route(`${API_PREFIX}/folders/remove`, 'POST', async (request, response) => {
    const body = await readJsonBody(request)
    if (typeof body.id !== 'string') return sendJson(response, 400, { error: 'id is required' })
    await mutate(async () => {
      const state = await readFolders()
      state.folders = state.folders.filter((entry) => entry.id !== body.id)
      // Deleting a folder only unfiles its sessions; the sessions themselves stay.
      for (const [sessionId, folderId] of Object.entries(state.assignments)) {
        if (folderId === body.id) delete state.assignments[sessionId]
      }
      await writeFolders(state)
    })
    sendJson(response, 200, { ok: true })
  }, { guard: false })

  route(`${API_PREFIX}/folders/assign`, 'POST', async (request, response) => {
    const body = await readJsonBody(request)
    if (typeof body.sessionId !== 'string') return sendJson(response, 400, { error: 'sessionId is required' })
    await mutate(async () => {
      const state = await readFolders()
      if (body.folderId === null || body.folderId === undefined || body.folderId === '') delete state.assignments[body.sessionId]
      else state.assignments[body.sessionId] = String(body.folderId)
      await writeFolders(state)
    })
    sendJson(response, 200, { ok: true })
  })

  // ---- client diagnostics ---------------------------------------------------
  // The browser half cannot print to a terminal, so it posts failures here and
  // this appends them to a file beside the stores.
  route(`${API_PREFIX}/debug`, 'POST', async (request, response) => {
    const body = await readJsonBody(request)
    body.origin = String(request.headers.origin ?? '')
    body.host = String(request.headers.host ?? '')
    body.site = String(request.headers['sec-fetch-site'] ?? '')
    body.referer = String(request.headers.referer ?? '')
    try {
      const line = JSON.stringify({ at: new Date().toISOString(), ...body }) + '\n'
      const file = path.join(dshHome(), 'prompt-library-debug.log')
      await fsp.appendFile(file, line, 'utf8')
      const stats = await fsp.stat(file)
      if (stats.size > 512 * 1024) await fsp.writeFile(file, '', 'utf8')
    } catch (error) {
      logger?.warn?.(`prompt library: cannot write debug log: ${String(error)}`)
    }
    sendJson(response, 200, { ok: true })
  })

  if (typeof ctx.effect === 'function') {
    ctx.effect(() => () => {
      for (const dispose of disposers.splice(0)) {
        try {
          dispose()
        } catch {
          // A route that is already gone is not an error.
        }
      }
    })
  }

  logger?.info?.(`prompt library: ${API_PREFIX} ready (store: ${storePath()})`)
}












