import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { GripVertical, PanelRightClose, PanelRightOpen } from 'lucide-react'

import { agentClient } from '@/agent/client'
import { ClinicalHelper } from '@/components/ClinicalHelper'
import { ClinicalTaskWorkspace, type WorkflowStage } from '@/components/ClinicalTaskWorkspace'
import { PatientQueue } from '@/components/PatientQueue'
import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-media-query'
import { consultsSeed } from '@/data/seed'
import type { AgentActionType, Consult, ThemeMode } from '@/types'

import './App.css'

type MobileScreen = 'queue' | 'task'

function App() {
  const [consults, setConsults] = useState<Consult[]>(consultsSeed)
  const [selectedConsultId, setSelectedConsultId] = useState(consultsSeed[0].id)
  const [filter, setFilter] = useState('')
  const [workflowStage, setWorkflowStage] = useState<WorkflowStage>('note')
  const [mobileScreen, setMobileScreen] = useState<MobileScreen>('queue')
  const [isQueueOpen, setIsQueueOpen] = useState(true)
  const [isHelperOpen, setIsHelperOpen] = useState(true)
  const [isMobileHelperOpen, setIsMobileHelperOpen] = useState(false)
  const [queueWidth, setQueueWidth] = useState(300)
  const [helperWidth, setHelperWidth] = useState(420)
  const [theme, setTheme] = useState<ThemeMode>(() =>
    window.localStorage.getItem('bloom-theme') === 'light' ? 'light' : 'dark',
  )
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(consultsSeed.map((consult) => [consult.id, consult.note])),
  )
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(consultsSeed.map((consult) => [consult.id, consult.requestTitle])),
  )
  const [savedConsultIds, setSavedConsultIds] = useState<Set<string>>(() => new Set())
  const [agentRun, setAgentRun] = useState<AgentActionType | null>(null)
  const [agentError, setAgentError] = useState<string | null>(null)
  const isMobile = useMediaQuery({ max: 900 })

  const selectedConsult = useMemo(
    () => consults.find((consult) => consult.id === selectedConsultId) ?? consults[0],
    [consults, selectedConsultId],
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('bloom-theme', theme)
  }, [theme])

  function selectConsult(id: string) {
    setSelectedConsultId(id)
    setWorkflowStage('note')
    setMobileScreen('task')
    setAgentError(null)
  }

  function resizePanel(event: ReactPointerEvent<HTMLButtonElement>, side: 'left' | 'right') {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = side === 'left' ? queueWidth : helperWidth
    const min = side === 'left' ? 240 : 300
    const max = side === 'left' ? 420 : 560

    function handleMove(moveEvent: PointerEvent) {
      const delta = moveEvent.clientX - startX
      const next = startWidth + (side === 'left' ? delta : -delta)
      const width = Math.min(max, Math.max(min, next))
      if (side === 'left') setQueueWidth(width)
      else setHelperWidth(width)
    }

    function handleUp() {
      document.body.classList.remove('is-resizing')
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    document.body.classList.add('is-resizing')
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  function saveNote() {
    setConsults((current) =>
      current.map((consult) =>
        consult.id === selectedConsult.id
          ? {
              ...consult,
              requestTitle: titleDrafts[consult.id] ?? consult.requestTitle,
              note: noteDrafts[consult.id] ?? consult.note,
              status: consult.status === 'New' ? 'In review' : consult.status,
            }
          : consult,
      ),
    )
    setSavedConsultIds((current) => new Set(current).add(selectedConsult.id))
  }

  async function requestAgentAction(actionType: AgentActionType, prompt?: string) {
    setAgentRun(actionType)
    setAgentError(null)

    try {
      const response = await agentClient.createActionCard({ actionType, consult: selectedConsult, prompt })
      setConsults((current) =>
        current.map((consult) =>
          consult.id === selectedConsult.id
            ? {
                ...consult,
                actionCards: [response.actionCard, ...consult.actionCards],
                agentEvents: [...consult.agentEvents, response.event],
                status: consult.status === 'New' ? 'Draft ready' : consult.status,
              }
            : consult,
        ),
      )
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'Unable to reach the Bloom helper.')
    } finally {
      setAgentRun(null)
    }
  }

  const queue = (
    <PatientQueue
      consults={consults}
      filter={filter}
      selectedId={selectedConsult.id}
      theme={theme}
      onFilterChange={setFilter}
      onSelect={selectConsult}
      onThemeChange={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
    />
  )

  const workspace = (
    <ClinicalTaskWorkspace
      key={selectedConsult.id}
      consult={selectedConsult}
      isMobile={isMobile}
      noteDraft={noteDrafts[selectedConsult.id] ?? selectedConsult.note}
      titleDraft={titleDrafts[selectedConsult.id] ?? selectedConsult.requestTitle}
      stage={workflowStage}
      saved={savedConsultIds.has(selectedConsult.id)}
      queueOpen={isQueueOpen}
      onBackToQueue={() => setMobileScreen('queue')}
      onToggleQueue={() => setIsQueueOpen((current) => !current)}
      onNoteChange={(note) => {
        setNoteDrafts((current) => ({ ...current, [selectedConsult.id]: note }))
        setSavedConsultIds((current) => {
          const next = new Set(current)
          next.delete(selectedConsult.id)
          return next
        })
      }}
      onTitleChange={(title) => {
        setTitleDrafts((current) => ({ ...current, [selectedConsult.id]: title }))
        setSavedConsultIds((current) => {
          const next = new Set(current)
          next.delete(selectedConsult.id)
          return next
        })
      }}
      onSave={saveNote}
      onStageChange={setWorkflowStage}
      onOpenHelper={() => isMobile ? setIsMobileHelperOpen(true) : setIsHelperOpen(true)}
      onComplete={() => {
        setConsults((current) => current.map((consult) => consult.id === selectedConsult.id ? { ...consult, status: 'Completed' } : consult))
        setWorkflowStage('note')
        if (isMobile) setMobileScreen('queue')
      }}
    />
  )

  if (isMobile) {
    return (
      <div className="bloom-mobile-shell">
        {mobileScreen === 'queue' ? queue : workspace}
        <ClinicalHelper
          consult={selectedConsult}
          error={agentError}
          isMobile
          open={isMobileHelperOpen}
          runningAction={agentRun}
          onOpenChange={setIsMobileHelperOpen}
          onRequestAction={requestAgentAction}
        />
      </div>
    )
  }

  const desktopStyle = { '--queue-width': `${queueWidth}px`, '--helper-width': `${helperWidth}px` } as CSSProperties

  return (
    <div className={`bloom-desktop-shell ${isQueueOpen ? 'queue-open' : 'queue-closed'} ${isHelperOpen ? 'helper-open' : 'helper-closed'}`} style={desktopStyle} data-ui-variant="v3">
      {isQueueOpen ? <>{queue}<button className="panel-resizer queue-resizer" onPointerDown={(event) => resizePanel(event, 'left')} type="button" aria-label="Resize patient queue"><GripVertical /></button></> : null}
      {workspace}
      {isHelperOpen ? (
        <>
          <button className="panel-resizer helper-resizer" onPointerDown={(event) => resizePanel(event, 'right')} type="button" aria-label="Resize right sidebar"><GripVertical /></button>
          <ClinicalHelper consult={selectedConsult} error={agentError} open runningAction={agentRun} onOpenChange={setIsHelperOpen} onRequestAction={requestAgentAction} onOpenPrescription={() => setWorkflowStage('photon')} />
        </>
      ) : (
        <Button
          className="helper-rail-toggle"
          variant="outline"
          size="icon"
          onClick={() => setIsHelperOpen(true)}
          aria-label="Open clinical helper"
        >
          <PanelRightOpen />
        </Button>
      )}
      {isHelperOpen ? (
        <Button
          className="helper-close-toggle"
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsHelperOpen(false)}
          aria-label="Close clinical helper"
        >
          <PanelRightClose />
        </Button>
      ) : null}
    </div>
  )
}

export default App
