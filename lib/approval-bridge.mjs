// lib/approval-bridge.mjs — ядро «моста апрува» субагентов (тумблер subagentEscalation).
//
// Политика: при включённом тумблере на session/created детям (header.parentSession
// !== undefined) дописывается approval/policy 'ask' ПОСЛЕ пина делегирования 'never'
// (последнее событие лога выигрывает — fold берёт последнее; политик только две:
// ask/never). Тумблер выключен — никаких append, поведение платформы не меняется.
//
// Мост: waterfall approval/request с { prepend: true }. Запрос НЕ от ребёнка или при
// выключенном тумблере → next() (штатная цепочка). От ребёнка → мост решает сам и
// next НЕ вызывает: аргументы вызова берутся из карты tools/pre-execute (фолбэк —
// скан события tool/call в логе ребёнка, паттерн overrideOf из user-approval),
// пакет (с rootSessionId корня — карточка показывается в его сессии) публикуется
// в панель, холд БЕЗ таймаута ждёт answerApprovalRequest.
// Нет аргументов по callId либо поломка механики → fail-closed 'unavailable' и панель
// НЕ публикуется: без раскрытия целевого действия апрув не выдаётся (требование Kiol).
// Abort (req.signal) снимает pending и карточку; поздний ответ — уже неизвестный
// requestId. Выключение тумблера при висящих запросах (sync) → холды 'unavailable'.
//
// Транспорт host → client: stream-дескриптор watchApprovalRequests (mode: 'stream'):
// кадры {type:'snapshot'|'added'|'removed'}; listApprovalRequests — unary-снимок
// (допустимый фолбэк-поллинг), answerApprovalRequest — ответ панели. Кастомные
// cordis-события через ctx.remote.$on плагинам НЕДОСТУПНЫ: allowlist
// API_REMOTE_FORWARDED_EVENTS зашит в приложение, registerRemoteEvents принимает
// единственный источник (packages/api/remotes + api/gateway).
//
// export default НЕ использовать (Loader.unwrapExports теряет inject): состояние —
// в замыкании createApprovalBridge, листенеры снимаются dispose().

import { errorMessage } from './logger.mjs'

// TTL карты аргументов: запись живёт ~10 минут, чистка — при записи и при чтении.
export const ARGUMENT_TTL_MS = 10 * 60 * 1000

// Предохранитель от петли в цепочке parentSession (защита от цикла в логе).
const MAX_PARENT_HOPS = 64

