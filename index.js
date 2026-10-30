/**
 * Ponytail for DeepSeek Harness.
 *
 * Contract: everything here is best-effort. A failure may degrade this plugin
 * only — it must never throw into the host, block startup, reach the network,
 * or touch files outside ~/.dsh/ponytail.
 */
import {
  mkdirSync, readFileSync, readdirSync, renameSync, realpathSync, rmSync,
  rmdirSync, statSync, writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG_DIR = dirname(fileURLToPath(import.meta.url))
// Derived from the manifest so a rename only touches package.json and the patch row.
const PKG_NAME = readPackageName()
const ENTRY_ID = 'dsh-ponytail'

const LEVELS = ['off', 'lite', 'full', 'ultra']
const DEFAULT_LEVEL = 'full'
const SCHEMA_VERSION = 1
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const STATE_ENTRIES = ['config.json', 'upstream.json', '.lock', 'upstream']

const LEVEL_NOTES = {
  lite: 'Current level: lite. Build what was asked; name the smaller option in one line and let the user pick.',
  full: 'Current level: full. The rules above apply as written.',
  ultra: 'Current level: ultra. Also question the request: before building, push back on any part the need does not justify.',
}

const SOURCES = [
  (ref, path) => `https://raw.githubusercontent.com/DietrichGebert/ponytail/${ref}/${path}`,
  (ref, path) => `https://cdn.jsdelivr.net/gh/DietrichGebert/ponytail@${ref}/${path}`,
]
const RELEASE_API = 'https://api.github.com/repos/DietrichGebert/ponytail/releases/latest'
const NPM_LATEST = 'https://registry.npmjs.org/@dietrichgebert/ponytail/latest'
const REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/

export const name = ENTRY_ID
export const inject = ['skills', 'systemPrompt', 'commands']

export function apply(ctx) {
  const log = makeLog(ctx)
  const stateDir = join(dshHome(), 'ponytail')
  const configPath = join(stateDir, 'config.json')
  const config = readConfig(configPath, log)

  const state = {
    level: config.defaultMode,
    disabled: new Set(config.disabledSkills),
    stateDir,
    configPath,
    configured: config.configured,
    contentDir: resolveContentDir(stateDir),
    upstream: readUpstream(stateDir),
  }

  let skills = loadSkills(state.contentDir, log)
  let mounted = []

  const mount = () => {
    for (const skill of skills) {
      if (state.disabled.has(skill.name)) continue
      try {
        mounted.push(ctx.skills.register(skill))
      } catch (error) {
        log.warn(`skill ${skill.name} not registered: ${msg(error)}`)
      }
    }
    const text = promptText(state.contentDir, state.level, log)
    if (text) {
      try {
        mounted.push(ctx.systemPrompt.section({ name: ENTRY_ID, order: 50, text }))
      } catch (error) {
        log.warn(`prompt section not registered: ${msg(error)}`)
      }
    }
  }

  const unmount = () => {
    for (const dispose of mounted.splice(0)) {
      try { dispose() } catch { /* a dead disposer must not break teardown */ }
    }
  }

  const remount = () => { unmount(); mount() }

  const reloadContent = () => {
    state.contentDir = resolveContentDir(state.stateDir)
    state.upstream = readUpstream(state.stateDir)
    skills = loadSkills(state.contentDir, log)
    remount()
  }

  mount()

  const profileDir = profileDirFrom(ctx)
  ctx.effect(() => () => {
    unmount()
    // pnpm rewrites the profile manifest after this dispose, so poll briefly
    // instead of guessing a delay. Unref'd timers never hold the process open.
    scheduleCleanup({ profileDir, log, state, attempt: 0 })
  })

  try {
    ctx.effect(() => ctx.commands.register({
      name: 'ponytail',
      description: 'Ponytail 强度、技能开关与状态',
      input: { hint: '[lite|full|ultra|off] | default <level> | skills [on|off] <name> | update [--edge|--status|--reset]' },
      handler: async (invocation) => {
        try {
          return await runCommand(invocation.rawInput, state, () => skills, remount, reloadContent, log)
        } catch (error) {
          log.warn(`command failed: ${msg(error)}`)
          return { kind: 'error', text: `ponytail 命令失败：${msg(error)}` }
        }
      },
    }))
  } catch (error) {
    log.warn(`command not registered: ${msg(error)}`)
  }
}

// ---------------------------------------------------------------- commands

export async function runCommand(rawInput, state, currentSkills, remount, reloadContent, log) {
  const args = String(rawInput ?? '').trim().split(/\s+/).filter(Boolean)
  if (args.length === 0) return ok(statusText(state, currentSkills()))

  const [head, ...rest] = args

  if (head === 'default') {
    const level = rest[0]
    if (!LEVELS.includes(level)) return fail(`用法：/ponytail default ${LEVELS.join('|')}`)
    state.level = level
    writeConfig(state, log)
    remount()
    return ok(`ponytail 默认级别已设为 ${level}（已写入 ${display(state.configPath)}）`)
  }

  if (head === 'skills') return skillsCommand(rest, state, currentSkills(), remount, log)
  if (head === 'update') return updateCommand(rest, state, currentSkills(), reloadContent, log)

  if (LEVELS.includes(head)) {
    state.level = head
    remount()
    return ok(statusText(state, currentSkills()))
  }

  return fail(`未知参数 "${head}"。用法：/ponytail [${LEVELS.join('|')}] | default <level> | skills [on|off] <name> | update [--edge|--status|--reset]`)
}

function skillsCommand(rest, state, skills, remount, log) {
  const [verb, target] = rest
  if (!verb) return ok(skillsText(state, skills))
  if (!['on', 'off'].includes(verb)) return fail('用法：/ponytail skills [on|off] <name>')

  const skill = skills.find((item) => item.name === target)
  if (!skill) return fail(`未知技能 "${target ?? ''}"。可用：${skills.map((item) => item.name).join(', ')}`)

  if (verb === 'off') state.disabled.add(skill.name)
  else state.disabled.delete(skill.name)

  writeConfig(state, log)
  remount()
  return ok(skillsText(state, skills))
}

function statusText(state, skills) {
  const enabled = skills.filter((skill) => !state.disabled.has(skill.name)).length
  const source = state.configured ? display(state.configPath) : '默认值（尚未写入配置文件）'
  return `ponytail: ${state.level} · 技能 ${enabled}/${skills.length} 启用 · 来源：${source}`
}

function skillsText(state, skills) {
  const rows = skills.map((skill) => `${state.disabled.has(skill.name) ? '✗' : '✓'} ${skill.name}`)
  return `技能：${rows.join(' · ')}`
}

const ok = (text) => ({ kind: 'success', text })
const fail = (text) => ({ kind: 'error', text })

// ------------------------------------------------------------------ update

export async function updateCommand(rest, state, skills, reloadContent, log) {
  const flag = rest[0] ?? ''
  if (flag === '--status') return ok(updateStatus(state))
  if (flag === '--reset') return resetUpstream(state, reloadContent, log)
  if (flag && flag !== '--edge') return fail('用法：/ponytail update [--edge|--status|--reset]')

  try {
    const channel = flag === '--edge' ? 'edge' : 'stable'
    const ref = channel === 'edge' ? 'main' : await latestTag()
    // shortcut: the upstream skill set is assumed unchanged; read it from the GitHub contents API when upstream adds one.
    const names = skills.map((skill) => skill.name)
    if (names.length === 0) return fail('没有可更新的技能清单')

    const get = upstreamReader(ref)
    const prompt = await get('AGENTS.md')
    if (prompt.trim().length < 200) throw new Error('AGENTS.md looks empty')

    const files = [{ path: 'AGENTS.md', text: prompt }]
    for (const name of names) {
      const text = await get(`skills/${name}/SKILL.md`)
      const parsed = parseSkill(text)
      if (!parsed || parsed.name !== name || !parsed.description) throw new Error(`${name}/SKILL.md invalid`)
      files.push({ path: `skills/${name}/SKILL.md`, text })
    }

    installUpstream(state, ref, channel, files, log)
    reloadContent()
    return ok(`已更新到上游 ${ref}（${channel}）· ${files.length} 个文件`)
  } catch (error) {
    return fail(`更新失败：${msg(error)}。当前内容未改动。`)
  }
}

function installUpstream(state, ref, channel, files, log) {
  const root = join(state.stateDir, 'upstream')
  const target = join(root, ref)
  const tmp = join(root, `.tmp-${process.pid}-${Date.now()}`)
  try {
    mkdirSync(tmp, { recursive: true })
    for (const file of files) {
      const destination = join(tmp, file.path)
      mkdirSync(dirname(destination), { recursive: true })
      writeFileSync(destination, file.text, 'utf8')
    }
    rmSync(target, { recursive: true, force: true })
    renameSync(tmp, target)
    writeFileSync(join(state.stateDir, 'upstream.json'), `${JSON.stringify({
      ref,
      channel,
      syncedAt: new Date().toISOString(),
      files: files.map((file) => file.path),
    }, null, 2)}\n`, 'utf8')
  } catch (error) {
    try { rmSync(tmp, { recursive: true, force: true }) } catch { /* best effort */ }
    log.warn(`upstream not installed: ${msg(error)}`)
    throw error
  }
}

function resetUpstream(state, reloadContent, log) {
  try {
    rmSync(join(state.stateDir, 'upstream'), { recursive: true, force: true })
    rmSync(join(state.stateDir, 'upstream.json'), { force: true })
  } catch (error) {
    log.warn(`upstream not removed: ${msg(error)}`)
  }
  reloadContent()
  return ok('已回退到内置快照')
}

function updateStatus(state) {
  if (state.contentDir === PKG_DIR) return '来源：内置快照 · 尚未从上游更新'
  const meta = state.upstream ?? {}
  return `来源：上游 ${meta.ref ?? '?'} · channel ${meta.channel ?? '?'} · 同步于 ${meta.syncedAt ?? '?'}`
}

async function latestTag() {
  try {
    const response = await fetch(RELEASE_API, {
      signal: AbortSignal.timeout(8000),
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'dsh-ponytail' },
    })
    if (!response.ok) throw new Error(`GitHub API ${response.status}`)
    const data = await response.json()
    const tag = String(data?.tag_name ?? '')
    if (!REF_PATTERN.test(tag)) throw new Error(`unexpected release tag "${tag}"`)
    return tag
  } catch (error) {
    const response = await fetch(NPM_LATEST, {
      signal: AbortSignal.timeout(8000),
      headers: { 'user-agent': 'dsh-ponytail' },
    })
    if (!response.ok) throw new Error(`version lookup failed: ${msg(error)}; npm ${response.status}`)
    const data = await response.json()
    const version = String(data?.version ?? '')
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`unexpected npm version "${version}"`)
    return `v${version}`
  }
}

