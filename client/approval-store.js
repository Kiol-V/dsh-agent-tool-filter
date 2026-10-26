// client/approval-store.js — клиентский store висящих пакетов «моста апрува».
// Состояние — все карточки панели, сгруппированные по rootSessionId (пакет
// показывается в сессии root-агента родителя). Источник кадров — stream-метод
// watchApprovalRequests remote-сервиса agentToolFilter: snapshot заменяет всё
// состояние, added/removed инкрементальны. Обрыв генератора (error или конец
// потока) переподписывает store с паузой RECONNECT_DELAY_MS; stop() гасит
// переподписку и снимает подписчиков.

const RECONNECT_DELAY_MS = 3000

export function createApprovalStore ({ reconnectDelayMs = RECONNECT_DELAY_MS } = {}) {
  // requestId → пакет: висящие карточки панели.
  const packets = new Map()
  const listeners = new Set()
  let running = false
  let getService
  let controller
  let wakeDelay

  const notify = () => {
    for (const listener of [...listeners]) {
      try { listener() } catch { /* подписчик не должен ронять store */ }
    }
  }

  const applyFrame = frame => {
    if (frame?.type === 'snapshot') {
      packets.clear()
      for (const request of frame.requests ?? []) {
        if (typeof request?.requestId === 'string') packets.set(request.requestId, request)
      }
    } else if (frame?.type === 'added' && typeof frame.request?.requestId === 'string') {
      packets.set(frame.request.requestId, frame.request)
    } else if (frame?.type === 'removed' && typeof frame.requestId === 'string') {
      packets.delete(frame.requestId)
    } else {
      return
    }
    notify()
  }

  // Пауза перед переподпиской; stop() прерывает ожидание мгновенно.
  const pause = ms => new Promise(resolve => {
    const timer = setTimeout(() => { wakeDelay = undefined; resolve() }, ms)
    wakeDelay = () => { clearTimeout(timer); wakeDelay = undefined; resolve() }
  })

  async function pump () {
    while (running) {
      controller = new AbortController()
      try {
        const service = getService()
        if (typeof service?.watchApprovalRequests !== 'function') {
          throw new Error('remote-сервис agentToolFilter недоступен (watchApprovalRequests)')
        }
        for await (const frame of service.watchApprovalRequests(controller.signal)) {
          if (!running) break
          applyFrame(frame)
        }
      } catch { /* обрыв потока или сервис недоступен — переподписка ниже */ }
      controller = undefined
      if (!running) return
      await pause(reconnectDelayMs)
    }
  }

  const start = resolveService => {
    if (running) return
    getService = resolveService
    running = true
    void pump()
  }

  const stop = () => {
    running = false
    wakeDelay?.()
    try { controller?.abort() } catch { /* сигнал необязателен */ }
    listeners.clear()
  }

  // Подписка на изменения состояния; возвращает функцию отписки.
  const subscribe = listener => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  // Карточки сессии root-агента: пакеты с его rootSessionId, в порядке появления.
  const getForSession = sessionId =>
    [...packets.values()].filter(packet => packet.rootSessionId === sessionId)

  const count = () => packets.size

  return { start, stop, subscribe, getForSession, count }
}
