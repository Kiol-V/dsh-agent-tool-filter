// client/approval-panel.jsx — клиентская панель «моста апрува» (P3b).
//
// Презентационный компонент в образе штатной approval-панели платформы
// (@deepseek-ai/dsh-client-ui-approval, ApprovalPanel.tsx): жёлтая карточка с
// warning-полосой, кнопки «Отклонить»/«Разрешить (один раз)», Enter — разрешить,
// Esc — отклонить текущий запрос. Штатный компонент не переиспользуется: он
// живёт как слот-плагин (контракт matched/renderSlot/t, примитивы Button/StateDot
// платформы, CSS-модули) и не экспортируется для подстановки в чужой слот.
//
// Props: requests — пакеты ОДНОЙ сессии; очередь сортируется по createdAt,
// показывается текущий запрос, счётчик «k из N» (N > 1) и переключение ‹ ›.
// onAnswer(requestId, decision) — decision 'allow' | 'reject'. От store/remote
// компонент не зависит: только props. t — функция перевода из lib/i18n.mjs
// (передаёт обёртка ApprovalBridgeEntry, как карточке настроек).
import { useEffect, useMemo, useRef, useState } from 'react'

// Стили карточки — в духе ApprovalPanel.module.css штатного пакета: токены
// --dsw-alias-* с тёмными фолбэками (как у index.jsx — standalone и тесты).
const STYLE_ID = 'dsh-agent-tool-filter-approval-styles'
const CSS = `
.atf-ap-root { display: flex; flex-direction: column; align-items: center; padding: 8px 16px 12px; }
.atf-ap-card { overflow: hidden; width: 100%; max-width: var(--dsh-chat-content-width, 760px); box-sizing: border-box; border: 1px solid var(--dsw-alias-state-warn-secondary, rgba(247,173,49,0.45)); border-radius: var(--dsw-radius-xl, 16px); background: var(--dsw-specific-input-major, rgb(30,31,34)); box-shadow: var(--dsw-shadow-lv2, rgba(0,0,0,0.4)); color: var(--dsw-alias-label-primary, rgb(249,250,251)); font: 400 14px/22px var(--dsw-font-family, system-ui, sans-serif); --dsh-scrollbar-thumb: var(--dsw-alias-scrollbar-bg-l2, rgba(255,255,255,0.2)); --dsh-scrollbar-thumb-hover: var(--dsw-alias-scrollbar-hover-l2, rgba(255,255,255,0.35)); }
.atf-ap-strip { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--dsw-alias-state-warn-tertiary, rgba(247,173,49,0.12)); color: var(--dsw-alias-state-warn-primary, rgb(247,173,49)); font-size: 13px; line-height: 18px; }
.atf-ap-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex: none; }
.atf-ap-queue { display: flex; align-items: center; gap: 4px; margin-left: auto; }
.atf-ap-counter { font-size: 11px; line-height: 16px; }
.atf-ap-step { border: none; background: none; color: inherit; cursor: pointer; font-size: 14px; line-height: 1; padding: 2px 6px; border-radius: var(--dsw-radius-xs, 4px); }
.atf-ap-step:hover { background: rgba(255,255,255,0.1); }
.atf-ap-step:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary, rgb(122,170,255)); outline-offset: 2px; }
.atf-ap-body { display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; max-height: var(--dsh-composer-text-max-height, 60vh); overflow-y: auto; padding: 12px 16px 0; }
.atf-ap-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 15px; font-weight: 500; line-height: 24px; }
.atf-ap-chip { font: 400 13px/20px var(--ds-font-family-code, ui-monospace, Consolas, monospace); background: rgba(255,255,255,0.08); border-radius: var(--dsw-radius-xs, 4px); padding: 1px 6px; word-break: break-all; }
.atf-ap-sep { color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-ap-id { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); word-break: break-all; }
.atf-ap-sec { display: flex; flex-direction: column; gap: 4px; }
.atf-ap-sec-title { font-size: 13px; line-height: 20px; font-weight: 600; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-ap-kv { display: flex; align-items: flex-start; gap: 12px; font-size: 13px; line-height: 20px; }
.atf-ap-col { flex-direction: column; gap: 6px; }
.atf-ap-k { flex: none; width: 110px; color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-ap-code { font: 400 13px/20px var(--ds-font-family-code, ui-monospace, Consolas, monospace); word-break: break-all; }
.atf-ap-v { min-width: 0; white-space: pre-wrap; word-break: break-word; unicode-bidi: isolate; direction: ltr; }
.atf-ap-muted { color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); }
.atf-ap-args { max-height: 200px; overflow: auto; padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l2, rgba(255,255,255,0.12)); border-radius: var(--dsw-radius-sm, 8px); background: rgba(255,255,255,0.04); color: var(--dsw-alias-label-tertiary, rgb(173,178,184)); font: 400 13px/20px var(--ds-font-family-code, ui-monospace, Consolas, monospace); white-space: pre-wrap; word-break: break-all; }
.atf-ap-arg-line { unicode-bidi: isolate; direction: ltr; }
.atf-ap-arg-hl { color: var(--dsw-alias-state-business-primary, rgb(122,170,255)); }
.atf-ap-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 16px; }
.atf-ap-reject:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover-danger, rgba(242,90,90,0.12)); color: var(--dsw-alias-state-error-primary, rgb(242,90,90)); border-color: transparent; }
`