export function createApprovalBridge ({ ctx, getConfig, log, dlog, now = () => Date.now() }) {
  const enabled = () => {
    try { return getConfig?.()?.subagentEscalation === true } catch { return false }
  }
  const note = (kind, text) => { try { dlog?.(kind, text) } catch { /* диагностика не влияет на поведение */ } }
  const warn = text => { try { log?.('warn', text) } catch { /* логгер не должен ронять мост */ } }

  // callId → { name, arguments, agentSessionId, at }: карта аргументов из pre-execute.
  const argumentByCall = new Map()
  // requestId → { packet, resolve, signal, onAbort }: висящие холды = карточки панели.
  const pending = new Map()
  // Активные stream-подписки панели: { push(frame), close() }.
  const subscribers = new Set()
  const disposers = []

  const publish = frame => {
    for (const entry of [...subscribers]) {
      try { entry.push(frame) } catch { /* подписчик не должен ронять мост */ }
    }
  }

  // Снятие карточки: removed публикуется ТОЛЬКО из settle() — панель всегда видит
  // пару added/removed одного и того же requestId.
  const settle = (requestId, outcome, reason) => {
    const entry = pending.get(requestId)
    if (entry === undefined) return false
    pending.delete(requestId)
    if (entry.signal !== undefined && entry.onAbort !== undefined) {
      try { entry.signal.removeEventListener('abort', entry.onAbort) } catch { /* noop */ }
    }
    publish({ type: 'removed', requestId, reason })
    entry.resolve(outcome)
    note('approval', `холд завершён (${reason}): ${requestId} → ${outcome}`)
    return true
  }

  // --- карта аргументов вызова (tools/pre-execute) ---

  const purgeArguments = () => {
    const stamp = now()
    for (const [callId, entry] of argumentByCall) {
      if (stamp - entry.at >= ARGUMENT_TTL_MS) argumentByCall.delete(callId)
    }
  }

  const recordPreExecute = exec => {
    purgeArguments()
    const callId = exec?.callId
    if (typeof callId !== 'string' || callId === '') return
    argumentByCall.set(callId, {
      name: exec?.name,
      arguments: exec?.arguments,
      agentSessionId: exec?.agent?.id,
      at: now()
    })
    note('approval', `map: ${callId} (${String(exec?.name)}) записан, размер ${argumentByCall.size}`)
  }

  // Фолбэк, когда в карте нет записи: скан лога сессии запроса (req.agent.session —
  // событие tool/call принадлежит именно этой сессии, чужие логи не читаются)
  // назад на tool/call (паттерн overrideOf: session.eventAt от seq-1 до 0).
  const scanLogArguments = (session, callId) => {
    try {
      const seq = session?.seq
      if (typeof seq !== 'number' || typeof session.eventAt !== 'function') return undefined
      for (let index = seq - 1; index >= 0; index -= 1) {
        const event = session.eventAt(index)
        if (event?.type !== 'tool/call' || event.data?.callId !== callId) continue
        const raw = event.data.arguments
        if (typeof raw !== 'string') return undefined
        return JSON.parse(raw)
      }
    } catch (error) {
      warn(`agent-tool-filter: разбор tool/call из лога ребёнка не удался (${errorMessage(error)})`)
    }
    return undefined
  }

  const resolveAction = (req, callId) => {
    if (callId === undefined) {
      throw new Error(`у запроса ${req.toolName} нет callId — аргументы вызова недоступны`)
    }
    purgeArguments()
    // Сверка сессии: запись карты сделана для агента вызова (agentSessionId из
    // pre-execute) — запись чужой сессии с тем же callId считается отсутствующей:
    // фолбэк-скан лога сессии запроса, затем fail-closed 'unavailable'.
    const hit = argumentByCall.get(callId)
    if (hit !== undefined && hit.agentSessionId === req.agent?.id) return hit.arguments
    const scanned = scanLogArguments(req.agent?.session, callId)
    if (scanned !== undefined) return scanned
    throw new Error(`аргументы вызова ${req.toolName} (callId ${callId}) не найдены в карте и логе ребёнка`)
  }

  // --- идентификация: подъём по цепочке parentSession до root ---

  const agentsService = () => {
    try { return ctx?.get?.('agents') ?? ctx?.agents } catch { return ctx?.agents }
  }

  const resolveRootAgent = header => {
    const agents = agentsService()
    if (typeof agents?.get !== 'function') throw new Error('реестр agents недоступен')
    let sessionId = header.parentSession
    for (let hop = 0; sessionId !== undefined; hop += 1) {
      if (hop > MAX_PARENT_HOPS) throw new Error('цепочка parentSession слишком глубокая (возможен цикл)')
      const agent = agents.get(sessionId)
      if (agent === undefined) throw new Error(`агент ${sessionId} не найден в реестре живых агентов`)
      const parent = agent?.session?.header?.parentSession
      if (parent === undefined) return agent
      sessionId = parent
    }
    throw new Error('корень цепочки parentSession не найден')
  }

  // --- задание волка: первый user-message сессии ребёнка (не выдумываем) ---

  const textContent = content => {
    if (typeof content === 'string') return content.trim() === '' ? undefined : content
    if (Array.isArray(content)) {
      const text = content
        .filter(block => block?.type === 'text' && typeof block.text === 'string')
        .map(block => block.text)
        .join('\n')
      return text.trim() === '' ? undefined : text
    }
    return undefined
  }

  const assignmentOf = session => {
    try {
      const messages = typeof session?.deriveMessages === 'function' ? session.deriveMessages() : []
      const first = Array.isArray(messages) ? messages.find(message => message?.role === 'user') : undefined
      const text = textContent(first?.content)
      if (text !== undefined) return { text, found: true }
    } catch (error) {
      note('approval', `deriveMessages ребёнка недоступен: ${errorMessage(error)}`)
    }
    try {
      const seq = session?.seq
      if (typeof seq === 'number' && typeof session.eventAt === 'function') {
        for (let index = 0; index < seq; index += 1) {
          const event = session.eventAt(index)
          if (event?.type !== 'user/message') continue
          const text = textContent(event.data?.content)
          return text !== undefined ? { text, found: true } : { text: null, found: false }
        }
      }
    } catch { /* лог ребёнка недоступен — задание не найдено */ }
    return { text: null, found: false }
  }

  const justificationOf = req => {
    const value = req?.displayReason?.ru ?? req?.displayReason?.en ?? req?.reason
    return typeof value === 'string' ? value : ''
  }

  // --- решение по запросу ребёнка: пакет + холд без таймаута ---

  const decideForChild = async (req, header) => {
    try {
      if (req.signal?.aborted === true) return 'unavailable'
      const callId = typeof req.callId === 'string' && req.callId !== '' ? req.callId : undefined
      const arguments_ = resolveAction(req, callId)
      const rootAgent = resolveRootAgent(header)
      const assignment = assignmentOf(req.agent?.session)
      const shortSessionId = String(header.id).slice(0, 8)
      const requestId = `approval-${shortSessionId}-${callId}`
      if (pending.has(requestId)) settle(requestId, 'unavailable', 'superseded')

      const packet = {
        requestId,
        rootSessionId: rootAgent.id,
        agent: {
          preset: header.agentPreset ?? null,
          shortSessionId,
          assignment: assignment.text,
          assignmentFound: assignment.found
        },
        action: { toolName: req.toolName, arguments: arguments_ },
        justification: justificationOf(req),
        createdAt: new Date(now()).toISOString()
      }
      const entry = { packet, resolve: undefined, signal: req.signal, onAbort: undefined }
      const hold = new Promise(resolve => { entry.resolve = resolve })
      pending.set(requestId, entry)
      if (req.signal !== undefined) {
        entry.onAbort = () => settle(requestId, 'unavailable', 'cancelled')
        req.signal.addEventListener('abort', entry.onAbort, { once: true })
      }
      publish({ type: 'added', request: packet })
      note('approval', `пакет опубликован: ${requestId} (tool=${req.toolName}; корень ${rootAgent.id})`)
      return await hold
    } catch (error) {
      warn(`agent-tool-filter: апрув fail-closed 'unavailable': ${errorMessage(error)}`)
      return 'unavailable'
    }
  }

  // --- листенеры ---

  const offPolicy = ctx.on('session/created', session => {
    if (!enabled()) return
    const header = session?.header
    if (header?.parentSession === undefined) return
    try {
      session.append('approval/policy', { policy: 'ask' })
      note('approval', `политика ask → ребёнок ${header.id} (пресет ${header.agentPreset ?? '-'})`)
    } catch (error) {
      warn(`agent-tool-filter: approval/policy не дописан (${errorMessage(error)})`)
    }
  })
  if (typeof offPolicy === 'function') disposers.push(offPolicy)

  const offPreExecute = ctx.on('tools/pre-execute', (exec, next) => {
    try {
      if (enabled() && exec?.agent?.session?.header?.parentSession !== undefined) recordPreExecute(exec)
    } catch (error) {
      warn(`agent-tool-filter: карта аргументов не пополнена (${errorMessage(error)})`)
    }
    return next()
  })
  if (typeof offPreExecute === 'function') disposers.push(offPreExecute)

  const offApproval = ctx.on('approval/request', async (req, next) => {
    const header = req?.agent?.session?.header
    if (header?.parentSession === undefined) return await next()
    if (!enabled()) return await next()
    return await decideForChild(req, header)
  }, { prepend: true })
  if (typeof offApproval === 'function') disposers.push(offApproval)

  // --- host API (Typert Remote: unary + stream) ---

  const listApprovalRequests = () => [...pending.values()].map(entry => entry.packet)

  const answerApprovalRequest = async (requestId, decision) => {
    if (decision !== 'allow' && decision !== 'reject') {
      throw new Error(`decision должен быть "allow" или "reject", получено "${String(decision)}"`)
    }
    if (typeof requestId !== 'string' || requestId === '' || !pending.has(requestId)) {
      throw new Error(`запрос апрува "${String(requestId)}" не найден (уже отвечен или отменён)`)
    }
    const outcome = decision === 'allow' ? 'allowed-once' : 'rejected'
    settle(requestId, outcome, 'answered')
    return outcome
  }

  // Stream событий панели: первый кадр — snapshot, далее added/removed.
  // Сигнал пробуждает очередь при abort — генератор закрывается, листенер abort
  // снимается в finally (иначе iterator.return() завис бы на вечном await).
  async function * watchApprovalRequests (signal) {
    const queue = []
    let wake
    let closed = signal?.aborted === true
    const pump = () => {
      const resolve = wake
      wake = undefined
      resolve?.()
    }
    const entry = {
      push: frame => { queue.push(frame); pump() },
      close: () => { closed = true; pump() }
    }
    const onAbort = () => entry.close()
    subscribers.add(entry)
    if (signal !== undefined && !closed) signal.addEventListener('abort', onAbort, { once: true })
    try {
      entry.push({ type: 'snapshot', requests: listApprovalRequests() })
      while (!closed) {
        if (queue.length === 0) {
          await new Promise(resolve => { wake = resolve })
          continue
        }
        yield queue.shift()
      }
    } finally {
      subscribers.delete(entry)
      if (signal !== undefined) {
        try { signal.removeEventListener('abort', onAbort) } catch { /* noop */ }
      }
      wake = undefined
    }
  }

  // --- синхронизация с тумблером и выгрузка ---

  const sync = () => {
    if (enabled()) return 0
    let count = 0
    for (const requestId of [...pending.keys()]) {
      if (settle(requestId, 'unavailable', 'disabled')) count += 1
    }
    return count
  }

  const dispose = () => {
    for (const off of disposers.splice(0)) {
      try { off() } catch { /* подписка уже снята контекстом */ }
    }
    for (const requestId of [...pending.keys()]) settle(requestId, 'unavailable', 'disposed')
    for (const entry of [...subscribers]) {
      try { entry.close() } catch { /* подписка уже закрыта */ }
    }
    subscribers.clear()
  }

  return { sync, dispose, listApprovalRequests, answerApprovalRequest, watchApprovalRequests }
}
