// Direct assert tests for the host write API; run with: node test/manage.test.mjs.

import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { normalizeConfig } from '../lib/config.mjs'
import {
  bindPreset,
  copyPreset,
  deletePreset,
  deleteProfile,
  importPack,
  registerManageContext,
  removeToolName,
  rescan,
  setDebugLog,
  setEnabled,
  setLanguage,
  setProfile,
  unbindPreset
} from '../lib/manage.mjs'

const presetIds = ['default', 'cordis', 'ptc']
const globalTools = ['read', 'write', 'web_search']

function harness (initial = {}, options = {}) {
  let current = normalizeConfig(initial)
  let stored = { ...initial }
  let editCalls = 0
  let reapplyCalls = 0
  const entry = { id: 'agent-tool-filter', name: 'dsh-agent-tool-filter' }
  const configEditor = {
    entries: () => [entry],
    async edit (target, change) {
      editCalls += 1
      assert.equal(target, entry)
      if (options.editError) throw new Error('write failed')
      const next = change(stored)
      assert.notEqual(next, stored, 'change must return a new config object')
      stored = next
      return next
    }
  }
  const ctx = {
    get (key) {
      if (key === 'configEditor') return options.noEditor ? undefined : configEditor
      if (key === 'agentPresets') return { list: () => presetIds.map(id => ({ id })) }
      if (key === 'tools') return { schemas: () => globalTools.map(name => ({ name })) }
      if (key === 'agents') return { list: () => [] }
      return undefined
    }
  }
  registerManageContext(ctx, {
    initialConfig: initial,
    getConfig: () => current,
    setConfig: config => { current = config },
    reapply: () => { reapplyCalls += 1 }
  })
  return {
    ctx,
    editCalls: () => editCalls,
    reapplyCalls: () => reapplyCalls,
    stored: () => stored,
    current: () => current
  }
}

