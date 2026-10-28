import { ArrowLeft, Bold, Check, ChevronLeft, ChevronRight, FileText, GripHorizontal, Italic, Link, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Pill, Save, Sparkles, Underline, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

import { PhotonPrescription } from '@/components/PhotonPrescription'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Frame, FrameHeader, FramePanel, FrameTitle } from '@/components/ui/frame'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetDescription, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Toolbar, ToolbarButton, ToolbarGroup } from '@/components/ui/toolbar'
import type { Consult } from '@/types'

export type WorkflowStage = 'note' | 'photon'
type WorkspaceSection = 'Request' | 'Conditions' | 'Labs' | 'Medications' | 'Notes' | 'Procedures' | 'Vitals'
type ContextSection = 'Snapshot' | 'Timeline' | 'Notes'
const workspaceSections: WorkspaceSection[] = ['Request', 'Conditions', 'Labs', 'Medications', 'Notes', 'Procedures', 'Vitals']

export function ClinicalTaskWorkspace({
  consult,
  isMobile,
  noteDraft,
  titleDraft,
  stage,
  saved,
  queueOpen,
  onBackToQueue,
  onToggleQueue,
  onNoteChange,
  onTitleChange,
  onSave,
  onStageChange,
  onOpenHelper,
  onComplete,
}: {
  consult: Consult
  isMobile: boolean
  noteDraft: string
  titleDraft: string
  stage: WorkflowStage
  saved: boolean
  queueOpen: boolean
  onBackToQueue: () => void
  onToggleQueue: () => void
  onNoteChange: (value: string) => void
  onTitleChange: (value: string) => void
  onSave: () => void
  onStageChange: (stage: WorkflowStage) => void
  onOpenHelper: () => void
  onComplete: () => void
}) {
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [workspaceSection, setWorkspaceSection] = useState<WorkspaceSection>('Request')
  const [contextSection, setContextSection] = useState<ContextSection>('Snapshot')
  const [contextHeight, setContextHeight] = useState(230)
  const [completion, setCompletion] = useState<{ consultId: string; status: 'idle' | 'loading' | 'complete' }>({ consultId: consult.id, status: 'idle' })
  const [avs, setAvs] = useState<{ consultId: string; status: 'idle' | 'loading' | 'ready' | 'reviewed'; content: string }>({ consultId: consult.id, status: 'idle', content: '' })
  const noteEditorRef = useRef<HTMLTextAreaElement>(null)
  const noteHistoryRef = useRef<string[]>([])
  const workspaceNavRef = useRef<HTMLElement>(null)
  const [canScrollWorkspaceLeft, setCanScrollWorkspaceLeft] = useState(false)
  const [canScrollWorkspaceRight, setCanScrollWorkspaceRight] = useState(false)
  const stageLabel = stage === 'note' ? 'Note' : 'Prescribe'
  const genderMarker = consult.patient.pronouns.toLowerCase().includes('she') ? 'F' : consult.patient.pronouns.toLowerCase().includes('he') ? 'M' : ''
  const uterusStatus = getUterusStatus(consult)
  const completionState = completion.consultId === consult.id ? completion.status : 'idle'
  const avsState = avs.consultId === consult.id ? avs.status : 'idle'
  const avsDraft = avs.consultId === consult.id ? avs.content : ''

  useEffect(() => { noteHistoryRef.current = [] }, [consult.id])

  useEffect(() => {
    const navigation = workspaceNavRef.current
    if (!navigation) return

    function updateOverflowControls() {
      if (!navigation) return
      setCanScrollWorkspaceLeft(navigation.scrollLeft > 1)
      setCanScrollWorkspaceRight(navigation.scrollLeft + navigation.clientWidth < navigation.scrollWidth - 1)
    }

    updateOverflowControls()
    navigation.addEventListener('scroll', updateOverflowControls, { passive: true })
    const observer = new ResizeObserver(updateOverflowControls)
    observer.observe(navigation)
    return () => {
      navigation.removeEventListener('scroll', updateOverflowControls)
      observer.disconnect()
    }
  }, [isMobile])

  function scrollWorkspaceNavigation(direction: -1 | 1) {
    const navigation = workspaceNavRef.current
    if (!navigation) return
    navigation.scrollBy({ left: direction * Math.max(140, navigation.clientWidth * 0.65), behavior: 'smooth' })
  }

  function resizeContext(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault()
    const startY = event.clientY
    const startHeight = contextHeight
    function handleMove(moveEvent: PointerEvent) { setContextHeight(Math.min(420, Math.max(170, startHeight + startY - moveEvent.clientY))) }
    function handleUp() { document.body.classList.remove('is-resizing'); window.removeEventListener('pointermove', handleMove); window.removeEventListener('pointerup', handleUp) }
    document.body.classList.add('is-resizing')
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  function formatNote(prefix: string, suffix = prefix) {
    const editor = noteEditorRef.current
    if (!editor) return
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const selection = noteDraft.slice(start, end)
    const replacement = `${prefix}${selection}${suffix}`
    updateNote(`${noteDraft.slice(0, start)}${replacement}${noteDraft.slice(end)}`)
    window.requestAnimationFrame(() => {
      editor.focus()
      editor.setSelectionRange(start + prefix.length, start + prefix.length + selection.length)
    })
  }

  function updateNote(value: string) {
    if (value === noteDraft) return
    if (noteHistoryRef.current.at(-1) !== noteDraft) noteHistoryRef.current.push(noteDraft)
    noteHistoryRef.current = noteHistoryRef.current.slice(-50)
    onNoteChange(value)
  }

  function addLink() {
    const editor = noteEditorRef.current
    if (!editor) return
    const start = editor.selectionStart
    const end = editor.selectionEnd
    const selection = noteDraft.slice(start, end) || 'link text'
    const replacement = `[${selection}](https://)`
    updateNote(`${noteDraft.slice(0, start)}${replacement}${noteDraft.slice(end)}`)
    window.requestAnimationFrame(() => {
      editor.focus()
      const urlStart = start + selection.length + 3
      editor.setSelectionRange(urlStart, urlStart + 8)
    })
  }

  function undoNote() {
    const previous = noteHistoryRef.current.pop()
    if (previous === undefined) return
    onNoteChange(previous)
    window.requestAnimationFrame(() => noteEditorRef.current?.focus())
  }

  function saveAndComplete() {
    if (completionState !== 'idle') return
    setCompletion({ consultId: consult.id, status: 'loading' })
    onSave()
    window.setTimeout(() => {
      onComplete()
      setCompletion({ consultId: consult.id, status: 'complete' })
    }, 800)
  }

  function generateAvs() {
    if (avsState === 'loading') return
    setAvs({ consultId: consult.id, status: 'loading', content: avsDraft })
    window.setTimeout(() => setAvs({ consultId: consult.id, status: 'ready', content: createAvsDraft(consult, noteDraft) }), 700)
  }

  return (
    <main className="clinical-workspace">
      <header className="clinical-topbar">
        <div className="clinical-topbar-leading">
          {isMobile ? (
            <Button variant="ghost" size="icon-sm" onClick={onBackToQueue} aria-label="Back to patient queue"><ArrowLeft /></Button>
          ) : <Button variant="ghost" size="icon-sm" onClick={onToggleQueue} aria-label={queueOpen ? 'Hide patient queue' : 'Show patient queue'}>{queueOpen ? <PanelLeftClose /> : <PanelLeftOpen />}</Button>}
          <div><strong>{consult.patient.name}</strong>{isMobile ? <span>{stageLabel}</span> : null}</div>
        </div>
        {!isMobile ? (
          <div className="workspace-section-navigation">
            <Button className="workspace-scroll-control" data-visible={canScrollWorkspaceLeft || undefined} variant="ghost" size="icon-xs" onClick={() => scrollWorkspaceNavigation(-1)} aria-label="Scroll patient sections left"><ChevronLeft aria-hidden="true" /></Button>
            <nav ref={workspaceNavRef} className="workspace-button-menu workspace-section-tabs" aria-label="Patient workspace sections">
              {workspaceSections.map((section) => <Button variant="ghost" size="xs" key={section} data-selected={workspaceSection === section || undefined} onClick={(event) => { setWorkspaceSection(section); event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }) }}>{section}</Button>)}
            </nav>
            <Button className="workspace-scroll-control" data-visible={canScrollWorkspaceRight || undefined} variant="ghost" size="icon-xs" onClick={() => scrollWorkspaceNavigation(1)} aria-label="Scroll patient sections right"><ChevronRight aria-hidden="true" /></Button>
          </div>
        ) : null}
        {isMobile ? <div className="mobile-topbar-actions"><Badge variant={consult.priority === 'Urgent' ? 'error' : 'secondary'}>{consult.priority}</Badge><Button variant="ghost" size="icon-sm" onClick={() => setOptionsOpen(true)} aria-label="Task options"><MoreHorizontal /></Button></div> : <Badge variant={consult.priority === 'Urgent' ? 'error' : 'secondary'}>{consult.priority}</Badge>}
      </header>

      {stage === 'note' && workspaceSection === 'Request' ? (
        <div className={isMobile ? 'mobile-request-stack' : 'desktop-request-stack'} style={!isMobile ? { '--context-height': `${contextHeight}px` } as CSSProperties : undefined}>
          <ScrollArea className="task-scroll" scrollFade>
            <div className="task-canvas request-task-canvas">
              <section className="task-title-block compact-request-heading">
                <div className="request-heading-row">
                  <div className="request-heading-copy">
                    <textarea className="task-title-input" value={titleDraft} onChange={(event) => onTitleChange(event.target.value)} aria-label="Request title" rows={isMobile ? 2 : 1} />
                  </div>
                  {!isMobile ? <div className="request-heading-actions"><Button variant="ghost" size="xs" onClick={onSave}>Save</Button><Button className="bloom-complete-action" data-complete={completionState === 'complete' || undefined} variant="outline" size="xs" loading={completionState === 'loading'} onClick={saveAndComplete} disabled={completionState === 'complete'}>{completionState === 'complete' ? <><Check aria-hidden="true" /> Completed</> : 'Save and Complete'}</Button></div> : null}
                </div>
                <div className="patient-metadata rich-patient-metadata">
                  <span>{consult.patient.age}{genderMarker}</span><span>{consult.patient.stage}</span><span>{consult.receivedAt}</span><span>{consult.patient.location}</span><Badge variant={uterusStatus === 'IUD present' ? 'info' : uterusStatus === 'Uterus surgically absent' ? 'warning' : 'outline'}>{uterusStatus}</Badge>
                </div>
              </section>
              <section className={isMobile ? 'note-editor-block mobile-note-editor' : 'note-editor-block'}>
                <Toolbar className="clinical-format-toolbar" aria-label="Note formatting">
                  <ToolbarGroup>
                    <ToolbarButton render={<Button variant="ghost" size="icon-sm" />} onClick={() => formatNote('**')} aria-label="Bold"><Bold /></ToolbarButton>
                    <ToolbarButton render={<Button variant="ghost" size="icon-sm" />} onClick={() => formatNote('_')} aria-label="Italic"><Italic /></ToolbarButton>
                    <ToolbarButton render={<Button variant="ghost" size="icon-sm" />} onClick={() => formatNote('<u>', '</u>')} aria-label="Underline"><Underline /></ToolbarButton>
                    <ToolbarButton render={<Button variant="ghost" size="icon-sm" />} onClick={addLink} aria-label="Add link"><Link /></ToolbarButton>
                    <ToolbarButton render={<Button variant="ghost" size="icon-sm" />} onClick={undoNote} disabled={noteHistoryRef.current.length === 0} aria-label="Undo"><Undo2 /></ToolbarButton>
                  </ToolbarGroup>
                  <span className="format-toolbar-spacer" />
                  {saved ? <span className="saved-state"><Check /> Saved</span> : null}
                </Toolbar>
                <Textarea ref={noteEditorRef} value={noteDraft} onChange={(event) => updateNote(event.target.value)} aria-label="Clinical note" className="clinical-note-editor" />
              </section>
              <section className="inline-avs-generator" aria-label="After Visit Summary generation">
                <div><strong>After Visit Summary</strong><p>Generate patient-ready instructions from the current note.</p></div>
                <Button variant="outline" size="xs" loading={avsState === 'loading'} onClick={generateAvs}>{avsState === 'ready' || avsState === 'reviewed' ? 'Regenerate AVS' : 'Generate AVS'}</Button>
              </section>
              {avsState === 'ready' || avsState === 'reviewed' ? <section className="inline-avs-editor" aria-live="polite"><Textarea size="sm" value={avsDraft} onChange={(event) => setAvs({ consultId: consult.id, status: 'ready', content: event.target.value })} aria-label="After Visit Summary editor" /><footer><span>{avsState === 'reviewed' ? 'Reviewed and ready for the patient.' : 'Edit the patient-facing summary before marking it reviewed.'}</span><Button className="bloom-complete-action" data-complete={avsState === 'reviewed' || undefined} variant="outline" size="xs" onClick={() => setAvs({ consultId: consult.id, status: 'reviewed', content: avsDraft })} disabled={avsState === 'reviewed'}>{avsState === 'reviewed' ? <><Check aria-hidden="true" /> Reviewed</> : 'Mark as reviewed'}</Button></footer></section> : null}
            </div>
          </ScrollArea>
          {!isMobile ? <><button className="context-resizer" type="button" onPointerDown={resizeContext} aria-label="Resize patient context"><GripHorizontal /></button><DesktopPatientContext consult={consult} activeSection={contextSection} onSectionChange={setContextSection} /></> : null}
        </div>
      ) : null}

      {stage === 'note' && workspaceSection !== 'Request' ? <WorkspaceDataView consult={consult} section={workspaceSection} /> : null}

      {stage === 'photon' ? <PhotonPrescription consult={consult} onReturnToNote={() => onStageChange('note')} /> : null}

      {isMobile && stage === 'note' && workspaceSection === 'Request' ? <footer className="task-action-bar"><Button className="bloom-primary-action" onClick={() => { onSave(); onStageChange('photon') }}><Pill /> Continue to prescribe</Button></footer> : null}

      {isMobile ? <>
        <Sheet open={optionsOpen} onOpenChange={setOptionsOpen}>
          <SheetPopup side="bottom" className="mobile-task-sheet">
            <SheetHeader><SheetTitle>Task options</SheetTitle><SheetDescription>Secondary tools stay out of the clinical workflow.</SheetDescription></SheetHeader>
            <SheetPanel className="mobile-task-options">
              <Button variant="ghost" onClick={() => { onSave(); setOptionsOpen(false) }}><Save /> Save note</Button>
              <Button variant="ghost" onClick={() => { setOptionsOpen(false); setContextOpen(true) }}><FileText /> Patient context</Button>
              <Button variant="ghost" onClick={() => { setOptionsOpen(false); onOpenHelper() }}><Sparkles /> Ask clinical helper</Button>
              <Separator />
              <span className="section-kicker">Patient chart</span>
              <nav className="mobile-chart-sections" aria-label="Mobile patient workspace sections">{workspaceSections.map((section) => <button type="button" key={section} data-selected={workspaceSection === section || undefined} onClick={() => { onStageChange('note'); setWorkspaceSection(section); setOptionsOpen(false) }}>{section}</button>)}</nav>
            </SheetPanel>
          </SheetPopup>
        </Sheet>
        <Sheet open={contextOpen} onOpenChange={setContextOpen}>
          <SheetPopup side="bottom" className="mobile-context-sheet">
            <SheetHeader><SheetTitle>Patient context</SheetTitle><SheetDescription>{consult.patient.name} · supporting clinical details</SheetDescription></SheetHeader>
            <SheetPanel><PatientContext consult={consult} /></SheetPanel>
          </SheetPopup>
        </Sheet>
      </> : null}
    </main>
  )
}