function ensureStyles () {
  try {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = CSS
    document.head.appendChild(style)
  } catch { /* без DOM (тесты) стили не нужны */ }
}
ensureStyles()

// Очередь по createdAt (ISO-строка сравнивается лексикографически = хронология);
// пакет без времени уходит в конец очереди.
const byCreatedAt = (a, b) => {
  const at = a?.createdAt
  const bt = b?.createdAt
  if (at === bt) return 0
  if (at === undefined || at === null) return 1
  if (bt === undefined || bt === null) return -1
  return at < bt ? -1 : 1
}

// Целевое действие: JSON с отступами; строки типичных полей
// path/file_path/command/cmd подсвечиваются — по ним видно, что реально исполнит субагент.
const HIGHLIGHT_LINE = /^\s*"(path|file_path|command|cmd)":/

function formatArguments (args) {
  try {
    const pretty = JSON.stringify(args, null, 2)
    if (pretty !== undefined) return pretty.split('\n')
  } catch { /* не-JSON значение — строковый вид ниже */ }
  return [String(args)]
}

// Визуальная изоляция agent-строк: управляющие символы (bidi-override,
// zero-width, невидимые переносы) вычищаются из текстовых полей пакета
// до рендер — подмена направления и невидимые вставки не доходят до DOM.
const CONTROL_RANGES = [[0x200B, 0x200F], [0x202A, 0x202E], [0x2060, 0x206F], [0xFEFF, 0xFEFF]]
const cleanText = text => [...text]
  .filter(ch => !CONTROL_RANGES.some(
    ([from, to]) => ch.codePointAt(0) >= from && ch.codePointAt(0) <= to
  ))
  .join('')

// Кап длины текстовых полей: длинное задание/обоснование и строки аргументов
// обрезаются с многоточием — карточка не раздувается размером вложения.
const capText = (text, limit) => (text.length > limit ? `${text.slice(0, limit)}…` : text)
const FIELD_LIMIT = 4000
const ARG_LINE_LIMIT = 2000

