import {
  GripVertical,
  Moon,
  PanelBottomClose,
  PanelBottomOpen,
  PanelRightClose,
  PanelRightOpen,
  Sun,
} from 'lucide-react'
import {
  useMemo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import './App.css'
import { ChartWorkspace } from './components/ChartWorkspace'
import { ConsultQueue } from './components/ConsultQueue'
import { CopilotPanel } from './components/CopilotPanel'
import { agentClient } from './agent/client'
import { consultsSeed } from './data/seed'
import type {
  AgentActionStatus,
  AgentActionType,
  AppearanceContrast,
  ChartTab,
  Consult,
  CopilotTab,
  DraftPlanAction,
  DraftPrescriptionAction,
  Medication,
  RxDrawerMode,
  ThemeMode,
  ThemePreference,
} from './types'

function getStoredPreference<T extends string>(key: string, fallback: T, allowed: readonly T[]) {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(key)
  return allowed.includes(value as T) ? (value as T) : fallback
}

function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function App() {
  const [consults, setConsults] = useState<Consult[]>(consultsSeed)
  const [selectedConsultId, setSelectedConsultId] = useState(consultsSeed[0].id)
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>('Request')
  const [activeCopilotTab, setActiveCopilotTab] = useState<CopilotTab>('Copilot')
  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    getStoredPreference('bloom-theme-preference', 'dark', ['system', 'dark', 'light']),
  )
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(getSystemTheme)
  const [appearanceContrast, setAppearanceContrast] = useState<AppearanceContrast>(() =>
    getStoredPreference('bloom-appearance-contrast', 'high', [
      'high',
      'system-medium',
      'soft-clinical',
    ]),
  )
  const [isQueueOpen, setIsQueueOpen] = useState(true)
  const [isCopilotOpen, setIsCopilotOpen] = useState(true)
  const [queueWidth, setQueueWidth] = useState(300)
  const [copilotWidth, setCopilotWidth] = useState(520)
  const [contextHeight, setContextHeight] = useState(280)
  const [lastContextHeight, setLastContextHeight] = useState(280)
  const [isContextRailCollapsed, setIsContextRailCollapsed] = useState(false)
  const [rxDrawerMode, setRxDrawerMode] = useState<RxDrawerMode>('collapsed')
  const [queueFilter, setQueueFilter] = useState('')
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(consultsSeed.map((consult) => [consult.id, consult.note])),
  )
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(consultsSeed.map((consult) => [consult.id, consult.requestTitle])),
  )
  const [savedAtByConsult, setSavedAtByConsult] = useState<Record<string, string | null>>({})
  const [signedOrders, setSignedOrders] = useState<Set<string>>(() => new Set())
  const [agentRun, setAgentRun] = useState<{
    consultId: string
    actionType: AgentActionType
  } | null>(null)
  const [agentError, setAgentError] = useState<string | null>(null)

  const selectedConsult = useMemo(
    () => consults.find((consult) => consult.id === selectedConsultId) ?? consults[0],
    [consults, selectedConsultId],
  )
  const theme: ThemeMode = themePreference === 'system' ? systemTheme : themePreference

  const noteDraft = noteDrafts[selectedConsult.id] ?? selectedConsult.note
  const titleDraft = titleDrafts[selectedConsult.id] ?? selectedConsult.requestTitle
  const isOrderSigned =
    signedOrders.has(selectedConsult.id) ||
    selectedConsult.status === 'Signed' ||
    selectedConsult.status === 'Completed'
  const windowStyle = {
    '--queue-width': `${queueWidth}px`,
    '--copilot-width': `${copilotWidth}px`,
  } as CSSProperties

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)')
    const handleChange = () => setSystemTheme(mediaQuery.matches ? 'light' : 'dark')
    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  function handleThemePreferenceChange(nextPreference: ThemePreference) {
    setThemePreference(nextPreference)
    window.localStorage.setItem('bloom-theme-preference', nextPreference)
  }

  function handleAppearanceContrastChange(nextContrast: AppearanceContrast) {
    setAppearanceContrast(nextContrast)
    window.localStorage.setItem('bloom-appearance-contrast', nextContrast)
  }

  function handleSelectConsult(id: string) {
    setSelectedConsultId(id)
    setActiveChartTab('Request')
    setActiveCopilotTab('Copilot')
  }

  function handleSaveNote() {
    const savedAt = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date())

    setConsults((current) =>
      current.map((consult) =>
        consult.id === selectedConsult.id
          ? { ...consult, requestTitle: titleDraft, note: noteDraft }
          : consult,
      ),
    )
    setSavedAtByConsult((current) => ({ ...current, [selectedConsult.id]: savedAt }))
  }

  function handleDiscardNote() {
    setNoteDrafts((current) => ({ ...current, [selectedConsult.id]: selectedConsult.note }))
    setTitleDrafts((current) => ({
      ...current,
      [selectedConsult.id]: selectedConsult.requestTitle,
    }))
    setSavedAtByConsult((current) => ({ ...current, [selectedConsult.id]: null }))
  }

  function handleCompleteNote() {
    const savedAt = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date())

    setSignedOrders((current) => {
      const next = new Set(current)
      next.add(selectedConsult.id)
      return next
    })
    setConsults((current) =>
      current.map((consult) =>
        consult.id === selectedConsult.id
          ? { ...consult, requestTitle: titleDraft, note: noteDraft, status: 'Completed' }
          : consult,
      ),
    )
    setSavedAtByConsult((current) => ({ ...current, [selectedConsult.id]: savedAt }))
  }

  function handleCancelDraft() {
    setSignedOrders((current) => {
      const next = new Set(current)
      next.delete(selectedConsult.id)
      return next
    })
    setConsults((current) =>
      current.map((consult) =>
        consult.id === selectedConsult.id &&
        (consult.status === 'Signed' || consult.status === 'Completed')
          ? { ...consult, status: 'Draft ready' }
          : consult,
      ),
    )
  }

  async function handleRequestAgentAction(actionType: AgentActionType, prompt?: string) {
    setAgentError(null)
    setAgentRun({ consultId: selectedConsult.id, actionType })
    setActiveCopilotTab('Copilot')

    try {
      const response = await agentClient.createActionCard({
        actionType,
        consult: selectedConsult,
        prompt,
      })

      setConsults((current) =>
        current.map((consult) =>
          consult.id === selectedConsult.id
            ? {
                ...consult,
                status: consult.status === 'New' ? 'Draft ready' : consult.status,
                agentEvents: [...consult.agentEvents, response.event],
                actionCards: [response.actionCard, ...consult.actionCards],
              }
            : consult,
        ),
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach Bloom agent'
      setAgentError(message)
      setConsults((current) =>
        current.map((consult) =>
          consult.id === selectedConsult.id
            ? {
                ...consult,
                agentEvents: [
                  ...consult.agentEvents,
                  {
                    id: `agent-error-${Date.now()}`,
                    kind: 'error',
                    label: 'Agent request failed',
                    body: [message],
                  },
                ],
              }
            : consult,
        ),
      )
    } finally {
      setAgentRun(null)
    }
  }

  function handleActionStatusChange(cardId: string, status: AgentActionStatus) {
    const acceptedPlan =
      status === 'accepted'
        ? selectedConsult.actionCards.find(
            (card): card is DraftPlanAction => card.id === cardId && card.type === 'draft_plan',
          ) ?? null
        : null
    const acceptedPrescription =
      status === 'accepted'
        ? selectedConsult.actionCards.find(
            (card): card is DraftPrescriptionAction =>
              card.id === cardId && card.type === 'draft_prescription',
          ) ?? null
        : null

    setConsults((current) =>
      current.map((consult) => {
        if (consult.id !== selectedConsult.id) return consult

        const actionCards = consult.actionCards.map((card) => {
          if (card.id !== cardId) return card
          return { ...card, status }
        })

        if (acceptedPrescription !== null) {
          return {
            ...consult,
            status: consult.status === 'New' ? 'Draft ready' : consult.status,
            draftOrder: acceptedPrescription.order,
            prescribedMedications: upsertDraftMedicationCandidates(
              consult.prescribedMedications,
              medicationCandidatesFromOrder(acceptedPrescription.order),
            ),
            actionCards,
          }
        }

        return { ...consult, actionCards }
      }),
    )

    if (acceptedPlan !== null) {
      const planToApply = acceptedPlan
      setNoteDrafts((current) => {
        const existing = current[selectedConsult.id] ?? selectedConsult.note
        return {
          ...current,
          [selectedConsult.id]: `${existing.trim()}\n\n${formatPlanForNote(planToApply)}`,
        }
      })
      setSavedAtByConsult((current) => ({ ...current, [selectedConsult.id]: null }))
    }

    if (acceptedPrescription !== null && workspaceVariant === 'v2') {
      setActiveCopilotTab('Prescription Console')
      setRxDrawerMode('full')
    }
  }

  function createHorizontalResizeHandler(options: {
    startWidth: number
    min: number
    max: number
    direction: 'left' | 'right'
    onResize: (value: number) => void
  }) {
    return (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      const startX = event.clientX
      const { startWidth, min, max, direction, onResize } = options

      function handlePointerMove(moveEvent: PointerEvent) {
        const delta = moveEvent.clientX - startX
        const nextWidth = direction === 'left' ? startWidth + delta : startWidth - delta
        onResize(clamp(nextWidth, min, max))
      }

      function handlePointerUp() {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        document.body.classList.remove('is-resizing')
      }

      document.body.classList.add('is-resizing')
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
    }
  }

  function handleContextResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = contextHeight

    function handlePointerMove(moveEvent: PointerEvent) {
      const delta = startY - moveEvent.clientY
      const nextHeight = clamp(startHeight + delta, 180, 560)
      setContextHeight(nextHeight)
      setLastContextHeight(nextHeight)
    }

    function handlePointerUp() {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      document.body.classList.remove('is-resizing')
    }

    document.body.classList.add('is-resizing')
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  function handleToggleContextRail() {
    setIsContextRailCollapsed((current) => {
      if (current) {
        setContextHeight(lastContextHeight)
        return false
      }

      setLastContextHeight(contextHeight)
      return true
    })
  }

  const workspaceVariant =
    window.location.pathname === '/v2' ? 'v2' : window.location.pathname === '/v3' ? 'v3' : 'v1'
  const variantSwitcher = <VariantSwitcher activeVariant={workspaceVariant} />
  const componentVariant = workspaceVariant === 'v1' ? 'v1' : 'v2'
  const queuePane = isQueueOpen ? (
    <ConsultQueue
      consults={consults}
      selectedId={selectedConsult.id}
      filter={queueFilter}
      themePreference={themePreference}
      appearanceContrast={appearanceContrast}
      onFilterChange={setQueueFilter}
      onSelect={handleSelectConsult}
      onThemePreferenceChange={handleThemePreferenceChange}
      onAppearanceContrastChange={handleAppearanceContrastChange}
    />
  ) : null
  const chartPane = (
    <ChartWorkspace
      consult={selectedConsult}
      activeTab={activeChartTab}
      noteDraft={noteDraft}
      titleDraft={titleDraft}
      contextHeight={contextHeight}
      isContextRailCollapsed={isContextRailCollapsed}
      isQueueOpen={isQueueOpen}
      theme={theme}
      savedAt={savedAtByConsult[selectedConsult.id] ?? null}
      rxDrawerMode={rxDrawerMode}
      onActiveTabChange={setActiveChartTab}
      onNoteDraftChange={(value) =>
        setNoteDrafts((current) => ({ ...current, [selectedConsult.id]: value }))
      }
      onTitleDraftChange={(value) =>
        setTitleDrafts((current) => ({ ...current, [selectedConsult.id]: value }))
      }
      onSaveNote={handleSaveNote}
      onCompleteNote={handleCompleteNote}
      onDiscardNote={handleDiscardNote}
      onRxDrawerModeChange={setRxDrawerMode}
      onToggleQueue={() => setIsQueueOpen((current) => !current)}
      onResizeContext={handleContextResize}
      onToggleTheme={() => handleThemePreferenceChange(theme === 'dark' ? 'light' : 'dark')}
      variant={componentVariant}
    />
  )
  const copilotPanel = isCopilotOpen ? (
    <CopilotPanel
      consult={selectedConsult}
      activeTab={activeCopilotTab}
      isOrderSigned={isOrderSigned}
      agentRun={agentRun?.consultId === selectedConsult.id ? agentRun.actionType : null}
      agentError={agentError}
      isRxDrawerOpen={rxDrawerMode !== 'collapsed'}
      rxDrawerMode={rxDrawerMode}
      variant={componentVariant}
      onTabChange={setActiveCopilotTab}
      onCancelDraft={handleCancelDraft}
      onRequestAction={handleRequestAgentAction}
      onActionStatusChange={handleActionStatusChange}
      onOpenPrescribe={() => {
        setActiveChartTab('Request')
        if (componentVariant === 'v2') setActiveCopilotTab('Prescription Console')
        setRxDrawerMode('review')
      }}
      onRxDrawerModeChange={setRxDrawerMode}
      onInsertChatExcerpt={(excerpt) => {
        const prefix = noteDraft.trim()
        setNoteDrafts((current) => ({
          ...current,
          [selectedConsult.id]: `${prefix}\n\nPatient chat excerpt\n- ${excerpt}`,
        }))
      }}
      onInsertPrescriptionSummary={(summary) => {
        const prefix = noteDraft.trim()
        if (prefix.includes(summary)) return
        setNoteDrafts((current) => ({
          ...current,
          [selectedConsult.id]: `${prefix}\n\n${summary}`,
        }))
      }}
      onTogglePanel={() => setIsCopilotOpen(false)}
    />
  ) : (
    <button
      className="copilot-rail-toggle"
      onClick={() => setIsCopilotOpen(true)}
      type="button"
      aria-label="Show copilot panel"
    >
      Show Copilot
    </button>
  )

  if (workspaceVariant === 'v3') {
    return (
      <div
        className="desktop-stage"
        data-theme={theme}
        data-contrast={appearanceContrast}
        data-ui-variant="v3"
      >
        {variantSwitcher}
        <div className="v2-window-controls" aria-label="Window controls">
          <button
            className="icon-button theme-toggle"
            onClick={() => handleThemePreferenceChange(theme === 'dark' ? 'light' : 'dark')}
            type="button"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            className={`icon-button ${isContextRailCollapsed ? 'active' : ''}`}
            onClick={handleToggleContextRail}
            type="button"
            aria-label={isContextRailCollapsed ? 'Show bottom rail' : 'Collapse bottom rail'}
            title={isContextRailCollapsed ? 'Show bottom rail' : 'Collapse bottom rail'}
          >
            {isContextRailCollapsed ? <PanelBottomOpen size={17} /> : <PanelBottomClose size={17} />}
          </button>
          <button
            className={`icon-button ${isCopilotOpen ? '' : 'active'}`}
            onClick={() => setIsCopilotOpen((current) => !current)}
            type="button"
            aria-label={isCopilotOpen ? 'Collapse right panel' : 'Show right panel'}
            title={isCopilotOpen ? 'Collapse right panel' : 'Show right panel'}
          >
            {isCopilotOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
          </button>
        </div>
        <div
          className={`bloom-window-v2 ${isQueueOpen ? 'queue-open' : 'queue-closed'} ${
            isCopilotOpen ? 'copilot-open' : 'copilot-closed'
          }`}
          style={windowStyle}
        >
          {isQueueOpen ? <section className="v2-queue-shell">{queuePane}</section> : null}
          <section className="v2-chart-shell">{chartPane}</section>
          <section className="v2-copilot-shell">{copilotPanel}</section>
        </div>
      </div>
    )
  }

  if (workspaceVariant === 'v2') {
    return (
      <div
        className="desktop-stage"
        data-theme={theme}
        data-contrast={appearanceContrast}
        data-ui-variant="v2"
      >
        {variantSwitcher}
        <div className="v2-window-controls" aria-label="Window controls">
          <button
            className="icon-button theme-toggle"
            onClick={() => handleThemePreferenceChange(theme === 'dark' ? 'light' : 'dark')}
            type="button"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            className={`icon-button ${isContextRailCollapsed ? 'active' : ''}`}
            onClick={handleToggleContextRail}
            type="button"
            aria-label={isContextRailCollapsed ? 'Show bottom rail' : 'Collapse bottom rail'}
            title={isContextRailCollapsed ? 'Show bottom rail' : 'Collapse bottom rail'}
          >
            {isContextRailCollapsed ? <PanelBottomOpen size={17} /> : <PanelBottomClose size={17} />}
          </button>
          <button
            className={`icon-button ${isCopilotOpen ? '' : 'active'}`}
            onClick={() => setIsCopilotOpen((current) => !current)}
            type="button"
            aria-label={isCopilotOpen ? 'Collapse right panel' : 'Show right panel'}
            title={isCopilotOpen ? 'Collapse right panel' : 'Show right panel'}
          >
            {isCopilotOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}
          </button>
        </div>
        <div
          className={`bloom-window-v2 ${isQueueOpen ? 'queue-open' : 'queue-closed'} ${
            isCopilotOpen ? 'copilot-open' : 'copilot-closed'
          }`}
          style={windowStyle}
        >
          {isQueueOpen ? <section className="v2-queue-shell">{queuePane}</section> : null}
          <section className="v2-chart-shell">{chartPane}</section>
          <section className="v2-copilot-shell">{copilotPanel}</section>
        </div>
      </div>
    )
  }

  return (
    <div className="desktop-stage" data-theme={theme} data-contrast={appearanceContrast}>
      {variantSwitcher}
      <div
        className={`bloom-window ${isQueueOpen ? 'queue-open' : 'queue-closed'} ${
          isCopilotOpen ? 'copilot-open' : 'copilot-closed'
        }`}
        style={windowStyle}
      >
        {queuePane}

        {isQueueOpen ? (
          <button
            className="pane-resizer vertical queue-resizer"
            onPointerDown={createHorizontalResizeHandler({
              startWidth: queueWidth,
              min: 240,
              max: 460,
              direction: 'left',
              onResize: setQueueWidth,
            })}
            type="button"
            aria-label="Resize consult queue"
          >
            <GripVertical size={14} />
          </button>
        ) : null}

        {chartPane}

        {isCopilotOpen ? (
          <>
            <button
              className="pane-resizer vertical copilot-resizer"
              onPointerDown={createHorizontalResizeHandler({
                startWidth: copilotWidth,
                min: 380,
                max: 760,
                direction: 'right',
                onResize: setCopilotWidth,
              })}
              type="button"
              aria-label="Resize copilot panel"
            >
              <GripVertical size={14} />
            </button>
            {copilotPanel}
          </>
        ) : (
          copilotPanel
        )}
      </div>
    </div>
  )
}

function VariantSwitcher({ activeVariant }: { activeVariant: 'v1' | 'v2' | 'v3' }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    moved: false,
  })

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
      moved: false,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!isDragging) return

    const deltaX = event.clientX - dragRef.current.startX
    const deltaY = event.clientY - dragRef.current.startY
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) dragRef.current.moved = true
    setOffset({
      x: dragRef.current.originX + deltaX,
      y: dragRef.current.originY + deltaY,
    })
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setIsDragging(false)
  }

  function handleClick(event: ReactMouseEvent<HTMLAnchorElement>) {
    if (!dragRef.current.moved) return
    event.preventDefault()
    dragRef.current.moved = false
  }

  return (
    <nav
      className={`variant-switcher ${isDragging ? 'dragging' : ''}`}
      aria-label="UI variant switcher"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
    >
      <a
        className={activeVariant === 'v1' ? 'selected' : ''}
        href="/"
        draggable={false}
        onClick={handleClick}
      >
        V1
      </a>
      <a
        className={activeVariant === 'v2' ? 'selected' : ''}
        href="/v2"
        draggable={false}
        onClick={handleClick}
      >
        V2
      </a>
      <a
        className={activeVariant === 'v3' ? 'selected' : ''}
        href="/v3"
        draggable={false}
        onClick={handleClick}
      >
        V3
      </a>
    </nav>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function medicationCandidatesFromOrder(order: DraftPrescriptionAction['order']): Medication[] {
  if (
    order.medication === 'No prescription drafted' ||
    order.medication === 'No medication drafted'
  ) {
    return []
  }

  const medicationNames = order.medication
    .split(/\s+\+\s+|;\s*|,\s*(?=[A-Z])/)
    .map((name) => name.trim())
    .filter(Boolean)

  return medicationNames.map((name) => ({
    name,
    status: 'Draft',
    medicationStatus: 'Pending',
    templateId: templateIdForMedication(name),
    dosageInstructions: instructionsForMedicationOrder(order.sig, name),
    effectiveDate: `${order.daysSupply} days`,
  }))
}

function upsertDraftMedicationCandidates(medications: Medication[], candidates: Medication[]) {
  if (candidates.length === 0) return medications

  const candidateNames = new Set(candidates.map((candidate) => candidate.name))
  const withoutSameDraftCandidates = medications.filter(
    (medication) =>
      !(
        medication.status === 'Draft' &&
        medication.medicationStatus === 'Pending' &&
        candidateNames.has(medication.name)
      ),
  )

  return [...candidates, ...withoutSameDraftCandidates]
}

function templateIdForMedication(name: string) {
  const normalized = name.toLowerCase()
  if (normalized.includes('estradiol') && normalized.includes('patch')) {
    return 'tpl_estradiol_patch_0375'
  }
  if (normalized.includes('progesterone')) {
    return 'tpl_progesterone_100mg'
  }
  if (normalized.includes('vaginal') && normalized.includes('estradiol')) {
    return 'tpl_estradiol_vaginal_cream'
  }
  return undefined
}

function instructionsForMedicationOrder(sig: string, medicationName: string) {
  const normalized = medicationName.toLowerCase()
  const parts = sig
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

  if (normalized.includes('estradiol') && normalized.includes('patch')) {
    return parts.find((part) => part.toLowerCase().includes('patch')) ?? sig
  }
  if (normalized.includes('progesterone')) {
    return parts.find((part) => part.toLowerCase().includes('progesterone')) ?? sig
  }
  return sig
}

function formatPlanForNote(plan: DraftPlanAction) {
  const sections = plan.sections
    .map((section) => {
      const items = section.items.map((item) => `- ${item}`).join('\n')
      return `${section.heading}\n${items}`
    })
    .join('\n\n')

  return `AI Draft Plan (${plan.generatedAt})\n${sections}\n\nSafety checks\n${plan.safetyChecks
    .map((check) => `- ${check}`)
    .join('\n')}`
}

export default App
