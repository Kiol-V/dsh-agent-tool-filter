import assert from 'node:assert/strict'
import { clientDescriptors, remoteDescriptors, statusDescriptor } from '../lib/remote-descriptors.mjs'
import { apply } from '../plugin.mjs'

const expected = ['setEnabled', 'setLanguage', 'bindPreset', 'unbindPreset', 'setProfile', 'deleteProfile', 'importPack', 'copyPreset', 'deletePreset', 'rescan']
assert.deepEqual(remoteDescriptors.map(item => item.method), expected)
assert.equal(remoteDescriptors.length, 10)
assert.equal(statusDescriptor.method, 'status')
assert.equal(clientDescriptors.length, 11)
assert.equal(new Set(clientDescriptors.map(item => `${item.namespace}/${item.method}`)).size, 11)

const strictInputs = {
  status: [],
  setEnabled: [['enabled', true, 'true']],
  setLanguage: [['language', 'ru', 1]],
  bindPreset: [['presetId', 'cordis', 1], ['profileName', 'standard-trim', null]],
  unbindPreset: [['presetId', 'cordis', 1]],
  setProfile: [
    ['name', 'custom', 1],
    ['profile', { mode: 'deny', tools: ['read'] }, { mode: 'hide', tools: [] }]
  ],
  deleteProfile: [['name', 'custom', 1]],
  importPack: [['packId', 'gradient', 1]],
  copyPreset: [['presetId', 'cordis', 1], ['newName', 'cordis-copy', null], ['display', { name: 'X', description: 'Y' }, 42]],
  deletePreset: [['presetId', 'cordis', 1]],
  rescan: []
}

for (const item of clientDescriptors) {
  assert.equal(item.service, 'agentToolFilter')
  assert.equal(item.namespace, 'agentToolFilter')
  assert.deepEqual(item.invocation, { kind: 'direct' })
  assert.deepEqual(item.result, { mode: 'src-json' })
  assert.deepEqual(item.parameters.map(input => input.name), strictInputs[item.method].map(([name]) => name))
  for (const input of item.parameters) {
    assert.equal(input.source, 'json')
  }
  for (const [index, [name, accepted, rejected]] of strictInputs[item.method].entries()) {
    const codec = item.parameters[index].codec
    assert.equal(codec.mode, 'strict')
    assert.ok(codec.typeSymbol.startsWith('dsh-agent-tool-filter#'))
    const schema = codec.create()
    assert.equal(typeof schema.parse, 'function')
    assert.equal(schema.parse(accepted), accepted)
    assert.throws(() => schema.parse(rejected), TypeError, `${item.method}.${name} must reject wrong input types`)
  }
}

const profileCodec = remoteDescriptors.find(item => item.method === 'setProfile')
  .parameters.find(item => item.name === 'profile').codec.create()
assert.throws(() => profileCodec.parse({ mode: 'deny', tools: 'read' }), TypeError)

// display — опциональный параметр (acceptsUndefined): отсутствие допустимо,
// codec возвращает undefined (семантика gateway decode).
const displayParam = remoteDescriptors.find(item => item.method === 'copyPreset').parameters[2]
assert.equal(displayParam.acceptsUndefined, true, 'copyPreset.display must declare acceptsUndefined')
assert.equal(displayParam.codec.create().parse(undefined), undefined)
assert.equal(displayParam.codec.create().parse(null), undefined)

const warnings = []
const providers = new Map()
const ctx = {
  get (key) {
    if (key === 'agents') return { roots: () => [] }
    return undefined
  },
  on () {},
  provide (name, value) { providers.set(name, value) },
  logger: {
    info () {},
    warn (message) { warnings.push(String(message)) },
    error () {}
  }
}

await apply(ctx, {})
assert.equal(typeof providers.get('agentToolFilter'), 'object')
assert.ok(warnings.some(message => message.includes('typert отсутствует')))
assert.ok(warnings.some(message => message.includes('typertGateway отсутствует')))
// typertRemote binding есть всегда: локальная форма freeze({service, serviceKey, namespace}),
// даже когда @deepseek-ai/dsh-typert-protocol не резолвится (регресс 404 на agentToolFilter/*).
const binding = providers.get('agentToolFilter').typertRemote
assert.equal(binding.serviceKey, 'agentToolFilter')
assert.equal(binding.namespace, 'agentToolFilter')

console.log('7 Remote descriptor checks and headless registration passed')
