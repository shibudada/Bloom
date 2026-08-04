import {
  AlertTriangle,
  ArrowUpDown,
  Bold,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  GripHorizontal,
  Italic,
  Link2,
  Loader2,
  Moon,
  PanelLeft,
  Pill,
  Save,
  Search,
  Send,
  Strikethrough,
  Sun,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { ChatHistoryPanel, InternalNotesPanel } from './ConsultContextPanels'
import { chartTabs } from '../data/seed'
import type { ChartTab, Consult, Medication, RxDrawerMode, ThemeMode } from '../types'

type WorkspaceVariant = 'v1' | 'v2'
type ContextTab = 'Snapshot' | 'Timeline' | 'Chat History' | 'Internal Notes'
type RxReadinessState = 'syncing' | 'auth' | 'ready' | 'blocked'
type EncounterArtifactId = 'after-visit-summary' | 'follow-up' | 'ordered-medication-summary'
type EncounterArtifactStatus = 'preparing' | 'ready'
type EncounterArtifact = {
  id: EncounterArtifactId
  title: string
  status: EncounterArtifactStatus
  content: string
}
type PhotonPublicConfig = {
  orgId: string
  clientId: string
  siteUrl: string
  authDomain: string
  authAudience: string
}
type PhotonSyncState =
  | { status: 'idle' | 'loading' }
  | { status: 'blocked'; message: string }
  | { status: 'ready'; patientId: string; externalId?: string | null }
type PhotonAddendum = {
  eventType: string
  createdAt: string
  summary: string
  hasPrescriptionContent: boolean
}

const API_BASE_URL = import.meta.env.VITE_BLOOM_API_BASE_URL ?? 'http://127.0.0.1:8787'
const trackedPhotonEvents = [
  'photon-prescriptions-created',
  'photon-prescriptions-closed',
  'photon-draft-prescription-created',
  'photon-draft-prescription-deleted',
  'photon-order-error',
  'photon-order-combine-error',
] as const

const encounterArtifactLabels: Record<EncounterArtifactId, string> = {
  'after-visit-summary': 'After Visit Summary',
  'follow-up': 'Follow-Up',
  'ordered-medication-summary': 'Ordered Medication Summary',
}

function createPreparingEncounterArtifacts(): EncounterArtifact[] {
  return Object.entries(encounterArtifactLabels).map(([id, title]) => ({
    id: id as EncounterArtifactId,
    title,
    status: 'preparing',
    content: 'Preparing...',
  }))
}

function createReadyEncounterArtifacts(consult: Consult, noteDraft: string): EncounterArtifact[] {
  const patientFirstName = consult.patient.name.split(' ')[0] || 'the patient'
  const noteSummary =
    noteDraft
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(' ') || consult.summary

  return [
    {
      id: 'after-visit-summary',
      title: encounterArtifactLabels['after-visit-summary'],
      status: 'ready',
      content: [
        `${patientFirstName}, today we reviewed your ${consult.requestType.toLowerCase()} concern: ${consult.requestTitle}.`,
        noteSummary,
        'Continue the care plan discussed with your clinician. Contact Bloom if symptoms worsen, new side effects develop, or you have questions before your next check-in.',
      ].join('\n\n'),
    },
    {
      id: 'follow-up',
      title: encounterArtifactLabels['follow-up'],
      status: 'ready',
      content: [
        'Follow-up plan:',
        ...consult.followUps.map((item) => `- ${item}`),
        '- Seek urgent care for severe symptoms, chest pain, shortness of breath, fainting, or any rapidly worsening concern.',
      ].join('\n'),
    },
    {
      id: 'ordered-medication-summary',
      title: encounterArtifactLabels['ordered-medication-summary'],
      status: 'ready',
      content: createOrderedMedicationArtifact(consult),
    },
  ]
}

function createOrderedMedicationArtifact(consult: Consult) {
  const medicationLines = consult.prescribedMedications
    .filter((medication) => medication.status !== 'Stopped')
    .map((medication) => {
      const instructions = medication.dosageInstructions ?? medication.effectiveDate ?? consult.draftOrder.sig
      return `- ${medication.name}: ${instructions}.`
    })

  const hasDraftOrder =
    consult.draftOrder.medication && consult.draftOrder.medication !== 'No prescription drafted'
  if (medicationLines.length === 0 && hasDraftOrder) {
    medicationLines.push(
      `- ${consult.draftOrder.medication}: ${consult.draftOrder.sig}. Quantity ${consult.draftOrder.quantity}; refills ${consult.draftOrder.refills}; ${consult.draftOrder.daysSupply} day supply.`,
    )
  }

  if (medicationLines.length === 0) {
    return 'No medication was ordered during this encounter.'
  }

  return [
    'Medication ordered:',
    ...medicationLines,
    'You will receive a text message with a secure link. Use that link to choose your preferred pharmacy and apply insurance coverage before the prescription is sent.',
  ].join('\n')
}

interface ChartWorkspaceProps {
  consult: Consult
  activeTab: ChartTab
  noteDraft: string
  titleDraft: string
  contextHeight: number
  isContextRailCollapsed: boolean
  isQueueOpen: boolean
  theme: ThemeMode
  savedAt: string | null
  rxDrawerMode: RxDrawerMode
  onActiveTabChange: (tab: ChartTab) => void
  onNoteDraftChange: (value: string) => void
  onTitleDraftChange: (value: string) => void
  onSaveNote: () => void
  onCompleteNote: () => void
  onDiscardNote: () => void
  onRxDrawerModeChange: (mode: RxDrawerMode) => void
  onToggleQueue: () => void
  onResizeContext: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onToggleTheme: () => void
  variant?: WorkspaceVariant
}

export function ChartWorkspace({
  consult,
  activeTab,
  noteDraft,
  titleDraft,
  contextHeight,
  isContextRailCollapsed,
  isQueueOpen,
  theme,
  savedAt,
  rxDrawerMode,
  onActiveTabChange,
  onNoteDraftChange,
  onTitleDraftChange,
  onSaveNote,
  onCompleteNote,
  onDiscardNote,
  onRxDrawerModeChange,
  onToggleQueue,
  onResizeContext,
  onToggleTheme,
  variant = 'v1',
}: ChartWorkspaceProps) {
  const chartStyle = {
    '--context-height': `${contextHeight}px`,
  } as CSSProperties

  return (
    <main
      className={`chart-workspace ${isContextRailCollapsed ? 'context-rail-collapsed' : ''}`}
      style={chartStyle}
    >
      <header className="chart-topbar">
        <button
          className={`icon-button ${isQueueOpen ? 'active' : ''}`}
          onClick={onToggleQueue}
          type="button"
          aria-label={isQueueOpen ? 'Hide consult queue' : 'Show consult queue'}
        >
          <PanelLeft size={16} />
        </button>
        <div className="patient-name">{consult.patient.name}</div>
        <nav className="chart-tabs" aria-label="Patient chart sections">
          {chartTabs.map((tab) => (
            <button
              className={activeTab === tab ? 'selected' : ''}
              key={tab}
              onClick={() => onActiveTabChange(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>
        {variant === 'v1' ? (
          <button
            className="icon-button theme-toggle"
            onClick={onToggleTheme}
            type="button"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        ) : null}
      </header>

      <div className="chart-scroll">
        {activeTab === 'Request' ? (
          <RequestView
            key={consult.id}
            consult={consult}
            noteDraft={noteDraft}
            titleDraft={titleDraft}
            savedAt={savedAt}
            rxDrawerMode={rxDrawerMode}
            onNoteDraftChange={onNoteDraftChange}
            onTitleDraftChange={onTitleDraftChange}
            onSaveNote={onSaveNote}
            onCompleteNote={onCompleteNote}
            onDiscardNote={onDiscardNote}
            onRxDrawerModeChange={onRxDrawerModeChange}
            onResizeContext={onResizeContext}
            isContextRailCollapsed={isContextRailCollapsed}
            variant={variant}
          />
        ) : null}
        {activeTab === 'Medications' ? <MedicationsView consult={consult} /> : null}
        {activeTab === 'Labs' ? <LabsView consult={consult} /> : null}
        {activeTab === 'Conditions' ? <ConditionsView consult={consult} /> : null}
        {activeTab === 'Notes' ? <NotesView consult={consult} /> : null}
        {activeTab === 'Procedures' ? <ProceduresView consult={consult} /> : null}
        {activeTab === 'Vitals' ? <VitalsView consult={consult} /> : null}
      </div>
    </main>
  )
}

function RequestView({
  consult,
  noteDraft,
  titleDraft,
  savedAt,
  rxDrawerMode,
  onNoteDraftChange,
  onTitleDraftChange,
  onSaveNote,
  onCompleteNote,
  onDiscardNote,
  onRxDrawerModeChange,
  onResizeContext,
  isContextRailCollapsed,
  variant,
}: {
  consult: Consult
  noteDraft: string
  titleDraft: string
  savedAt: string | null
  rxDrawerMode: RxDrawerMode
  onNoteDraftChange: (value: string) => void
  onTitleDraftChange: (value: string) => void
  onSaveNote: () => void
  onCompleteNote: () => void
  onDiscardNote: () => void
  onRxDrawerModeChange: (mode: RxDrawerMode) => void
  onResizeContext: (event: ReactPointerEvent<HTMLButtonElement>) => void
  isContextRailCollapsed: boolean
  variant: WorkspaceVariant
}) {
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const [encounterArtifacts, setEncounterArtifacts] = useState<EncounterArtifact[]>(
    createPreparingEncounterArtifacts,
  )
  const [expandedArtifactIds, setExpandedArtifactIds] = useState<EncounterArtifactId[]>([])
  const [reviewedArtifactIds, setReviewedArtifactIds] = useState<EncounterArtifactId[]>([])
  const artifactsReady = encounterArtifacts.every((artifact) => artifact.status === 'ready')
  const reviewedArtifactCount = reviewedArtifactIds.length
  const canCompleteNote = artifactsReady && reviewedArtifactCount === encounterArtifacts.length
  const uterusStatus = getUterusStatus(consult)

  useEffect(() => {
    const textarea = noteRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [noteDraft])

  useEffect(() => {
    const textarea = titleRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [titleDraft])

  function generateEncounterArtifacts() {
    setEncounterArtifacts(createReadyEncounterArtifacts(consult, noteDraft))
    setExpandedArtifactIds(['after-visit-summary'])
    setReviewedArtifactIds([])
  }

  function toggleEncounterArtifact(id: EncounterArtifactId) {
    setExpandedArtifactIds((currentIds) =>
      currentIds.includes(id)
        ? currentIds.filter((currentId) => currentId !== id)
        : [...currentIds, id],
    )
  }

  function updateEncounterArtifact(id: EncounterArtifactId, content: string) {
    setEncounterArtifacts((currentArtifacts) =>
      currentArtifacts.map((artifact) =>
        artifact.id === id ? { ...artifact, content } : artifact,
      ),
    )
  }

  function markEncounterArtifactReviewed(id: EncounterArtifactId) {
    setReviewedArtifactIds((currentIds) =>
      currentIds.includes(id) ? currentIds : [...currentIds, id],
    )
  }

  function applyFormat(format: 'bold' | 'italic' | 'strike' | 'link') {
    const textarea = noteRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = noteDraft.slice(start, end)
    const fallbackText = selectedText || 'selected text'
    const linkHref =
      format === 'link' ? window.prompt('Link URL', 'https://')?.trim() : undefined
    if (format === 'link' && !linkHref) return

    const formattedText =
      format === 'bold'
        ? `**${fallbackText}**`
        : format === 'italic'
          ? `_${fallbackText}_`
          : format === 'strike'
            ? `~~${fallbackText}~~`
            : `[${fallbackText}](${linkHref})`

    const nextValue = `${noteDraft.slice(0, start)}${formattedText}${noteDraft.slice(end)}`
    onNoteDraftChange(nextValue)

    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start, start + formattedText.length)
    })
  }

  return (
    <section className="request-view" aria-label="Current request">
      <div className="request-main-scroll">
        <div className="request-heading">
          <div>
            <div className="request-title-line">
              <span className="status-spinner" aria-hidden="true" />
              <textarea
                ref={titleRef}
                className="request-title-editor"
                value={titleDraft}
                rows={1}
                onChange={(event) => onTitleDraftChange(event.target.value)}
                aria-label="Request title"
              />
            </div>
            <div className="request-metadata">
              <span>{consult.patient.age}F</span>
              <span>{consult.patient.stage}</span>
              <span>{consult.receivedAt}</span>
              <span className="uterus-status-pill">{uterusStatus}</span>
            </div>
          </div>
          <div className="request-actions">
            <button className="secondary-button" onClick={onDiscardNote} type="button">
              Discard
            </button>
            <button className="primary-button compact" onClick={onSaveNote} type="button">
              <Save size={14} />
              Save
            </button>
            <button
              className="primary-button compact"
              onClick={onCompleteNote}
              type="button"
              disabled={!canCompleteNote}
              title={canCompleteNote ? undefined : 'Review all generated encounter artifacts first'}
            >
              <Check size={14} />
              Save & Complete
            </button>
          </div>
        </div>

        <div className="editor-toolbar" aria-label="Editor toolbar">
          <button onClick={() => applyFormat('bold')} type="button" aria-label="Bold">
            <Bold size={16} />
          </button>
          <button onClick={() => applyFormat('italic')} type="button" aria-label="Italic">
            <Italic size={16} />
          </button>
          <button onClick={() => applyFormat('strike')} type="button" aria-label="Strikethrough">
            <Strikethrough size={16} />
          </button>
          <button onClick={() => applyFormat('link')} type="button" aria-label="Link">
            <Link2 size={16} />
          </button>
          {savedAt ? <span className="save-state">Saved {savedAt}</span> : null}
        </div>

        <div className="request-document-scroll">
          <textarea
            ref={noteRef}
            className="clinical-note"
            value={noteDraft}
            onChange={(event) => onNoteDraftChange(event.target.value)}
            spellCheck
            aria-label="AI-drafted clinical request note"
          />

          <section className="encounter-artifacts" aria-label="AI-generated encounter artifacts">
            <div className="encounter-artifacts-header">
              <div>
                <h2>Encounter artifacts</h2>
                <p>{artifactsReady ? '3 items ready' : 'Preparing...'}</p>
              </div>
              <button className="secondary-button" onClick={generateEncounterArtifacts} type="button">
                Generate AVS
              </button>
            </div>

            <div className="encounter-artifact-list">
              {encounterArtifacts.map((artifact) => {
                const isExpanded = expandedArtifactIds.includes(artifact.id)
                const isReviewed = reviewedArtifactIds.includes(artifact.id)
                return (
                  <article
                    className={`encounter-artifact-card ${isExpanded ? 'expanded' : ''}`}
                    key={artifact.id}
                  >
                    <button
                      className="encounter-artifact-toggle"
                      onClick={() => toggleEncounterArtifact(artifact.id)}
                      type="button"
                      aria-expanded={isExpanded}
                    >
                      <span className="encounter-artifact-title">
                        {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        {artifact.title}
                      </span>
                      <span
                        className={`encounter-artifact-status ${isReviewed ? 'reviewed' : ''}`}
                      >
                        {artifact.status === 'preparing'
                          ? 'Preparing...'
                          : isReviewed
                            ? 'Reviewed'
                            : 'Ready'}
                      </span>
                    </button>

                    {isExpanded ? (
                      <div className="encounter-artifact-body">
                        <textarea
                          value={artifact.content}
                          onChange={(event) =>
                            updateEncounterArtifact(artifact.id, event.target.value)
                          }
                          disabled={artifact.status !== 'ready'}
                          aria-label={`${artifact.title} editable content`}
                        />
                        <div className="encounter-artifact-footer">
                          <span>
                            {artifact.status === 'ready'
                              ? 'Review and edit before completion.'
                              : 'Content will appear after Generate AVS.'}
                          </span>
                          <button
                            className="secondary-button"
                            onClick={() => markEncounterArtifactReviewed(artifact.id)}
                            type="button"
                            disabled={artifact.status !== 'ready'}
                          >
                            <Check size={14} />
                            {isReviewed ? 'Reviewed' : 'Mark reviewed'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </section>

          {variant === 'v1' ? (
            <RxCommandDrawer
              key={consult.id}
              consult={consult}
              mode={rxDrawerMode}
              onModeChange={onRxDrawerModeChange}
              onInsertSummary={(summary) => {
                const prefix = noteDraft.trim()
                if (prefix.includes(summary)) return
                onNoteDraftChange(`${prefix}\n\n${summary}`)
              }}
            />
          ) : null}
        </div>
      </div>

      {isContextRailCollapsed ? null : (
        <>
          <button
            className="pane-resizer horizontal context-resizer"
            onPointerDown={onResizeContext}
            type="button"
            aria-label="Resize patient context"
          >
            <GripHorizontal size={14} />
          </button>

          <PatientContext
            consult={consult}
            variant={variant}
            onInsertExcerpt={(excerpt) => {
              const prefix = noteDraft.trim()
              onNoteDraftChange(`${prefix}\n\nPatient chat excerpt\n- ${excerpt}`)
            }}
          />
        </>
      )}
    </section>
  )
}

export function RxCommandDrawer({
  consult,
  mode,
  onModeChange,
  onInsertSummary,
  isConsole = false,
}: {
  consult: Consult
  mode: RxDrawerMode
  onModeChange: (mode: RxDrawerMode) => void
  onInsertSummary: (summary: string) => void
  isConsole?: boolean
}) {
  const draftMedications = consult.prescribedMedications.filter(
    (medication) => medication.status === 'Draft' || medication.medicationStatus === 'Pending',
  )
  const rxCandidates = draftMedications.length > 0 ? draftMedications : fallbackMedicationCandidates(consult)
  const [selectedCandidateNames, setSelectedCandidateNames] = useState<string[]>([])
  const selectedCandidates = rxCandidates.filter((medication) =>
    selectedCandidateNames.includes(medication.name),
  )
  const [elementsReady, setElementsReady] = useState(false)
  const [config, setConfig] = useState<PhotonPublicConfig | null>(null)
  const [syncState, setSyncState] = useState<PhotonSyncState>({ status: 'idle' })
  const [photonError, setPhotonError] = useState<string | null>(null)
  const [latestPhotonAddendum, setLatestPhotonAddendum] = useState<PhotonAddendum | null>(null)
  const effectiveReadinessState = photonReadinessState(syncState, elementsReady, config, photonError)
  const readiness = rxReadinessCopy[effectiveReadinessState]
  const isPhotonLoggedIn = effectiveReadinessState === 'ready'
  const medicationCount =
    rxCandidates.length > 0 ? rxCandidates.length : consult.draftOrder.medication ? 1 : 0
  const latestStatus =
    effectiveReadinessState === 'blocked'
      ? 'Photon blocked'
      : effectiveReadinessState === 'syncing'
        ? 'Syncing patient'
        : effectiveReadinessState === 'auth'
          ? 'Auth required'
          : consult.status === 'Signed' || consult.status === 'Completed'
      ? 'Order signed'
      : medicationCount > 0
        ? 'Ready to prescribe'
        : 'No Rx candidate'

  function toggleCandidate(name: string) {
    setSelectedCandidateNames((current) => (current.includes(name) ? [] : [name]))
  }

  const loadPhoton = useCallback(async () => {
    setPhotonError(null)
    setSyncState({ status: 'loading' })

    try {
      const configResponse = await fetch(`${API_BASE_URL}/api/photon/config`)
      const configPayload = (await configResponse.json()) as
        | { ready: true; config: PhotonPublicConfig }
        | { ready: false; missing: string[]; config: null }

      if (!configResponse.ok || !configPayload.ready || !configPayload.config) {
        throw new Error(
          configPayload.ready
            ? 'Photon public config unavailable.'
            : `Missing Photon public config: ${configPayload.missing.join(', ')}`,
        )
      }

      setConfig(configPayload.config)

      const configuredOrigin = new URL(configPayload.config.siteUrl).origin
      if (configuredOrigin !== window.location.origin) {
        throw new Error(
          `Photon login must run from ${configuredOrigin}. Reopen Bloom at that URL instead of ${window.location.origin}.`,
        )
      }

      if (window.location.protocol !== 'https:') {
        throw new Error('Photon login requires HTTPS. Reopen Bloom with the HTTPS local dev URL.')
      }

      await import('@photonhealth/elements')
      setElementsReady(true)

      const syncResponse = await fetch(`${API_BASE_URL}/api/photon/patient/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consultId: consult.id, patient: consult.patient }),
      })
      const syncPayload = (await syncResponse.json()) as
        | { ok: true; patient: { id: string; externalId?: string | null } }
        | { ok: false; error: string }

      if (!syncResponse.ok || !syncPayload.ok) {
        throw new Error(syncPayload.ok ? 'Photon patient sync failed.' : syncPayload.error)
      }

      setSyncState({
        status: 'ready',
        patientId: syncPayload.patient.id,
        externalId: syncPayload.patient.externalId,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Photon setup failed.'
      setPhotonError(message)
      setSyncState({ status: 'blocked', message })
    }
  }, [consult.id, consult.patient])

  useEffect(() => {
    if (!isConsole || mode !== 'full' || syncState.status !== 'idle') return
    const timer = window.setTimeout(() => {
      void loadPhoton()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [isConsole, loadPhoton, mode, syncState.status])

  return (
    <section
      className={`rx-command-drawer ${mode} ${isConsole ? 'console' : ''} ${
        effectiveReadinessState === 'ready' ? 'ready' : effectiveReadinessState
      }`}
      aria-label="Prescribing command drawer"
    >
      {!isConsole ? (
        <button
          className="rx-drawer-rail"
          onClick={() => onModeChange(mode === 'collapsed' ? 'review' : 'collapsed')}
          type="button"
          aria-expanded={mode !== 'collapsed'}
        >
          <span className="rx-rail-primary">
            <Pill size={16} />
            <strong>Rx</strong>
            <span>{medicationCount} draft meds</span>
            <span className="rx-dot" />
            <span>{latestStatus}</span>
          </span>
          <span className="rx-rail-secondary">
            <span>{mode === 'collapsed' ? 'Open review' : 'Hide review'}</span>
            {mode === 'collapsed' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>
      ) : null}

      {mode !== 'collapsed' ? (
        <div className="rx-drawer-body">
          {isConsole ? (
            <div className={`rx-console-status-bar ${isPhotonLoggedIn ? 'logged-in' : 'logged-out'}`}>
              <span className="rx-console-status-dot" aria-hidden="true" />
              <div>
                <span>Photon status</span>
                <strong>{isPhotonLoggedIn ? 'Logged into Photon' : 'Not logged into Photon'}</strong>
              </div>
              <div>
                <span>Latest output</span>
                <strong>
                  {latestPhotonAddendum
                    ? photonEventLabel(latestPhotonAddendum.eventType)
                    : 'Waiting for Photon output'}
                </strong>
              </div>
            </div>
          ) : null}

          {!isConsole ? (
            <div className="rx-drawer-header">
              <div>
                <h2>Prescribe</h2>
              </div>
              <div className="rx-header-actions">
                <button
                  className="outline-button"
                  disabled
                  type="button"
                  title="Pop-out prescribing will be wired in a later iteration."
                >
                  <ExternalLink size={14} />
                  Pop out
                </button>
                <button
                  className="secondary-button"
                  onClick={() => onModeChange('collapsed')}
                  type="button"
                >
                  Collapse
                </button>
              </div>
            </div>
          ) : null}

          {!isConsole ? (
            <div className="rx-status-strip" aria-label="Prescribing readiness">
            <span className={effectiveReadinessState}>
              <readiness.Icon
                className={effectiveReadinessState === 'syncing' ? 'spin' : undefined}
                size={13}
              />
              {readiness.label}
            </span>
            <span>
              <Pill size={13} />
              {consult.draftOrder.pharmacy}
            </span>
            <span>
              <Check size={13} />
              Safety reviewed
            </span>
            </div>
          ) : null}

          {!isConsole ? (
            <div className="rx-review-layout">
              <section className="rx-candidate-list" aria-label="Prescription candidates">
                <div className="rx-section-heading">
                  <h3>Candidate medications</h3>
                  <span>{medicationCount}</span>
                </div>
                {rxCandidates.map((medication, index) => (
                  <button
                    className={`rx-candidate-row ${
                      selectedCandidateNames.includes(medication.name) ? 'selected' : ''
                    }`}
                    key={medication.name}
                    onClick={() => toggleCandidate(medication.name)}
                    type="button"
                    aria-pressed={selectedCandidateNames.includes(medication.name)}
                  >
                    <span className="rx-candidate-index">{index + 1}</span>
                    <div>
                      <strong>{medication.name}</strong>
                      <p>
                        {medication.medicationStatus ?? 'Candidate'} /{' '}
                        {medication.effectiveDate ?? `${consult.draftOrder.daysSupply} days`}
                      </p>
                    </div>
                    <span>{selectedCandidateNames.includes(medication.name) ? 'Selected' : 'Select'}</span>
                  </button>
                ))}
              </section>

              {selectedCandidates.length > 0 ? (
                <section className="rx-order-summary quiet" aria-label="Draft order summary">
                  <div className="rx-section-heading">
                    <h3>Order details</h3>
                  </div>
                  <dl>
                    <RxOrderDetail label="Sig" value={consult.draftOrder.sig} />
                    <RxOrderDetail label="Quantity" value={consult.draftOrder.quantity} />
                    <RxOrderDetail label="Refills" value={consult.draftOrder.refills} />
                    <RxOrderDetail label="Substitutions" value={consult.draftOrder.substitutions} />
                  </dl>
                </section>
              ) : (
                <section className="rx-order-empty" aria-label="Order details placeholder">
                  <Pill size={16} />
                  <strong>Select a medication</strong>
                  <span>Order details appear after choosing a candidate.</span>
                </section>
              )}
            </div>
          ) : null}

          {mode === 'full' ? (
            <PhotonWorkflowMount
              config={config}
              syncState={syncState}
              selectedCandidates={isConsole ? rxCandidates : selectedCandidates}
              consult={consult}
              error={photonError}
              onLoadPhoton={loadPhoton}
              onPhotonEvent={(eventType, detail) => {
                if (!photonEventSupportsAddendum(eventType)) return
                const fallbackMedications = isConsole ? rxCandidates : selectedCandidates
                setLatestPhotonAddendum(
                  formatPhotonPrescriptionSummary(eventType, detail, consult, fallbackMedications),
                )
              }}
            />
          ) : null}

          {latestPhotonAddendum && !isConsole ? (
            <div className="rx-photon-addendum-source">
              <span>Latest Photon output</span>
              <strong>{photonEventLabel(latestPhotonAddendum.eventType)}</strong>
            </div>
          ) : null}

          {isConsole ? (
            <div className="rx-console-actions">
              <button
                className="secondary-button"
                disabled={!latestPhotonAddendum?.hasPrescriptionContent}
                onClick={() => {
                  if (!latestPhotonAddendum?.hasPrescriptionContent) return
                  onInsertSummary(latestPhotonAddendum.summary)
                }}
                type="button"
              >
                Insert Rx Summary into note
              </button>
            </div>
          ) : null}

          {!isConsole ? (
            <div className="rx-drawer-actions">
            <button
              className="secondary-button"
              disabled={selectedCandidates.length === 0 && !latestPhotonAddendum}
              onClick={() => {
                const fallbackSummary = formatPrescriptionSummary(consult, selectedCandidates)
                onInsertSummary(latestPhotonAddendum?.summary ?? fallbackSummary)
              }}
              type="button"
            >
              {latestPhotonAddendum ? 'Insert Photon Rx summary into note' : 'Insert Rx summary into note'}
            </button>
            <button
              className="primary-button compact"
              disabled={selectedCandidates.length === 0}
              onClick={() => {
                if (mode === 'full') {
                  onModeChange('review')
                  return
                }

                onModeChange('full')
                void loadPhoton()
              }}
              type="button"
            >
              {mode === 'full' ? 'Return to review' : 'Open prescribing workspace'}
              {mode === 'full' ? <ChevronDown size={14} /> : <Send size={14} />}
            </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function RxOrderDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function getUterusStatus(consult: Consult) {
  const haystack = [
    consult.note,
    consult.summary,
    consult.activeProblem,
    consult.internalNotes,
    ...consult.tags,
    ...consult.safetyFlags,
    ...consult.conditions.map((condition) => condition.name),
    ...consult.chat.flatMap((message) => message.body),
  ]
    .join(' ')
    .toLowerCase()

  if (haystack.includes('iud')) return 'IUD present'

  const hasIntactSignal =
    haystack.includes('uterus present') ||
    haystack.includes('uterus is present') ||
    haystack.includes('still have my uterus') ||
    haystack.includes('no uterus removed')

  if (
    !hasIntactSignal &&
    (haystack.includes('hysterectomy') ||
      haystack.includes('surgically absent') ||
      haystack.includes('uterus absent') ||
      haystack.includes('uterus removed') ||
      /\bno uterus\b/.test(haystack))
  ) {
    return 'Uterus: surgically absent'
  }

  return 'Uterus: intact'
}

function PhotonWorkflowMount({
  config,
  syncState,
  selectedCandidates,
  consult,
  error,
  onLoadPhoton,
  onPhotonEvent,
}: {
  config: PhotonPublicConfig | null
  syncState: PhotonSyncState
  selectedCandidates: Medication[]
  consult: Consult
  error: string | null
  onLoadPhoton: () => void
  onPhotonEvent: (eventType: string, detail: unknown) => void
}) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const templateIds = selectedCandidates
    .map((medication) => medication.templateId ?? medication.name)
    .filter((templateId) => templateId.startsWith('tpl_'))
    .join(',')

  useEffect(() => {
    if (syncState.status !== 'ready') return

    const host = hostRef.current
    if (!host) return

    function handlePhotonEvent(event: Event) {
      const customEvent = event as CustomEvent<unknown>
      onPhotonEvent(event.type, customEvent.detail ?? null)
    }

    for (const eventName of trackedPhotonEvents) {
      host.addEventListener(eventName, handlePhotonEvent)
    }

    return () => {
      for (const eventName of trackedPhotonEvents) {
        host.removeEventListener(eventName, handlePhotonEvent)
      }
    }
  }, [onPhotonEvent, syncState.status])

  if (syncState.status === 'ready' && config) {
    return (
      <div ref={hostRef} className="rx-photon-host" aria-label="Photon prescribing workflow">
        <photon-client
          id={config.clientId}
          org={config.orgId}
          domain={config.authDomain}
          audience={config.authAudience}
          redirect-uri={config.siteUrl}
          redirect-path=""
          dev-mode="true"
        >
          <photon-auth-wrapper auto-login="false" hide-loader="false" redirect-path="">
            <photon-prescribe-workflow
              patient-id={syncState.patientId}
              template-ids={templateIds || undefined}
              enable-order="false"
              enable-send-to-patient="true"
              enable-med-history="true"
              enable-med-history-links="true"
              enable-med-history-refill-button="true"
              additional-notes={`Bloom consult ${consult.id} prescription workflow.`}
              hide-patient-card="true"
              optional-patient-address="true"
            />
          </photon-auth-wrapper>
        </photon-client>
      </div>
    )
  }

  return (
    <div className="rx-photon-placeholder" aria-label="Photon workflow setup">
      <div>
        {syncState.status === 'loading' ? <Loader2 className="spin" size={18} /> : null}
        {syncState.status === 'blocked' ? <AlertTriangle size={18} /> : null}
        {syncState.status === 'idle' ? <Pill size={18} /> : null}
        <h3>
          {syncState.status === 'loading'
            ? 'Preparing Photon workflow'
            : syncState.status === 'blocked'
              ? 'Photon setup blocked'
              : 'Photon workflow'}
        </h3>
        <p>
          {error ??
            'Photon Elements will load here, sync the patient, and start the embedded prescribing flow.'}
        </p>
        {syncState.status === 'blocked' ? (
          <button className="secondary-button" onClick={onLoadPhoton} type="button">
            Retry Photon setup
          </button>
        ) : null}
      </div>
    </div>
  )
}

function fallbackMedicationCandidates(consult: Consult): Medication[] {
  if (!consult.draftOrder.medication || consult.draftOrder.medication === 'No prescription drafted') {
    return []
  }

  return [
    {
      name: consult.draftOrder.medication,
      status: 'Draft',
      medicationStatus: 'Candidate',
      effectiveDate: `${consult.draftOrder.daysSupply} days`,
    },
  ]
}

function photonReadinessState(
  syncState: PhotonSyncState,
  elementsReady: boolean,
  config: PhotonPublicConfig | null,
  error: string | null,
): RxReadinessState {
  if (error || syncState.status === 'blocked') return 'blocked'
  if (syncState.status === 'loading') return 'syncing'
  if (syncState.status === 'ready' && elementsReady && config) return 'ready'
  if (elementsReady && config) return 'auth'
  return 'ready'
}

const rxReadinessCopy = {
  syncing: { label: 'Syncing patient', Icon: Loader2 },
  auth: { label: 'Photon auth required', Icon: ExternalLink },
  ready: { label: 'Photon shell ready', Icon: Check },
  blocked: { label: 'Photon blocked', Icon: AlertTriangle },
} satisfies Record<RxReadinessState, { label: string; Icon: typeof Check }>

function formatPrescriptionSummary(consult: Consult, medications: Medication[]) {
  const medicationLines = prescriptionDetailLines(consult, medications).join('\n')
  const order = consult.draftOrder

  return `Prescription addendum
- Prescriptions:
${medicationLines}
- Refills: ${order.refills}
- Patient next step: The patient will receive a text message with a link. She can choose her preferred pharmacy, send the prescription there, and use insurance to cover the prescription.
- Notes: ${order.notes}`
}

function formatPhotonPrescriptionSummary(
  eventType: string,
  detail: unknown,
  consult: Consult,
  fallbackMedications: Medication[],
): PhotonAddendum {
  const medicationNames = uniqueStrings([
    ...extractValuesByKey(detail, ['medication', 'medicationName', 'treatmentName', 'drugName']),
    ...extractLikelyNames(detail),
  ]).slice(0, 6)
  const sig = firstValueByKey(detail, ['sig', 'instructions', 'directions'])
  const quantity = firstValueByKey(detail, ['quantity', 'dispenseQuantity'])
  const refills = firstValueByKey(detail, ['refills', 'fillsAllowed'])
  const pharmacy = firstValueByKey(detail, ['pharmacy', 'pharmacyName'])
  const status = firstValueByKey(detail, ['status', 'state'])
  const fallbackNames = fallbackMedications.map((medication) => medication.name)
  const medications = medicationNames.length > 0 ? medicationNames : fallbackNames
  const medicationDetails =
    medications.length > 0
      ? medications.map((name) => fallbackMedications.find((medication) => medication.name === name) ?? { name })
      : []
  const prescriptionLines = prescriptionDetailLines(consult, medicationDetails)
  const lines = [
    'Prescription addendum',
    prescriptionLines.length > 0 ? `- Prescriptions:\n${prescriptionLines.join('\n')}` : null,
    sig && prescriptionLines.length === 0 ? `- How to take: ${sig}` : null,
    quantity && prescriptionLines.length === 0 ? `- Quantity: ${quantity}` : null,
    refills && prescriptionLines.length === 0 ? `- Refills: ${refills}` : null,
    `- Patient next step: The patient will receive a text message with a link. She can choose her preferred pharmacy, send the prescription there, and use insurance to cover the prescription.`,
    pharmacy ? `- Pharmacy selected in Photon: ${pharmacy}` : null,
    status ? `- Status: ${status}` : null,
  ].filter((line): line is string => Boolean(line))

  return {
    eventType,
    createdAt: new Date().toISOString(),
    summary: lines.join('\n'),
    hasPrescriptionContent: prescriptionLines.length > 0 || medications.length > 0,
  }
}

function prescriptionDetailLines(consult: Consult, medications: Pick<Medication, 'name'>[]) {
  if (medications.length === 0) return []

  return medications.map((medication) => {
    const howToTake = instructionsForMedication(consult, medication.name)
    const order = consult.draftOrder
    return `  - ${medication.name}: ${howToTake}; quantity ${order.quantity}; ${order.refills} refill${
      order.refills === '1' ? '' : 's'
    }.`
  })
}

function instructionsForMedication(consult: Consult, medicationName: string) {
  const normalized = medicationName.toLowerCase()
  const sigParts = consult.draftOrder.sig
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

  if (normalized.includes('estradiol')) {
    return sigParts.find((part) => part.toLowerCase().includes('patch')) ?? consult.draftOrder.sig
  }

  if (normalized.includes('progesterone')) {
    return sigParts.find((part) => part.toLowerCase().includes('progesterone')) ?? consult.draftOrder.sig
  }

  return consult.draftOrder.sig
}

function photonEventLabel(eventType: string) {
  const labels: Record<string, string> = {
    'photon-prescriptions-created': 'Prescription created',
    'photon-prescriptions-closed': 'Prescribing workflow closed',
    'photon-draft-prescription-created': 'Draft prescription created',
    'photon-draft-prescription-deleted': 'Draft prescription deleted',
    'photon-order-error': 'Order error',
    'photon-order-combine-error': 'Order combine error',
  }

  return labels[eventType] ?? eventType.replaceAll('-', ' ')
}

function photonEventSupportsAddendum(eventType: string) {
  return eventType === 'photon-prescriptions-created' || eventType === 'photon-draft-prescription-created'
}

function extractValuesByKey(value: unknown, keys: string[]) {
  const matches: string[] = []
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()))

  walkUnknown(value, (record) => {
    for (const [key, recordValue] of Object.entries(record)) {
      if (!normalizedKeys.has(key.toLowerCase())) continue
      const normalized = primitiveToString(recordValue)
      if (normalized) matches.push(normalized)
    }
  })

  return matches
}

function firstValueByKey(value: unknown, keys: string[]) {
  return extractValuesByKey(value, keys)[0] ?? null
}

function extractLikelyNames(value: unknown) {
  const matches: string[] = []

  walkUnknown(value, (record) => {
    const name = primitiveToString(record.name)
    if (!name) return

    const hasMedicationContext = ['treatment', 'dispense', 'prescription', 'medication'].some(
      (keyPart) => Object.keys(record).some((key) => key.toLowerCase().includes(keyPart)),
    )

    if (hasMedicationContext) matches.push(name)
  })

  return matches
}

function walkUnknown(value: unknown, visit: (record: Record<string, unknown>) => void) {
  const seen = new WeakSet<object>()

  function walk(current: unknown) {
    if (!current || typeof current !== 'object') return
    if (seen.has(current)) return
    seen.add(current)

    if (Array.isArray(current)) {
      current.forEach(walk)
      return
    }

    const record = current as Record<string, unknown>
    visit(record)
    Object.values(record).forEach(walk)
  }

  walk(value)
}

function primitiveToString(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value && typeof value === 'object' && 'name' in value) {
    const named = value as { name?: unknown }
    if (typeof named.name === 'string') return named.name.trim()
  }
  return ''
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function PatientContext({
  consult,
  onInsertExcerpt,
  variant,
}: {
  consult: Consult
  onInsertExcerpt: (excerpt: string) => void
  variant: WorkspaceVariant
}) {
  const contextTabs: ContextTab[] =
    variant === 'v2' ? ['Snapshot', 'Timeline', 'Internal Notes'] : ['Snapshot', 'Timeline', 'Chat History']
  const [activeContextTab, setActiveContextTab] = useState<ContextTab>(
    variant === 'v2' ? 'Internal Notes' : 'Chat History',
  )

  return (
    <section className="patient-context" aria-label="Patient context">
      <div className="context-tabs">
        {contextTabs.map((tab) => (
          <button
            className={activeContextTab === tab ? 'selected' : ''}
            key={tab}
            onClick={() => setActiveContextTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {activeContextTab === 'Snapshot' ? <SnapshotPanel consult={consult} /> : null}
      {activeContextTab === 'Timeline' ? <TimelinePanel consult={consult} /> : null}
      {activeContextTab === 'Chat History' ? (
        <ChatHistoryPanel consult={consult} onInsertExcerpt={onInsertExcerpt} />
      ) : null}
      {activeContextTab === 'Internal Notes' ? <InternalNotesPanel consult={consult} /> : null}
    </section>
  )
}

function SnapshotPanel({ consult }: { consult: Consult }) {
  const activeMedications = consult.ehrMedications
    .filter((medication) => medication.status !== 'Stopped')
    .slice(0, 3)

  return (
    <div className="snapshot-panel">
      <section>
        <h3>Patient</h3>
        <dl>
          <div>
            <dt>Age</dt>
            <dd>{consult.patient.age}</dd>
          </div>
          <div>
            <dt>Stage</dt>
            <dd>{consult.patient.stage}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{consult.patient.location}</dd>
          </div>
        </dl>
      </section>
      <section>
        <h3>Safety</h3>
        <ul>
          {consult.safetyFlags.map((flag) => (
            <li key={flag}>{flag}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Active Meds</h3>
        <ul>
          {activeMedications.map((medication) => (
            <li key={medication.name}>{medication.name}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Recent Labs</h3>
        <ul>
          {consult.labs.slice(0, 3).map((lab) => (
            <li key={lab.name}>
              {lab.name}: {lab.value}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function TimelinePanel({ consult }: { consult: Consult }) {
  const [filter, setFilter] = useState<'all' | 'chat' | 'consult' | 'support'>('all')
  const timelineTypes: Array<{ value: 'all' | 'chat' | 'consult' | 'support'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'chat', label: 'Chat' },
    { value: 'consult', label: 'Consult' },
    { value: 'support', label: 'Support' },
  ]
  const events =
    filter === 'all'
      ? consult.timeline
      : consult.timeline.filter((event) => timelineBucket(event.type) === filter)

  return (
    <div className="timeline-panel">
      <div className="timeline-filters" aria-label="Timeline filters">
        {timelineTypes.map((type) => (
          <button
            className={filter === type.value ? 'selected' : ''}
            key={type.value}
            onClick={() => setFilter(type.value)}
            type="button"
          >
            {type.label}
          </button>
        ))}
      </div>
      <div className="timeline-list">
        {events.map((event) => (
          <article className="timeline-item" key={event.id}>
            <span>{event.time}</span>
            <div>
              <strong>{event.title}</strong>
              <p>{event.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function timelineBucket(type: Consult['timeline'][number]['type']) {
  if (type === 'chat') return 'chat'
  if (type === 'safety') return 'support'
  return 'consult'
}

function MedicationsView({ consult }: { consult: Consult }) {
  return (
    <section className="table-view" aria-label="Medications">
      <label className="search-field medication-search">
        <Search size={15} aria-hidden="true" />
        <input placeholder="Search medications and prescriptions..." type="search" />
      </label>

      <DataTable
        title="Prescribed Through Bloom"
        columns={['Prescription', 'Status', 'Medication status', 'Written date', 'Effective date']}
        rows={consult.prescribedMedications.map((medication) => [
          <span className="table-link" key="name">
            {medication.name}
            <ExternalLink size={13} />
          </span>,
          <StatusPill label={medication.status} key="status" />,
          <StatusPill label={medication.medicationStatus ?? '-'} key="med-status" />,
          medication.writtenDate ?? '-',
          medication.effectiveDate ?? '-',
        ])}
      />

      <DataTable
        title="EHR Medications"
        columns={['name', 'status', 'dosage_instructions', 'start', 'end']}
        rows={consult.ehrMedications.map((medication) => [
          medication.name,
          <StatusPill label={medication.status} key="status" />,
          medication.dosageInstructions ?? '-',
          medication.start ?? '-',
          medication.end ?? '-',
        ])}
      />
    </section>
  )
}

function LabsView({ consult }: { consult: Consult }) {
  return (
    <section className="table-view">
      <DataTable
        title="Recent Labs"
        columns={['name', 'value', 'reference', 'collected', 'status']}
        rows={consult.labs.map((lab) => [
          lab.name,
          lab.value,
          lab.range,
          lab.collected,
          <StatusPill label={lab.status} key="status" />,
        ])}
      />
      <div className="insight-strip">
        <Pill size={15} />
        <span>{consult.activeProblem}</span>
        <ChevronRight size={15} />
        <span>{consult.summary}</span>
      </div>
    </section>
  )
}

function ConditionsView({ consult }: { consult: Consult }) {
  return (
    <section className="table-view">
      <DataTable
        title="Conditions"
        columns={['condition', 'status', 'onset']}
        rows={consult.conditions.map((condition) => [
          condition.name,
          <StatusPill label={condition.status} key="status" />,
          condition.onset,
        ])}
      />
    </section>
  )
}

function NotesView({ consult }: { consult: Consult }) {
  return (
    <section className="notes-view">
      <h2>Longitudinal Notes</h2>
      <article className="timeline-note">
        <div>
          <strong>AI intake summary</strong>
          <span>{consult.receivedAt}</span>
        </div>
        <p>{consult.summary}</p>
      </article>
      <article className="timeline-note">
        <div>
          <strong>Clinician review target</strong>
          <span>{consult.status}</span>
        </div>
        <p>{consult.internalNotes}</p>
      </article>
    </section>
  )
}

function ProceduresView({ consult }: { consult: Consult }) {
  return (
    <section className="empty-view">
      <h2>Procedures</h2>
      <p>No procedures are attached to {consult.patient.name}'s current request.</p>
    </section>
  )
}

function VitalsView({ consult }: { consult: Consult }) {
  return (
    <section className="table-view">
      <DataTable
        title="Vitals"
        columns={['name', 'value', 'date']}
        rows={consult.vitals.map((vital) => [vital.name, vital.value, vital.date])}
      />
    </section>
  )
}

function DataTable({
  title,
  columns,
  rows,
}: {
  title: string
  columns: string[]
  rows: Array<Array<ReactNode>>
}) {
  return (
    <section className="data-section">
      <h2>{title}</h2>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>
                  <span>{column}</span>
                  <ArrowUpDown size={14} aria-hidden="true" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>No records for this request.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function StatusPill({ label }: { label: string }) {
  const tone = label.toLowerCase().replace(/\s+/g, '-')

  return <span className={`status-pill ${tone}`}>{label}</span>
}