function DesktopPatientContext({ consult, activeSection, onSectionChange }: { consult: Consult; activeSection: ContextSection; onSectionChange: (section: ContextSection) => void }) {
  return (
    <section className="desktop-patient-context" aria-label="Patient context">
      <nav className="workspace-button-menu context-section-menu" aria-label="Patient context sections">{(['Snapshot', 'Timeline', 'Notes'] as ContextSection[]).map((section) => <Button key={section} variant="ghost" size="xs" data-selected={activeSection === section || undefined} onClick={() => onSectionChange(section)}>{section}</Button>)}</nav>
      <div className="context-panel-content">{activeSection === 'Snapshot' ? <PatientContext consult={consult} /> : activeSection === 'Timeline' ? <div className="context-timeline">{consult.timeline.map((event) => <article key={event.id}><time>{event.time}</time><div><strong>{event.title}</strong><p>{event.detail}</p></div></article>)}</div> : <div className="context-notes"><span className="section-kicker">Internal notes</span><p>{consult.internalNotes}</p></div>}</div>
    </section>
  )
}

function WorkspaceDataView({ consult, section }: { consult: Consult; section: Exclude<WorkspaceSection, 'Request'> }) {
  const rows = section === 'Conditions'
    ? consult.conditions.map((item) => [item.name, item.status, item.onset])
    : section === 'Labs'
      ? consult.labs.map((item) => [item.name, item.value, item.collected])
      : section === 'Medications'
        ? consult.ehrMedications.map((item) => [item.name, item.status, item.dosageInstructions ?? item.effectiveDate ?? '—'])
        : section === 'Vitals'
          ? consult.vitals.map((item) => [item.name, item.value, item.date])
          : section === 'Notes'
            ? [['Internal note', consult.internalNotes, consult.patient.lastVisit]]
            : []
  return (
    <ScrollArea className="task-scroll" scrollFade>
      <section className="workspace-data-view">
        <div className="workspace-data-heading"><span className="section-kicker">Patient chart</span><h1>{section}</h1><p>{consult.patient.name} · longitudinal clinical information</p></div>
        {rows.length > 0 ? <div className="workspace-data-list">{rows.map((row, index) => <article key={`${row[0]}-${index}`}><strong>{row[0]}</strong><span>{row[1]}</span><small>{row[2]}</small></article>)}</div> : <div className="workspace-empty-state"><FileText /><strong>No procedures recorded</strong><p>There are no procedures attached to this patient task.</p></div>}
      </section>
    </ScrollArea>
  )
}

