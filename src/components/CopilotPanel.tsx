import {
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Clipboard,
  Command,
  CornerDownLeft,
  FileText,
  Globe2,
  Loader2,
  Mic,
  Pencil,
  Pill,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChatHistoryPanel, InternalNotesPanel } from './ConsultContextPanels'
import { RxCommandDrawer } from './ChartWorkspace'
import type { AgentActionCard, AgentActionStatus, AgentActionType, Consult, CopilotTab } from '../types'
import type { RxDrawerMode } from '../types'

const API_BASE_URL = import.meta.env.VITE_BLOOM_API_BASE_URL ?? 'http://127.0.0.1:8787'

type PhotonMcpOAuthStatus = {
  enabled: boolean
  authenticated: boolean
  authorizationSource: string | null
  mcpUrl: string
  issuer: string
  redirectUri: string
  scopes: string
  oauthReady: boolean
  oauthIssue: string | null
  tokenExpiresAt: string | null
  authenticatedAt: string | null
  connectUrl: string
}

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean
  readonly 0: { readonly transcript: string }
}

type SpeechRecognitionEventLike = Event & {
  readonly resultIndex: number
  readonly results: {
    readonly length: number
    readonly [index: number]: SpeechRecognitionResultLike
  }
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

interface CopilotPanelProps {
  consult: Consult
  activeTab: CopilotTab
  isOrderSigned: boolean
  agentRun: AgentActionType | null
  agentError: string | null
  isRxDrawerOpen: boolean
  rxDrawerMode: RxDrawerMode
  variant?: 'v1' | 'v2'
  onTabChange: (tab: CopilotTab) => void
  onCancelDraft: () => void
  onRequestAction: (actionType: AgentActionType, prompt?: string) => void
  onActionStatusChange: (cardId: string, status: AgentActionStatus) => void
  onOpenPrescribe: () => void
  onRxDrawerModeChange: (mode: RxDrawerMode) => void
  onInsertChatExcerpt: (excerpt: string) => void
  onInsertPrescriptionSummary: (summary: string) => void
  onTogglePanel: () => void
}

const v1CopilotTabs: CopilotTab[] = ['Copilot', 'Follow-ups', 'Internal Notes']
const v2CopilotTabs: CopilotTab[] = ['Copilot', 'Chat History', 'Prescription Console']

export function CopilotPanel({
  consult,
  activeTab,
  isOrderSigned,
  agentRun,
  agentError,
  isRxDrawerOpen,
  variant = 'v1',
  onTabChange,
  onCancelDraft,
  onRequestAction,
  onActionStatusChange,
  onOpenPrescribe,
  onRxDrawerModeChange,
  onInsertChatExcerpt,
  onInsertPrescriptionSummary,
}: CopilotPanelProps) {
  const copilotTabs = variant === 'v2' ? v2CopilotTabs : v1CopilotTabs
  const isV2PrescriptionConsole = variant === 'v2' && activeTab === 'Prescription Console'

  return (
    <aside className={`copilot-panel ${variant === 'v2' ? 'v2-copilot-panel' : ''}`} aria-label="Bloom agent panel">
      <header className="copilot-topbar">
        <nav className="copilot-tabs" aria-label="Agent sections">
          {copilotTabs.map((tab) => (
            <button
              className={activeTab === tab ? 'selected' : ''}
              key={tab}
              onClick={() => onTabChange(tab)}
              type="button"
            >
              {tab === 'Copilot' ? <span className="online-dot" /> : null}
              {tab}
            </button>
          ))}
        </nav>
      </header>

      {activeTab === 'Copilot' ? (
        <CopilotActivity
          consult={consult}
          isOrderSigned={isOrderSigned}
          agentRun={agentRun}
          agentError={agentError}
          isRxDrawerOpen={isRxDrawerOpen}
          variant={variant}
          onCancelDraft={onCancelDraft}
          onActionStatusChange={onActionStatusChange}
          onOpenPrescribe={onOpenPrescribe}
        />
      ) : null}
      {variant === 'v1' && activeTab === 'Follow-ups' ? <FollowUps consult={consult} /> : null}
      {variant === 'v1' && activeTab === 'Internal Notes' ? <InternalNotesPanel consult={consult} /> : null}
      {variant === 'v2' && activeTab === 'Chat History' ? (
        <ChatHistoryPanel consult={consult} onInsertExcerpt={onInsertChatExcerpt} />
      ) : null}
      {variant === 'v2' && activeTab === 'Prescription Console' ? (
        <div className="copilot-rx-console">
          <RxCommandDrawer
            key={consult.id}
            consult={consult}
            mode="full"
            onModeChange={onRxDrawerModeChange}
            onInsertSummary={onInsertPrescriptionSummary}
            isConsole
          />
        </div>
      ) : null}

      {!isV2PrescriptionConsole ? (
        <>
          <PhotonMcpAuthStatus />
          <PromptComposer
            agentRun={agentRun}
            variant={variant}
            onRequestAction={onRequestAction}
          />
        </>
      ) : null}
    </aside>
  )
}

function CopilotActivity({
  consult,
  isOrderSigned,
  agentRun,
  agentError,
  isRxDrawerOpen,
  variant,
  onCancelDraft,
  onActionStatusChange,
  onOpenPrescribe,
}: {
  consult: Consult
  isOrderSigned: boolean
  agentRun: AgentActionType | null
  agentError: string | null
  isRxDrawerOpen: boolean
  variant: 'v1' | 'v2'
  onCancelDraft: () => void
  onActionStatusChange: (cardId: string, status: AgentActionStatus) => void
  onOpenPrescribe: () => void
}) {
  const showActivityEvents = variant !== 'v2'
  const showFeedback =
    showActivityEvents || consult.actionCards.length > 0 || Boolean(agentRun) || Boolean(agentError)

  return (
    <div className="copilot-scroll">
      {showActivityEvents
        ? consult.agentEvents.map((event, index) => (
            <article className="agent-event" key={event.id}>
              <div className="agent-event-heading">
                <strong>{event.label}</strong>
                {index > 0 ? <ChevronUp size={14} /> : null}
              </div>
              {event.body.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {event.kind === 'draft' ? (
                <DraftOrderCard
                  consult={consult}
                  isOrderSigned={isOrderSigned}
                  isRxDrawerOpen={isRxDrawerOpen}
                  onCancelDraft={onCancelDraft}
                  onOpenPrescribe={onOpenPrescribe}
                />
              ) : null}
            </article>
          ))
        : null}

      {consult.actionCards.map((card) => (
        <GeneratedActionCard
          key={card.id}
          card={card}
          onOpenPrescribe={onOpenPrescribe}
          onActionStatusChange={onActionStatusChange}
        />
      ))}

      {agentRun ? (
        <article className="agent-event running-event">
          <div className="agent-event-heading">
            <strong>
              {agentRun === 'draft_prescription'
                ? 'Generating prescription card'
                : 'Generating plan card'}
            </strong>
            <Loader2 className="spin" size={14} />
          </div>
          <p>Preparing structured JSON for clinician review from the visible chart context.</p>
        </article>
      ) : null}

      {agentError ? (
        <article className="agent-event error-event">
          <div className="agent-event-heading">
            <strong>Agent request failed</strong>
            <X size={14} />
          </div>
          <p>{agentError}</p>
        </article>
      ) : null}

      {showActivityEvents && isOrderSigned ? (
        <article className="agent-event signed-event">
          <div className="agent-event-heading">
            <strong>Draft order approved.</strong>
            <Check size={14} />
          </div>
          <p>Prescription and patient follow-up are marked signed in this seeded chart state.</p>
        </article>
      ) : null}

      {showFeedback ? (
        <div className="feedback-row" aria-label="Agent feedback">
          <button type="button" aria-label="Copy agent output">
            <Clipboard size={15} />
          </button>
          <button type="button" aria-label="Helpful">
            <ThumbsUp size={15} />
          </button>
          <button type="button" aria-label="Not helpful">
            <ThumbsDown size={15} />
          </button>
        </div>
      ) : null}
    </div>
  )
}

function GeneratedActionCard({
  card,
  onOpenPrescribe,
  onActionStatusChange,
}: {
  card: AgentActionCard
  onOpenPrescribe: () => void
  onActionStatusChange: (cardId: string, status: AgentActionStatus) => void
}) {
  const isAccepted = card.status === 'accepted'
  const isRejected = card.status === 'rejected'

  return (
    <article className={`generated-card ${card.status}`}>
      <div className="generated-card-top">
        <div>
          <span className="generated-kicker">
            {card.type === 'draft_plan' ? <FileText size={14} /> : <Pill size={14} />}
            {card.type === 'draft_plan' ? 'Plan draft' : 'Prescription draft'}
          </span>
          <h2>{card.title}</h2>
        </div>
        <span className="generated-status">{card.status}</span>
      </div>

      <p className="generated-rationale">{card.rationale}</p>

      {card.type === 'draft_plan' ? (
        <div className="plan-sections">
          {card.sections.map((section) => (
            <section key={section.heading}>
              <h3>{section.heading}</h3>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <dl className="order-fields generated-order-fields">
          <div>
            <dt>Medication</dt>
            <dd>{card.order.medication}</dd>
          </div>
          <div>
            <dt>Sig</dt>
            <dd>{card.order.sig}</dd>
          </div>
          <div>
            <dt>Quantity</dt>
            <dd>{card.order.quantity}</dd>
          </div>
          <div>
            <dt>Refills</dt>
            <dd>{card.order.refills}</dd>
          </div>
          <div>
            <dt>Pharmacy</dt>
            <dd>{card.order.pharmacy}</dd>
          </div>
        </dl>
      )}

      <div className="safety-checks">
        <strong>Checks</strong>
        {card.safetyChecks.map((check) => (
          <span key={check}>{check}</span>
        ))}
      </div>

      <div className="generated-actions">
        {card.type === 'draft_plan' ? (
          <button
            className="primary-button compact"
            disabled={isAccepted || isRejected}
            onClick={() => onActionStatusChange(card.id, 'accepted')}
            type="button"
          >
            {isAccepted ? 'Applied' : 'Apply to note'}
            <Check size={13} />
          </button>
        ) : (
          <button
            className="primary-button compact"
            disabled={
              isAccepted ||
              isRejected ||
              card.order.medication === 'No prescription drafted' ||
              card.order.medication === 'No medication drafted'
            }
            onClick={() => {
              onOpenPrescribe()
              onActionStatusChange(card.id, 'accepted')
            }}
            type="button"
          >
            {isAccepted ? 'Loaded' : 'Load in prescribe'}
            <Command size={13} />
            <CornerDownLeft size={13} />
          </button>
        )}
        <button
          className="secondary-button"
          disabled={isAccepted || isRejected}
          onClick={() => onActionStatusChange(card.id, 'rejected')}
          type="button"
        >
          Reject
        </button>
      </div>
    </article>
  )
}

function DraftOrderCard({
  consult,
  isOrderSigned,
  isRxDrawerOpen,
  onCancelDraft,
  onOpenPrescribe,
}: {
  consult: Consult
  isOrderSigned: boolean
  isRxDrawerOpen: boolean
  onCancelDraft: () => void
  onOpenPrescribe: () => void
}) {
  const order = consult.draftOrder

  if (isRxDrawerOpen) {
    return (
      <section className="draft-order loaded-in-rx" aria-label="Draft order loaded in prescribing drawer">
        <div>
          <Pill size={15} />
          <strong>Prescription candidate loaded in Rx drawer</strong>
        </div>
        <p>{order.medication}</p>
        <button className="secondary-button" onClick={onOpenPrescribe} type="button">
          View Rx drawer
        </button>
      </section>
    )
  }

  return (
    <section className="draft-order" aria-label="Draft order">
      <div className="draft-order-header">
        <h2>{order.medication}</h2>
        <button className="outline-button" type="button">
          <Pencil size={16} />
          Edit
        </button>
      </div>
      <dl className="order-fields">
        <div>
          <dt>Sig</dt>
          <dd>{order.sig}</dd>
        </div>
        <div>
          <dt>Allergies</dt>
          <dd>{order.allergies}</dd>
        </div>
        <div>
          <dt>Quantity</dt>
          <dd>{order.quantity}</dd>
        </div>
        <div>
          <dt>Refills</dt>
          <dd>{order.refills}</dd>
        </div>
        <div>
          <dt>Days supply</dt>
          <dd>{order.daysSupply}</dd>
        </div>
        <div>
          <dt>Pharmacy</dt>
          <dd>{order.pharmacy}</dd>
        </div>
        <div>
          <dt>Notes</dt>
          <dd>{order.notes}</dd>
        </div>
        <div>
          <dt>Substitutions</dt>
          <dd>
            <span className="substitution-pill">{order.substitutions}</span>
          </dd>
        </div>
      </dl>
      <div className="order-actions">
        <button
          className="primary-button"
          disabled={isOrderSigned || order.medication === 'No prescription drafted'}
          onClick={onOpenPrescribe}
          type="button"
        >
          {isOrderSigned ? 'Loaded' : 'Open prescribe'}
          <Command size={13} />
          <CornerDownLeft size={13} />
        </button>
        <button className="secondary-button" onClick={onCancelDraft} type="button">
          Cancel
          <Command size={13} />
          <span>.</span>
        </button>
      </div>
    </section>
  )
}

function FollowUps({ consult }: { consult: Consult }) {
  return (
    <div className="copilot-scroll">
      <section className="followup-list">
        <h2>Follow-ups</h2>
        {consult.followUps.map((followUp) => (
          <label className="followup-row" key={followUp}>
            <input type="checkbox" />
            <span>{followUp}</span>
          </label>
        ))}
        <button className="outline-button" type="button">
          <Send size={15} />
          Draft patient message
        </button>
      </section>
    </div>
  )
}

function PhotonMcpAuthStatus() {
  const [status, setStatus] = useState<PhotonMcpOAuthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/photon/mcp/oauth/status`)
      const payload = (await response.json()) as PhotonMcpOAuthStatus
      setStatus(payload)
      if (payload.authenticated) setIsLoading(false)
      setError(null)
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to read Photon MCP status')
    }
  }, [])

  useEffect(() => {
    const initialStatusTimer = window.setTimeout(() => {
      void loadStatus()
    }, 0)

    function handleMessage(event: MessageEvent) {
      if (event.data?.type !== 'bloom-photon-mcp-auth') return
      void loadStatus()
    }

    function handleFocus() {
      void loadStatus()
    }

    window.addEventListener('message', handleMessage)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.clearTimeout(initialStatusTimer)
      window.removeEventListener('message', handleMessage)
      window.removeEventListener('focus', handleFocus)
    }
  }, [loadStatus])

  async function connectPhotonMcp() {
    setIsLoading(true)
    setError(null)
    const connectUrl = `${API_BASE_URL}${status?.connectUrl ?? '/api/photon/mcp/oauth/start'}`
    window.open(connectUrl, 'bloom-photon-mcp-oauth', 'popup,width=560,height=760')

    let attempts = 0
    const interval = window.setInterval(() => {
      attempts += 1
      void loadStatus()
      if (attempts >= 30) {
        window.clearInterval(interval)
        setIsLoading(false)
      }
    }, 2000)
  }

  async function disconnectPhotonMcp() {
    setIsLoading(true)
    try {
      await fetch(`${API_BASE_URL}/api/photon/mcp/oauth/logout`, { method: 'POST' })
      await loadStatus()
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Unable to disconnect Photon MCP')
    } finally {
      setIsLoading(false)
    }
  }

  const isAuthenticated = Boolean(status?.authenticated)
  const isOAuthReady = status?.oauthReady !== false
  const statusLabel = isAuthenticated
    ? 'Neutron connected'
    : status?.enabled === false
      ? 'MCP disabled'
      : !isOAuthReady
        ? 'Callback setup required'
      : 'Neutron login required'

  return (
    <section
      className={`agent-context photon-mcp-auth ${isExpanded ? 'expanded' : 'collapsed'}`}
      aria-label="Photon MCP authentication"
    >
      <div className="context-status-tabs">
        <span className={isAuthenticated ? 'selected' : ''}>
          <span className="online-dot" />
          {statusLabel}
        </span>
        <strong>Photon MCP</strong>
        <button onClick={loadStatus} type="button">
          Refresh
        </button>
        <button
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
          aria-expanded={isExpanded}
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {isExpanded ? 'Hide' : 'Details'}
        </button>
      </div>
      {isExpanded ? (
        <>
          <div className="context-tree">
        <div>
          <Globe2 size={15} />
          <strong>Photon MCP</strong>
        </div>
        <div className="context-request">
          <span className={`priority-dot ${isAuthenticated ? 'routine' : 'watch'}`} />
          <Circle size={15} />
          <span>{status?.mcpUrl ?? 'https://ai.photon.health/mcp'}</span>
        </div>
        {status?.authenticatedAt ? (
          <div className="context-expanded">
            <span>Authorized {new Date(status.authenticatedAt).toLocaleTimeString()}</span>
            <span>{status.authorizationSource ?? 'runtime oauth'}</span>
          </div>
        ) : null}
        {!isAuthenticated && status?.oauthIssue ? (
          <div className="context-expanded context-warning">
            <span>{status.oauthIssue}</span>
          </div>
        ) : null}
        {error ? (
          <div className="context-expanded">
            <span>{error}</span>
          </div>
        ) : null}
          </div>
          <div className="generated-actions">
        {isAuthenticated ? (
          <button className="secondary-button" disabled={isLoading} onClick={disconnectPhotonMcp} type="button">
            Disconnect
          </button>
        ) : (
          <button className="primary-button compact" disabled={isLoading || status?.enabled === false || !isOAuthReady} onClick={connectPhotonMcp} type="button">
            {isLoading ? 'Waiting' : 'Connect Neutron'}
            {isLoading ? <Loader2 className="spin" size={13} /> : <Globe2 size={13} />}
          </button>
        )}
          </div>
        </>
      ) : null}
    </section>
  )
}

function PromptComposer({
  agentRun,
  variant,
  onRequestAction,
}: {
  agentRun: AgentActionType | null
  variant: 'v1' | 'v2'
  onRequestAction: (actionType: AgentActionType, prompt?: string) => void
}) {
  const isRunning = Boolean(agentRun)
  const [prompt, setPrompt] = useState('')
  const [isDictating, setIsDictating] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const SpeechRecognition =
    typeof window === 'undefined'
      ? undefined
      : (window as SpeechRecognitionWindow).SpeechRecognition ??
        (window as SpeechRecognitionWindow).webkitSpeechRecognition
  const canDictate = Boolean(SpeechRecognition)

  function stopDictation() {
    recognitionRef.current?.stop()
    setIsDictating(false)
  }

  function requestAction(actionType: AgentActionType) {
    onRequestAction(actionType, prompt.trim() || undefined)
  }

  function actionTypeForPrompt() {
    return /\b(rx|prescri|medication|estradiol|progesterone|patch|cream|refill|dose)\b/i.test(prompt)
      ? 'draft_prescription'
      : 'draft_plan'
  }

  function toggleDictation() {
    if (!SpeechRecognition) return

    if (isDictating) {
      stopDictation()
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      let transcript = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) transcript += result[0].transcript
      }

      if (!transcript.trim()) return
      setPrompt((current) => `${current}${current.trim() ? ' ' : ''}${transcript.trim()}`)
    }
    recognition.onend = () => setIsDictating(false)
    recognition.onerror = () => setIsDictating(false)
    recognitionRef.current = recognition
    setIsDictating(true)
    recognition.start()
  }

  return (
    <form
      className="prompt-composer expanded"
      onSubmit={(event) => {
        event.preventDefault()
        if (isDictating) stopDictation()
        requestAction(actionTypeForPrompt())
      }}
    >
      <label htmlFor="agent-prompt">Ask Bloom</label>
      <textarea
        id="agent-prompt"
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Ask Bloom"
        rows={2}
        value={prompt}
      />
      <div className="prompt-actions">
        {variant === 'v1' ? (
          <button type="button">
            <Pencil size={15} />
            Internal Notes
          </button>
        ) : null}
        <button
          className={isDictating ? 'dictation-button active' : 'dictation-button'}
          disabled={!canDictate}
          onClick={toggleDictation}
          type="button"
          aria-pressed={isDictating}
          aria-label={isDictating ? 'Stop dictation' : 'Start dictation'}
          title={
            canDictate
              ? isDictating
                ? 'Stop dictation and edit before sending'
                : 'Dictate voice command'
              : 'Voice dictation is not supported in this browser'
          }
        >
          {isDictating ? (
            <span className="dictation-waveform" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          ) : (
            <Mic size={15} />
          )}
        </button>
        <button className="send-button" disabled={isRunning} type="submit" aria-label="Send prompt">
          <ArrowUp size={15} />
        </button>
      </div>
    </form>
  )
}