// Очередь запросов одной сессии: карточка жёлтого апрува с раскрытием
// «кто / обоснование / что / задание» (задание — последним блоком: при большом
// задании суть запроса не нужно прокручивать) и ответом через onAnswer
// (как штатный approval).
export function ApprovalBridgePanel ({ requests, onAnswer, t }) {
  const queue = useMemo(
    () => [...(Array.isArray(requests) ? requests : [])].sort(byCreatedAt),
    [requests]
  )
  const [index, setIndex] = useState(0)
  const [answeredId, setAnsweredId] = useState(null)
  const rootRef = useRef(null)
  const position = queue.length === 0 ? 0 : Math.min(index, queue.length - 1)
  const current = queue.length === 0 ? null : queue[position]
  const answered = current !== null && answeredId === current.requestId

  // Двойной ответ исключён: повторный клик/Enter гаснет до смены пакета;
  // исключение onAnswer ИЛИ отклонённый промис возвращают кнопки в строй
  // (ответ не ушёл; направление отказа — fail-closed, зависать не должна).
  const answer = decision => {
    if (current === null || answered) return
    setAnsweredId(current.requestId)
    const failBack = error => {
      setAnsweredId(null)
      console.error('dsh-agent-tool-filter: onAnswer failed:', error)
    }
    try {
      const result = onAnswer(current.requestId, decision)
      if (result !== null && typeof result === 'object' && typeof result.then === 'function') {
        result.then(undefined, failBack)
      }
    } catch (error) {
      failBack(error)
    }
  }

  // Esc (кейсы 03/04 ручного прогона): кнопки работали, а Esc не срабатывал —
  // фокус был вне карточки. Глобальный перехват: document, capture-фаза, пока
  // панель смонтирована и видна; Esc отклоняет текущий (верхний) запрос
  // очереди. Гарды штатного ApprovalPanel: repeat/IME (keyCode 229) не
  // считаем; Esc, попавший в поле ввода с несохранённым текстом, отдаём полю;
  // фокус внутри role=dialog (модалка) не трогаем; невидимая панель (штатный
  // takeover composer прячет fallback с dock-входом) перехват не ставит.
  // Слушатель снимается при unmount.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined
    const onKey = event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (event.repeat || event.nativeEvent?.isComposing === true || event.keyCode === 229) return
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
      if (current === null || answered) return
      if (rootRef.current === null || rootRef.current.getClientRects().length === 0) return
      const active = document.activeElement
      const near = active !== null && typeof active.closest === 'function' ? active : null
      const field = near?.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]') ?? null
      if (field !== null) {
        const draft = 'value' in field ? String(field.value ?? '') : String(field.textContent ?? '')
        if (draft.trim() !== '') return
      }
      if (near !== null && near.closest('[role="dialog"]') !== null) return
      event.preventDefault()
      event.stopPropagation()
      answer('reject')
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [current, answered, onAnswer])

  if (queue.length === 0) return null

  // Семантика шорткатов штатного ApprovalPanel: Enter — разрешить, Esc —
  // отклонить текущий; ввод и кнопки-фокус не перехватываются.
  const keydown = event => {
    const element = event.target
    if (event.defaultPrevented || !event.currentTarget.contains(document.activeElement)
      || element.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]') !== null) return
    if (event.key !== 'Enter' && event.key !== 'Escape') return
    if (event.key === 'Enter' && element.closest('button, a[href], [role="button"]') !== null) return
    if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
    event.preventDefault()
    event.stopPropagation()
    // Enter во время IME-композиции: keyCode 229 покрывает движки без isComposing.
    if (event.repeat || event.nativeEvent?.isComposing === true || event.keyCode === 229) return
    answer(event.key === 'Enter' ? 'allow' : 'reject')
  }

  const step = delta => setIndex(
    previous => (Math.min(previous, queue.length - 1) + delta + queue.length) % queue.length
  )

  const agent = current.agent ?? {}
  const action = current.action ?? {}
  const preset = typeof agent.preset === 'string' && agent.preset !== '' ? agent.preset : '—'
  const shortSessionId = typeof agent.shortSessionId === 'string' && agent.shortSessionId !== '' ? agent.shortSessionId : '—'
  const toolName = typeof action.toolName === 'string' && action.toolName !== '' ? action.toolName : '—'
  const requestIdText = typeof current.requestId === 'string' && current.requestId !== '' ? current.requestId : '—'
  // Задание не выдумывается: found=false или пустой текст — честная заглушка.
  const hasAssignment = agent.assignmentFound !== false
    && typeof agent.assignment === 'string' && agent.assignment.trim() !== ''
  const assignmentText = hasAssignment ? capText(cleanText(agent.assignment), FIELD_LIMIT) : t('approvalAssignmentMissing')
  const hasJustification = typeof current.justification === 'string' && current.justification.trim() !== ''
  const justificationText = hasJustification ? capText(cleanText(current.justification), FIELD_LIMIT) : t('approvalNoJustification')
  const argLines = formatArguments(action.arguments).map(line => capText(cleanText(line), ARG_LINE_LIMIT))

  return (
    <div className="atf-ap-root" ref={rootRef}>
      <div className="atf-ap-card" data-request-id={current.requestId} aria-busy={answered} onKeyDown={keydown}>
        <div className="atf-ap-strip">
          <span className="atf-ap-dot" aria-hidden="true" />
          <span>{t('approvalPending')}</span>
          {queue.length > 1 && (
            <span className="atf-ap-queue">
              <span className="atf-ap-counter">{t('approvalCounter', { k: position + 1, n: queue.length })}</span>
              <button type="button" className="atf-ap-step" aria-label={t('approvalPrevRequest')} onClick={() => step(-1)}>‹</button>
              <button type="button" className="atf-ap-step" aria-label={t('approvalNextRequest')} onClick={() => step(1)}>›</button>
            </span>
          )}
        </div>
        <div className="atf-ap-body" tabIndex={0} role="group" aria-label={t('approvalDetails')} autoFocus>
          <div className="atf-ap-head">
            <code className="atf-ap-chip">{preset}</code>
            <span className="atf-ap-sep">·</span>
            <code className="atf-ap-chip">{shortSessionId}</code>
            <span className="atf-ap-sep">·</span>
            <code className="atf-ap-chip">{toolName}</code>
          </div>
          <div className="atf-ap-id">{t('approvalRequest')} <code>{requestIdText}</code></div>

          <div className="atf-ap-sec">
            <div className="atf-ap-sec-title">{t('approvalWho')}</div>
            <div className="atf-ap-kv"><span className="atf-ap-k">{t('approvalPreset')}</span><code className="atf-ap-code">{preset}</code></div>
            <div className="atf-ap-kv"><span className="atf-ap-k">{t('approvalSession')}</span><code className="atf-ap-code">{shortSessionId}</code></div>
          </div>

          <div className="atf-ap-sec">
            <div className="atf-ap-sec-title">{t('approvalJustification')}</div>
            <div className={`atf-ap-v${hasJustification ? '' : ' atf-ap-muted'}`}>{justificationText}</div>
          </div>

          <div className="atf-ap-sec">
            <div className="atf-ap-sec-title">{t('approvalWhat')}</div>
            <div className="atf-ap-kv"><span className="atf-ap-k">{t('approvalOperation')}</span><code className="atf-ap-code">{toolName}</code></div>
            <div className="atf-ap-kv atf-ap-col">
              <span className="atf-ap-k">{t('approvalTargetAction')}</span>
              <div className="atf-ap-args">
                {argLines.map((line, lineIndex) => (
                  <div
                    key={lineIndex}
                    className={HIGHLIGHT_LINE.test(line) ? 'atf-ap-arg-line atf-ap-arg-hl' : 'atf-ap-arg-line'}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="atf-ap-sec">
            <div className="atf-ap-sec-title">{t('approvalAssignmentTitle')}</div>
            <div className={`atf-ap-v${hasAssignment ? '' : ' atf-ap-muted'}`}>{assignmentText}</div>
          </div>
        </div>
        <div className="atf-ap-actions">
          <button type="button" className="atf-btn atf-outline atf-ap-reject" disabled={answered} onClick={() => answer('reject')}>
            {t('approvalReject')}
          </button>
          <button type="button" className="atf-btn atf-primary" disabled={answered} onClick={() => answer('allow')}>
            {t('approvalAllowOnce')}
          </button>
        </div>
      </div>
    </div>
  )
}