let passed = 0
async function check (name, callback) {
  await callback()
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

await check('setProfile rejects reserved run_code without a write', async () => {
  const h = harness()
  const result = await setProfile(h.ctx, 'custom', { mode: 'deny', tools: ['run_code'] })
  assert.equal(result.ok, false)
  assert.match(result.error, /зарезервированный/)
  assert.equal(result.field, 'tools')
  assert.equal(h.editCalls(), 0)
})

await check('setProfile rejects both glob characters with exact-name guidance', async () => {
  for (const tool of ['team_task_*', 'team_task_?']) {
    const h = harness()
    const result = await setProfile(h.ctx, 'custom', { mode: 'deny', tools: [tool] })
    assert.equal(result.ok, false)
    assert.match(result.error, /перечисляйте точные имена/)
    assert.equal(result.field, 'tools')
    assert.equal(h.editCalls(), 0)
  }
})

await check('setProfile rejects empty tools in deny and allow modes', async () => {
  for (const mode of ['deny', 'allow']) {
    const h = harness()
    const result = await setProfile(h.ctx, 'custom', { mode, tools: [] })
    assert.equal(result.ok, false)
    assert.match(result.error, /tools не может быть пустым/)
    assert.equal(h.editCalls(), 0)
  }
})

await check('setProfile rejects unsupported mode without a write', async () => {
  const h = harness()
  const result = await setProfile(h.ctx, 'custom', { mode: 'hide', tools: ['read'] })
  assert.equal(result.ok, false)
  assert.equal(result.field, 'mode')
  assert.equal(h.editCalls(), 0)
})

await check('setProfile rejects a missing tools array without a write', async () => {
  const h = harness()
  const result = await setProfile(h.ctx, 'custom', { mode: 'deny' })
  assert.equal(result.ok, false)
  assert.equal(result.field, 'tools')
  assert.equal(h.editCalls(), 0)
})

await check('setProfile retains unknown tools and returns warnings', async () => {
  const h = harness()
  const result = await setProfile(h.ctx, 'custom', { mode: 'deny', tools: ['ghost_tool'] })
  assert.equal(result.ok, true)
  assert.deepEqual(result.config.profiles.custom.tools, ['ghost_tool'])
  assert.ok(result.warnings.some(warning => warning.includes('ghost_tool')))
  assert.equal(h.editCalls(), 1)
  assert.equal(h.reapplyCalls(), 1)
})

await check('setProfile can override an embedded profile', async () => {
  const h = harness()
  const result = await setProfile(h.ctx, 'cordis-trim', { mode: 'allow', tools: ['read'] })
  assert.equal(result.ok, true)
  assert.deepEqual(result.config.profiles['cordis-trim'], { mode: 'allow', tools: ['read'] })
  assert.equal(h.editCalls(), 1)
})

await check('bindPreset accepts existing preset and custom profile', async () => {
  const h = harness({ profiles: { custom: { mode: 'deny', tools: ['read'] } } })
  const result = await bindPreset(h.ctx, 'cordis', 'custom')
  assert.equal(result.ok, true)
  assert.equal(result.config.presets.cordis, 'custom')
  assert.equal(h.editCalls(), 1)
})

await check('bindPreset rejects missing profile and missing preset without writes', async () => {
  const h = harness()
  const missingProfile = await bindPreset(h.ctx, 'cordis', 'missing')
  const missingPreset = await bindPreset(h.ctx, 'unknown-preset', 'balanced')
  assert.equal(missingProfile.ok, false)
  assert.equal(missingProfile.field, 'profileName')
  assert.equal(missingPreset.ok, false)
  assert.equal(missingPreset.field, 'presetId')
  assert.equal(h.editCalls(), 0)
})

await check('unbindPreset removes the binding in one write', async () => {
  const h = harness({ presets: { cordis: 'balanced' } })
  const result = await unbindPreset(h.ctx, 'cordis')
  assert.equal(result.ok, true)
  assert.deepEqual(result.config.presets, {})
  assert.equal(h.editCalls(), 1)
})

await check('setEnabled writes once and returns the status contract', async () => {
  const h = harness()
  const result = await setEnabled(h.ctx, false)
  assert.equal(result.ok, true)
  assert.equal(result.config.enabled, false)
  assert.equal(result.status.enabled, false)
  assert.equal(h.editCalls(), 1)
  assert.equal(h.reapplyCalls(), 1)
})

await check('setEnabled rejects non-boolean values without a write', async () => {
  const h = harness()
  const result = await setEnabled(h.ctx, 'false')
  assert.equal(result.ok, false)
  assert.equal(result.field, 'enabled')
  assert.equal(h.editCalls(), 0)
})

await check('setDebugLog writes once and persists the debug log flag', async () => {
  const h = harness()
  const on = await setDebugLog(h.ctx, true)
  assert.equal(on.ok, true)
  assert.equal(on.config.debugLog, true)
  assert.equal(on.status.debugLog, true)
  assert.equal(h.stored().debugLog, true)
  assert.equal(h.editCalls(), 1)
  assert.equal(h.reapplyCalls(), 1)

  const off = await setDebugLog(h.ctx, false)
  assert.equal(off.ok, true)
  assert.equal(off.config.debugLog, false)
  assert.equal(h.stored().debugLog, false)
  assert.equal(h.editCalls(), 2)
})

await check('setDebugLog rejects non-boolean values without a write', async () => {
  const h = harness()
  const result = await setDebugLog(h.ctx, 'true')
  assert.equal(result.ok, false)
  assert.equal(result.field, 'enabled')
  assert.match(result.error, /boolean/)
  assert.equal(h.editCalls(), 0)
})

await check('deleteProfile resets an overridden built-in profile to its default', async () => {
  const h = harness({ presets: { cordis: 'balanced' } })
  const override = await setProfile(h.ctx, 'balanced', { mode: 'allow', tools: ['read'] })
  assert.equal(override.ok, true)
  assert.deepEqual(h.stored().profiles['balanced'], { mode: 'allow', tools: ['read'] })

  const result = await deleteProfile(h.ctx, 'balanced')
  assert.equal(result.ok, true)
  assert.deepEqual(result.config.profiles['balanced'], normalizeConfig().profiles['balanced'])
  assert.equal(result.config.presets.cordis, 'balanced')
  assert.equal(h.stored().profiles['balanced'], undefined)
  assert.equal(h.editCalls(), 2)
})

await check('deleteProfile rejects a built-in profile without an override', async () => {
  const h = harness()
  const result = await deleteProfile(h.ctx, 'balanced')
  assert.equal(result.ok, false)
  assert.equal(result.error, 'встроенный профиль не удаляется (override отсутствует)')
  assert.equal(result.field, 'name')
  assert.equal(h.editCalls(), 0)
})

await check('deleteProfile rejects a missing custom profile without a write', async () => {
  const h = harness()
  const result = await deleteProfile(h.ctx, 'missing')
  assert.equal(result.ok, false)
  assert.equal(result.error, 'профиль "missing" не найден')
  assert.equal(result.field, 'name')
  assert.equal(h.editCalls(), 0)
})

await check('deleteProfile lists presets that use the profile', async () => {
  const h = harness({
    presets: { cordis: 'custom', ptc: 'custom' },
    profiles: { custom: { mode: 'deny', tools: ['read'] } }
  })
  const result = await deleteProfile(h.ctx, 'custom')
  assert.equal(result.ok, false)
  assert.match(result.error, /cordis, ptc/)
  assert.equal(result.field, 'name')
  assert.equal(h.editCalls(), 0)
})

await check('deleteProfile removes an unused custom profile in one write', async () => {
  const h = harness({ profiles: { custom: { mode: 'deny', tools: ['read'] } } })
  const result = await deleteProfile(h.ctx, 'custom')
  assert.equal(result.ok, true)
  assert.equal(result.config.profiles.custom, undefined)
  assert.equal(h.editCalls(), 1)
})

await check('removeToolName strips the name from every profile in one write', async () => {
  const h = harness({ profiles: { custom: { mode: 'deny', tools: ['ghost_tool', 'read'] }, other: { mode: 'deny', tools: ['ghost_tool'] } } })
  const result = await removeToolName(h.ctx, 'ghost_tool')
  assert.equal(result.ok, true, result.error)
  assert.deepEqual(result.config.profiles.custom.tools, ['read'])
  assert.deepEqual(result.config.profiles.other.tools, [])
  assert.equal(h.editCalls(), 1)
  assert.equal(h.reapplyCalls(), 1)
})

await check('removeToolName rejects an unknown name and empty input without writes', async () => {
  const h = harness({ profiles: { custom: { mode: 'deny', tools: ['read'] } } })
  const unknown = await removeToolName(h.ctx, 'ghost_tool')
  assert.equal(unknown.ok, false)
  assert.match(unknown.error, /не найдено в профилях/)
  const empty = await removeToolName(h.ctx, '  ')
  assert.equal(empty.ok, false)
  assert.equal(h.editCalls(), 0)
})

await check('rescan returns the scan report and unknown-name warnings', async () => {
  const h = harness({ profiles: { custom: { mode: 'deny', tools: ['ghost_tool'] } } })
  const result = await rescan(h.ctx)
  assert.equal(result.ok, true)
  assert.equal(result.result.available, true)
  assert.deepEqual(result.result.names, [...globalTools].sort())
  assert.deepEqual(result.result.report.custom.unconfirmed, ['ghost_tool'])
  assert.ok(result.warnings.some(warning => warning.includes('ghost_tool')))
  assert.equal(h.editCalls(), 0)
})

await check('missing configEditor returns its specified error without writing', async () => {
  const h = harness({}, { noEditor: true })
  const result = await setEnabled(h.ctx, false)
  assert.equal(result.ok, false)
  assert.equal(result.error, 'configEditor недоступен')
  assert.equal(h.editCalls(), 0)
})

await check('configEditor failure is returned and does not re-apply', async () => {
  const h = harness({}, { editError: true })
  const result = await setEnabled(h.ctx, false)
  assert.equal(result.ok, false)
  assert.equal(result.error, 'write failed')
  assert.equal(h.reapplyCalls(), 0)
})

// Регресс: id строки в составном дереве несёт префиксы слоёв (':'-склейка),
// каноническая идентичность — сам Entry нашего fiber (ctx.fiber.entry).
await check('configEditor resolves the fiber entry first', async () => {
  const fiberEntry = { id: 'bundles:agent-tool-filter', options: { id: 'agent-tool-filter', name: 'dsh-agent-tool-filter' } }
  let edited = null
  const editor = {
    entries: () => [{ id: 'include:other', options: { id: 'other' } }],
    async edit (target, change) {
      edited = target
      return change({ enabled: true, presets: {}, profiles: {} })
    }
  }
  const ctx = {
    fiber: { entry: fiberEntry },
    get (key) {
      if (key === 'configEditor') return editor
      if (key === 'tools') return { schemas: () => [] }
      if (key === 'agents') return { list: () => [] }
      return undefined
    }
  }
  registerManageContext(ctx, {
    initialConfig: {},
    getConfig: () => normalizeConfig({}),
    setConfig: () => {},
    reapply: () => {}
  })
  const result = await setEnabled(ctx, false)
  assert.equal(result.ok, true, result.error)
  assert.equal(edited, fiberEntry, 'edit must receive the fiber entry')
})

await check('composed row ids are matched without a fiber entry', async () => {
  const composed = { id: 'bundles:agent-tool-filter', options: { id: 'agent-tool-filter' } }
  let edited = null
  const editor = {
    entries: () => [composed],
    async edit (target, change) {
      edited = target
      return change({ enabled: true, presets: {}, profiles: {} })
    }
  }
  const ctx = {
    get (key) {
      if (key === 'configEditor') return editor
      if (key === 'tools') return { schemas: () => [] }
      if (key === 'agents') return { list: () => [] }
      return undefined
    }
  }
  registerManageContext(ctx, {
    initialConfig: {},
    getConfig: () => normalizeConfig({}),
    setConfig: () => {},
    reapply: () => {}
  })
  const result = await setEnabled(ctx, true)
  assert.equal(result.ok, true, result.error)
  assert.equal(edited, composed, 'composed id must match via the fallback lookup')
})

await check('importPack writes the whole pack in one transaction', async () => {
  const h = harness()
  const result = await importPack(h.ctx, 'gradient')
  assert.equal(result.ok, true, result.error)
  assert.deepEqual(Object.keys(result.config.profiles).sort(), ['balanced', 'soft', 'strict'])
  assert.equal(result.config.profiles.soft.mode, 'deny')
  assert.equal(h.editCalls(), 1)
})

await check('importPack rejects an unknown pack without a write', async () => {
  const h = harness()
  const result = await importPack(h.ctx, 'no-such-pack')
  assert.equal(result.ok, false)
  assert.equal(result.field, 'packId')
  assert.match(result.error, /no-such-pack/)
  assert.equal(h.editCalls(), 0)
})

// Персистентность копии пресета: insert-строка ДОПИСЫВАЕТСЯ в профильный patch.
const patchDir = mkdtempSync(join(tmpdir(), 'atf-manage-test-'))
const patchFile = join(patchDir, 'cordis.patch.yml')
writeFileSync(patchFile, '# comment must survive\n[]\n', 'utf8')
process.env.DSH_PROFILE_DIR = patchDir

await check('copyPreset inserts a full custom preset copy into the profile tree', async () => {
  const inserted = []
  const tree = { create: async options => { inserted.push(options); return options.id }, remove: async () => {} }
  const entry = { parent: { tree } }
  const presetRow = {
    id: 'preset-cordis',
    options: {
      id: 'preset-cordis',
      name: '@deepseek-ai/dsh-agent-preset-registry',
      config: { id: 'cordis', name: 'Cordis', description: 'base', plugins: [{ name: 'x', config: {}, disabled: { __jsExpr: 'true' } }] }
    }
  }
  const ctx = {
    fiber: { entry },
    get (key) {
      if (key === 'configEditor') return { entries: () => [presetRow], async edit () { throw new Error('not used') } }
      if (key === 'tools') return { schemas: () => [] }
      if (key === 'agents') return { list: () => [] }
      return undefined
    }
  }
  registerManageContext(ctx, {
    initialConfig: {},
    getConfig: () => normalizeConfig({}),
    setConfig: () => {},
    reapply: () => {}
  })
  const result = await copyPreset(ctx, 'cordis', 'My Copy')
  assert.equal(result.ok, true, result.error)
  assert.equal(inserted.length, 1)
  assert.equal(inserted[0].id, 'preset-my-copy')
  assert.equal(inserted[0].name, '@deepseek-ai/dsh-agent-preset-registry', 'copy must reuse the source row package')
  assert.equal(inserted[0].config.id, 'my-copy')
  assert.equal(inserted[0].config.name, 'My Copy')
  assert.equal(inserted[0].config.description, 'Копия Cordis\nbase', 'description template: first line «Копия <название>» + source description')
  assert.deepEqual(inserted[0].config.plugins, [{ name: 'x', config: {}, disabled: { __jsExpr: 'true' } }])
  assert.equal(result.presetId, 'preset-my-copy')

  // Персистентность: insert-строка в файле, комментарии файла целы, !!js сохранены.
  const written = readFileSync(patchFile, 'utf8')
  assert.ok(written.includes('# comment must survive'), 'existing comments must survive the append')
  assert.ok(written.includes('- insert:'), 'copy must persist as an insert row')
  assert.ok(written.includes('preset-my-copy'), 'row id must persist')
  assert.ok(written.includes('!!js true'), 'JsExpr values must persist as !!js scalars')
})

await check('copyPreset takes name/description from agentPresets roster when the config row is a bare override', async () => {
  const inserted = []
  const tree = { create: async options => { inserted.push(options); return options.id }, remove: async () => {} }
  const entry = { parent: { tree } }
  // Сырая строка override слоя: только {id, order, plugins} — как у стандартных пресетов.
  const rows = [{ id: 'preset-standard', options: { id: 'preset-standard', config: { id: 'standard', order: 1, plugins: [{ name: 'x' }] } } }]
  const ctx = {
    fiber: { entry },
    get (key) {
      if (key === 'configEditor') return { entries: () => rows, async edit () { throw new Error('not used') } }
      if (key === 'agentPresets') return { list: async () => [{ id: 'standard', name: 'Standard', description: 'Обычный пресет' }] }
      return undefined
    }
  }
  registerManageContext(ctx, {
    initialConfig: {},
    getConfig: () => normalizeConfig({}),
    setConfig: () => {},
    reapply: () => {}
  })
  const result = await copyPreset(ctx, 'standard', 'Моя Копия')
  assert.equal(result.ok, true, result.error)
  assert.equal(inserted[0].config.description, 'Копия Standard\nОбычный пресет', 'name/description must come from the agentPresets roster (merged config), not the bare override row')
})

await check('copyPreset writes client display texts (DSH dictionary) into the copy description', async () => {
  const inserted = []
  const tree = { create: async options => { inserted.push(options); return options.id }, remove: async () => {} }
  const entry = { parent: { tree } }
  // Шиповый пресет: строка override без name/description, roster без своего имени.
  const rows = [{ id: 'preset-standard', options: { id: 'preset-standard', config: { id: 'standard', order: 1, plugins: [{ name: 'x' }] } } }]
  const ctx = {
    fiber: { entry },
    get (key) {
      if (key === 'configEditor') return { entries: () => rows, async edit () { throw new Error('not used') } }
      if (key === 'agentPresets') return { list: async () => [{ id: 'standard' }] }
      return undefined
    }
  }
  registerManageContext(ctx, {
    initialConfig: {},
    getConfig: () => normalizeConfig({}),
    setConfig: () => {},
    reapply: () => {}
  })
  // Display приходит из клиента (resolvePresetDisplay по словарю DSH, активная локаль):
  // короткое описание — разделы гайда в описание не входят (они в попапах UI).
  const display = {
    name: 'Standard mode',
    description: 'Work with code, files, and information. Suitable for most tasks.'
  }
  const result = await copyPreset(ctx, 'standard', 'Моя Копия', display)
  assert.equal(result.ok, true, result.error)
  assert.equal(inserted[0].config.description, `Копия Standard mode\n${display.description}`, 'client display texts must win over published metadata')
  // Некорректный display отклоняется без записи.
  const bad = await copyPreset(ctx, 'standard', 'Другая Копия', 42)
  assert.equal(bad.ok, false)
  assert.equal(bad.field, 'display')
  assert.equal(inserted.length, 1, 'invalid display must not insert')
})

await check('copyPreset rejects a duplicate preset id without inserting', async () => {
  const inserted = []
  const tree = { create: async options => { inserted.push(options); return options.id } }
  const entry = { parent: { tree } }
  const rows = [
    { id: 'preset-cordis', options: { id: 'preset-cordis', config: { id: 'cordis', plugins: [] } } },
    { id: 'preset-my-copy', options: { id: 'preset-my-copy', config: { id: 'my-copy', plugins: [] } } }
  ]
  const ctx = {
    fiber: { entry },
    get (key) {
      if (key === 'configEditor') return { entries: () => rows, async edit () { throw new Error('not used') } }
      return undefined
    }
  }
  registerManageContext(ctx, {
    initialConfig: {},
    getConfig: () => normalizeConfig({}),
    setConfig: () => {},
    reapply: () => {}
  })
  const result = await copyPreset(ctx, 'cordis', 'My Copy')
  assert.equal(result.ok, false)
  assert.equal(result.field, 'newName')
  assert.equal(inserted.length, 0)
})

await check('copyPreset accepts non-Latin names (platform requires only non-empty ids)', async () => {
  const inserted = []
  const tree = { create: async options => { inserted.push(options); return options.id }, remove: async () => {} }
  const entry = { parent: { tree } }
  const rows = [{ id: 'preset-источник', options: { id: 'preset-источник', config: { id: 'источник', name: 'Источник', plugins: [] } } }]
  const ctx = {
    fiber: { entry },
    get (key) {
      if (key === 'configEditor') return { entries: () => rows, async edit () { throw new Error('not used') } }
      return undefined
    }
  }
  registerManageContext(ctx, {
    initialConfig: {},
    getConfig: () => normalizeConfig({}),
    setConfig: () => {},
    reapply: () => {}
  })
  const result = await copyPreset(ctx, 'источник', 'Мой Пресет')
  assert.equal(result.ok, true, result.error)
  assert.equal(inserted[0].config.id, 'мой-пресет')
  assert.equal(inserted[0].config.name, 'Мой Пресет')
  assert.equal(inserted[0].config.description, 'Копия Источник')
})

await check('deletePreset removes the declaration block and keeps file comments', async () => {
  const removed = []
  const tree = { create: async options => options.id, remove: async id => { removed.push(id) } }
  const entry = { parent: { tree } }
  const rows = [{ id: 'preset-my-copy', options: { id: 'preset-my-copy', config: { id: 'my-copy', plugins: [] } } }]
  const ctx = {
    fiber: { entry },
    get (key) {
      if (key === 'configEditor') return { entries: () => rows, async edit () { throw new Error('not used') } }
      return undefined
    }
  }
  registerManageContext(ctx, {
    initialConfig: {},
    getConfig: () => normalizeConfig({}),
    setConfig: () => {},
    reapply: () => {}
  })
  const result = await deletePreset(ctx, 'my-copy')
  assert.equal(result.ok, true, result.error)
  assert.deepEqual(removed, ['preset-my-copy'], 'live tree must drop the row')
  const text = readFileSync(patchFile, 'utf8')
  assert.ok(!text.includes('preset-my-copy'), 'declaration block must leave the file')
  assert.ok(text.includes('# comment must survive'), 'other content must survive deletion')
})

await check('deletePreset rejects built-in presets (not declared in the profile patch)', async () => {
  const removed = []
  const tree = { create: async options => options.id, remove: async id => { removed.push(id) } }
  const entry = { parent: { tree } }
  const rows = [{ id: 'preset-cordis', options: { id: 'preset-cordis', config: { id: 'cordis', plugins: [] } } }]
  const ctx = {
    fiber: { entry },
    get (key) {
      if (key === 'configEditor') return { entries: () => rows, async edit () { throw new Error('not used') } }
      return undefined
    }
  }
  registerManageContext(ctx, {
    initialConfig: {},
    getConfig: () => normalizeConfig({}),
    setConfig: () => {},
    reapply: () => {}
  })
  const result = await deletePreset(ctx, 'cordis')
  assert.equal(result.ok, false)
  assert.match(result.error, /базовый/)
  assert.equal(removed.length, 0)
})

await check('deletePreset rejects plain override rows (built-in preset patched via Settings)', async () => {
  const removed = []
  const tree = { create: async options => options.id, remove: async id => { removed.push(id) } }
  const entry = { parent: { tree } }
  // В файле — только plain-строка (override базового пресета), insert-объявления нет.
  writeFileSync(patchFile, '# comment\n- id: preset-ptc\n  name: "@deepseek-ai/dsh-agent-preset"\n  config:\n    description: edited\n', 'utf8')
  const rows = [{ id: 'preset-ptc', options: { id: 'preset-ptc', config: { id: 'ptc', plugins: [] } } }]
  const ctx = {
    fiber: { entry },
    get (key) {
      if (key === 'configEditor') return { entries: () => rows, async edit () { throw new Error('not used') } }
      return undefined
    }
  }
  registerManageContext(ctx, {
    initialConfig: {},
    getConfig: () => normalizeConfig({}),
    setConfig: () => {},
    reapply: () => {}
  })
  const result = await deletePreset(ctx, 'ptc')
  assert.equal(result.ok, false, 'plain override must NOT be deletable')
  assert.match(result.error, /базовый/)
  assert.equal(removed.length, 0)
  assert.ok(readFileSync(patchFile, 'utf8').includes('preset-ptc'), 'override row must survive the refused delete')
})

await check('setLanguage validates and persists the UI language in one write', async () => {
  const edits = []
  const entry = { parent: { tree: {} } }
  const ctx = {
    fiber: { entry },
    get (key) {
      if (key === 'configEditor') return { entries: () => [], async edit (target, change) { edits.push(change({})) } }
      return undefined
    }
  }
  let stored = normalizeConfig({})
  registerManageContext(ctx, {
    initialConfig: {},
    getConfig: () => stored,
    setConfig: next => { stored = normalizeConfig(next) },
    reapply: () => {}
  })
  const ok = await setLanguage(ctx, 'ru')
  assert.equal(ok.ok, true, ok.error)
  assert.equal(ok.config.language, 'ru')
  assert.equal(edits.length, 1)
  const bad = await setLanguage(ctx, 'de')
  assert.equal(bad.ok, false)
  assert.equal(bad.field, 'language')
  assert.equal(edits.length, 1, 'invalid language must not write')
})

rmSync(patchDir, { recursive: true, force: true })
delete process.env.DSH_PROFILE_DIR

console.log(`${passed} manage tests passed`)