/**
 * Fetch one upstream file, trying the raw CDN and the jsDelivr mirror. The
 * first file races both so a blackholed CDN costs no extra wall time; later
 * files stay on the source that answered.
 */
function upstreamReader(ref) {
  let active = -1
  return async (path) => {
    if (active === -1) {
      try {
        const [index, text] = await Promise.any(
          SOURCES.map((build, i) => fetchText(build(ref, path)).then((value) => [i, value])),
        )
        active = index
        return text
      } catch {
        throw new Error('上游不可达（raw 与 jsDelivr 均失败）')
      }
    }
    let last
    for (const index of active === 0 ? [0, 1] : [1, 0]) {
      try {
        const text = await fetchText(SOURCES[index](ref, path))
        active = index
        return text
      } catch (error) {
        last = error
      }
    }
    throw last
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { 'user-agent': 'dsh-ponytail' },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url.split('/').pop()}`)
  const text = await response.text()
  if (text.length > 512 * 1024) throw new Error('response too large')
  return text
}

function readUpstream(stateDir) {
  try {
    const data = JSON.parse(readFileSync(join(stateDir, 'upstream.json'), 'utf8'))
    return typeof data?.ref === 'string' && REF_PATTERN.test(data.ref) ? data : undefined
  } catch {
    return undefined
  }
}

function resolveContentDir(stateDir) {
  const meta = readUpstream(stateDir)
  if (!meta) return PKG_DIR
  try {
    const dir = join(stateDir, 'upstream', meta.ref)
    if (statSync(join(dir, 'AGENTS.md')).isFile() && readdirSync(join(dir, 'skills')).length > 0) return dir
  } catch { /* fall back to the bundled snapshot */ }
  return PKG_DIR
}

// ------------------------------------------------------------------ config

function dshHome() {
  const home = process.env.DSH_HOME?.trim()
  return home && home.length > 0 ? home : join(homedir(), '.dsh')
}

function readConfig(path, log) {
  const fallback = { defaultMode: DEFAULT_LEVEL, disabledSkills: [], configured: false }
  try {
    const data = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('not an object')
    if (data.schemaVersion !== SCHEMA_VERSION) log.warn(`config schemaVersion ${data.schemaVersion} ignored`)
    const defaultMode = LEVELS.includes(data.defaultMode) ? data.defaultMode : DEFAULT_LEVEL
    const disabledSkills = Array.isArray(data.disabledSkills)
      ? data.disabledSkills.filter((name) => typeof name === 'string' && SKILL_NAME.test(name))
      : []
    return { defaultMode, disabledSkills, configured: true }
  } catch (error) {
    if (error?.code !== 'ENOENT') log.warn(`config ignored (${msg(error)}); using defaults`)
    return fallback
  }
}

function writeConfig(state, log) {
  try {
    const dir = dirname(state.configPath)
    mkdirSync(dir, { recursive: true })
    const body = `${JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      defaultMode: state.level,
      disabledSkills: [...state.disabled].sort(),
    }, null, 2)}\n`
    const tmp = join(dir, `.config.${process.pid}.tmp`)
    writeFileSync(tmp, body, 'utf8')
    renameSync(tmp, state.configPath)
    state.configured = true
  } catch (error) {
    log.warn(`config not written: ${msg(error)}`)
  }
}

// ------------------------------------------------------------------- state

const CLEANUP_POLL_MS = 500
const CLEANUP_MAX_ATTEMPTS = 20

/** Poll the profile manifest for up to 10s: a dependency that stays means the
 *  plugin was disabled, not uninstalled, so state is kept. */
function scheduleCleanup({ profileDir, log, state, attempt }) {
  try {
    setTimeout(() => {
      try {
        if (stillInstalled(profileDir)) {
          if (attempt < CLEANUP_MAX_ATTEMPTS) scheduleCleanup({ profileDir, log, state, attempt: attempt + 1 })
          return
        }
        removeStateOnUninstall({ profileDir, log, state })
      } catch (error) {
        log.warn(`state kept (${msg(error)})`)
      }
    }, CLEANUP_POLL_MS).unref?.()
  } catch { /* scheduling failure leaves state behind, never breaks the host */ }
}

function removeStateOnUninstall({ profileDir, log, state }) {
  if (!profileDir) return
  if (stillInstalled(profileDir)) return

  const dir = dirname(state.configPath)
  for (const entry of STATE_ENTRIES) {
    const target = join(dir, entry)
    try {
      const real = realpathSync(target)
      if (!real.startsWith(dir + sep)) continue
      rmSync(real, { recursive: true, force: true })
    } catch { /* missing: nothing to remove */ }
  }
  try { rmdirSync(dir) } catch { /* not empty or gone */ }
  log.info('state removed after uninstall')
}

/**
 * Disabling a bundle drops it from `dsh.profile.bundles` but keeps the package
 * in `dependencies`; only a real uninstall removes both. Unreadable counts as
 * installed so a failed probe leaves state behind instead of deleting it.
 */
export function stillInstalled(profileDir) {
  try {
    const pkg = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      const deps = pkg?.[field]
      if (deps && typeof deps === 'object' && Object.hasOwn(deps, PKG_NAME)) return true
    }
    return false
  } catch {
    return true
  }
}

function profileDirFrom(ctx) {
  try {
    if (typeof ctx.baseUrl === 'string' && ctx.baseUrl.startsWith('file:')) return fileURLToPath(ctx.baseUrl)
  } catch { /* fall through */ }
  return process.env.DSH_PROFILE_DIR ?? undefined
}

// ------------------------------------------------------------------ skills

function loadSkills(contentDir, log) {
  const skillsRoot = join(contentDir, 'skills')
  let names = []
  try {
    names = readdirSync(skillsRoot).sort()
  } catch (error) {
    log.warn(`skills directory unreadable: ${msg(error)}`)
    return []
  }

  const skills = []
  for (const name of names) {
    try {
      const file = join(skillsRoot, name, 'SKILL.md')
      if (!statSync(file).isFile()) continue
      const parsed = parseSkill(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
      if (!parsed) throw new Error('no frontmatter')
      if (parsed.name !== name) throw new Error(`frontmatter name "${parsed.name}" != directory`)
      if (!SKILL_NAME.test(parsed.name)) throw new Error('name is not kebab-case')
      if (!parsed.description) throw new Error('missing description')
      skills.push({
        name: parsed.name,
        description: parsed.description,
        content: parsed.content,
        path: file,
        source: 'bundled',
      })
    } catch (error) {
      log.warn(`skill ${name} skipped: ${msg(error)}`)
    }
  }
  return skills
}

export function parseSkill(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(text)
  if (!match) return undefined
  const meta = parseFrontmatter(match[1])
  return { ...meta, content: text.slice(match[0].length) }
}

function parseFrontmatter(raw) {
  const out = {}
  const lines = raw.split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    const pair = /^([A-Za-z][\w-]*):[ \t]*(.*)$/.exec(line)
    if (!pair) continue
    const [, key, value] = pair
    if (value === '>' || value === '>-' || value === '|' || value === '|-') {
      const block = []
      while (i + 1 < lines.length && (lines[i + 1].trim() === '' || /^[ \t]+\S/.test(lines[i + 1]))) {
        block.push(lines[i + 1])
        i += 1
      }
      out[key] = value.startsWith('>')
        ? block.map((part) => part.trim()).filter(Boolean).join(' ')
        : block.map((part) => part.replace(/^ {2}/, '')).join('\n').trim()
    } else {
      out[key] = value.trim().replace(/^(['"])(.*)\1$/, '$2')
    }
  }
  return out
}

function promptText(contentDir, level, log) {
  if (level === 'off') return ''
  try {
    const base = readFileSync(join(contentDir, 'AGENTS.md'), 'utf8').trim()
    if (!base) return ''
    const note = LEVEL_NOTES[level]
    return note ? `${base}\n\n## Level\n\n${note}\n` : `${base}\n`
  } catch (error) {
    log.warn(`prompt file unreadable: ${msg(error)}`)
    return ''
  }
}

// ------------------------------------------------------------------ helpers

function makeLog(ctx) {
  try {
    const logger = ctx.logger
    if (logger?.warn) {
      return {
        info: (text) => { try { logger.info?.(text) } catch { /* logging never throws */ } },
        warn: (text) => { try { logger.warn?.(text) } catch { /* logging never throws */ } },
      }
    }
  } catch { /* no logger service: fall through */ }
  return {
    info: (text) => console.log(`[ponytail] ${text}`),
    warn: (text) => console.warn(`[ponytail] ${text}`),
  }
}

function display(path) {
  const home = homedir()
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path
}

function readPackageName() {
  try {
    return JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8')).name
  } catch {
    return 'dsh-ponytail'
  }
}

function msg(error) {
  return error instanceof Error ? error.message : String(error)
}