function getUterusStatus(consult: Consult) {
  const context = [consult.note, consult.summary, consult.activeProblem, consult.internalNotes, ...consult.tags, ...consult.safetyFlags, ...consult.conditions.map((condition) => condition.name), ...consult.chat.flatMap((message) => message.body)].join(' ').toLowerCase()
  if (context.includes('iud') || context.includes('intrauterine device')) return 'IUD present'
  const intact = context.includes('uterus present') || context.includes('uterus is present') || context.includes('still have my uterus') || context.includes('no uterus removed')
  if (!intact && (context.includes('hysterectomy') || context.includes('surgically absent') || context.includes('uterus absent') || context.includes('uterus removed') || /\bno uterus\b/.test(context))) return 'Uterus surgically absent'
  return 'Uterus intact'
}

function createAvsDraft(consult: Consult, noteDraft: string) {
  const firstName = consult.patient.name.split(' ')[0]
  const discussion = noteDraft.split('\n').map((line) => line.trim()).filter((line) => line && !['Subjective', 'Objective', 'Assessment', 'Plan'].includes(line)).slice(0, 2).join(' ')
  const nextSteps = consult.followUps.slice(0, 3).map((item) => `- ${item}`).join('\n')
  return `${firstName}, today we reviewed ${consult.requestTitle.toLowerCase()}.\n\nWhat we discussed\n${discussion || consult.summary}\n\nNext steps\n${nextSteps}\n\nWhen to contact us\nMessage Bloom if symptoms worsen, new side effects develop, or you have questions before follow-up.`
}

function PatientContext({ consult }: { consult: Consult }) {
  return (
    <section className="patient-context-grid">
      <ContextFrame title="Patient"><dl className="patient-context-details"><div><dt>Age</dt><dd>{consult.patient.age}</dd></div><div><dt>Stage</dt><dd>{consult.patient.stage}</dd></div><div><dt>Location</dt><dd>{consult.patient.location}</dd></div></dl></ContextFrame>
      <ContextFrame title="Safety"><ul>{consult.safetyFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul></ContextFrame>
      <ContextFrame title="Active Meds"><ul>{consult.ehrMedications.filter((medication) => medication.status !== 'Stopped').slice(0, 3).map((medication) => <li key={medication.name}>{medication.name}</li>)}</ul></ContextFrame>
    </section>
  )
}

function ContextFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Frame className="context-frame">
      <FrameHeader><FrameTitle>{title}</FrameTitle></FrameHeader>
      <FramePanel>{children}</FramePanel>
    </Frame>
  )
}
