// remote-api.test.mjs — регресс на главный дефект 404: typert.register(remoteContribution)
// обязан вызываться ДАЖЕ когда @deepseek-ai/dsh-typert-protocol не резолвится в профиле.
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const { provideRemoteApi } = await import(pathToFileURL(path.join(HERE, '..', 'plugin.mjs')).href)

const registered = []
const provided = []
const logs = []
const log = (level, text) => logs.push(`[${level}] ${text}`)

const fakeCtx = {
  get: key => (key === 'typert' ? { register: contribution => registered.push(contribution) } : key === 'typertGateway' ? {} : undefined),
  provide: (key, value) => {
    provided.push({ key, service: value })
  },
  inject: (names, callback) => {
    assert.deepEqual(names, ['typert'], 'registration must wait for the typert service')
    return callback(fakeCtx)
  }
}

await provideRemoteApi(fakeCtx, {}, log)

assert.equal(registered.length, 1, 'typert.register must be called exactly once')
const contribution = registered[0]
assert.equal(contribution.package, 'dsh-agent-tool-filter')
assert.equal(contribution.face, 'host')
const ids = contribution.invocations.map(d => d.id)
assert.ok(ids.includes('dsh-agent-tool-filter#agentToolFilter/status'), `status invocation must be registered, got: ${ids.join(', ')}`)
assert.ok(ids.includes('dsh-agent-tool-filter#agentToolFilter/importPack'), 'importPack invocation must be registered')
assert.ok(ids.includes('dsh-agent-tool-filter#agentToolFilter/copyPreset'), 'copyPreset invocation must be registered')
assert.ok(ids.includes('dsh-agent-tool-filter#agentToolFilter/deletePreset'), 'deletePreset invocation must be registered')
assert.equal(contribution.invocations.length, 13, 'all 13 invocations must be registered')

assert.equal(provided.length, 1, 'service must be provided')
assert.equal(provided[0].key, 'agentToolFilter')
const service = provided[0].service
for (const method of ['status', 'setEnabled', 'setDebugLog', 'setLanguage', 'bindPreset', 'unbindPreset', 'setProfile', 'removeToolName', 'deleteProfile', 'importPack', 'copyPreset', 'deletePreset', 'rescan']) {
  assert.equal(typeof service[method], 'function', `service must expose ${method}`)
}
assert.ok(service.typertRemote, 'service must carry the typertRemote binding')
assert.equal(service.typertRemote.serviceKey, 'agentToolFilter')
assert.equal(service.typertRemote.namespace, 'agentToolFilter')
assert.equal(service.typertRemote.service, service, 'binding.service must be the service object itself (readBinding contract)')

console.log('remote-api: PASS')
