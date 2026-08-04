import { ArrowLeft, Check, ChevronRight, FileText, MessageSquareText, MoreHorizontal, Pill, Save, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { PhotonPrescription } from '@/components/PhotonPrescription'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetDescription, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { Consult } from '@/types'

export type WorkflowStage = 'note' | 'review' | 'photon'

export function ClinicalTaskWorkspace({
  consult,
  isMobile,
  noteDraft,
  titleDraft,
  stage,
  saved,
  onBackToQueue,
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
  onBackToQueue: () => void
  onNoteChange: (value: string) => void
  onTitleChange: (value: string) => void
  onSave: () => void
  onStageChange: (stage: WorkflowStage) => void
  onOpenHelper: () => void
  onComplete: () => void
}) {
  const [optionsOpen, setOptionsOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const stageLabel = stage === 'note' ? 'Note' : stage === 'photon' ? 'Prescribe' : 'Review AVS'

  return (
    <main className="clinical-workspace">
      <header className="clinical-topbar">
        <div className="clinical-topbar-leading">
          {isMobile ? (
            <Button variant="ghost" size="icon-sm" onClick={onBackToQueue} aria-label="Back to patient queue"><ArrowLeft /></Button>
          ) : null}
          <div><strong>{consult.patient.name}</strong><span>{isMobile ? stageLabel : `${consult.patient.age} · ${consult.patient.stage}`}</span></div>
        </div>
        {!isMobile ? <div className="workflow-progress" aria-label="Clinical task progress"><span data-active={stage === 'note' || undefined}>Note</span><ChevronRight /><span data-active={stage === 'photon' || undefined}>Prescribe</span><ChevronRight /><span data-active={stage === 'review' || undefined}>AVS</span></div> : null}
        {isMobile ? <Button variant="ghost" size="icon-sm" onClick={() => setOptionsOpen(true)} aria-label="Task options"><MoreHorizontal /></Button> : <Badge variant={consult.priority === 'Urgent' ? 'error' : 'secondary'}>{consult.priority}</Badge>}
      </header>

      {stage === 'note' ? (
        <ScrollArea className="task-scroll" scrollFade>
          <div className="task-canvas">
            <section className="task-title-block">
              <span className="section-kicker">Patient task</span>
              <textarea
                className="task-title-input"
                value={titleDraft}
                onChange={(event) => onTitleChange(event.target.value)}
                aria-label="Request title"
                rows={2}
              />
              <div className="patient-metadata">
                <span>{consult.requestType}</span><span>{consult.receivedAt}</span><span>{consult.patient.location}</span>
              </div>
            </section>

            {isMobile ? (
              <section className="note-editor-block mobile-note-editor">
                <div className="section-row"><div><h2>Clinical note</h2></div>{saved ? <span className="saved-state"><Check /> Saved</span> : null}</div>
                <Textarea value={noteDraft} onChange={(event) => onNoteChange(event.target.value)} aria-label="Clinical note" className="clinical-note-editor" />
              </section>
            ) : <Tabs defaultValue="note" className="clinical-tabs">
              <TabsList variant="underline" aria-label="Clinical task sections">
                <TabsTab value="note"><FileText /> Note</TabsTab>
                <TabsTab value="context">Patient context</TabsTab>
              </TabsList>
              <TabsPanel value="note">
                <section className="note-editor-block">
                  <div className="section-row"><div><h2>Clinical note</h2><p>AI-drafted content remains directly editable.</p></div>{saved ? <span className="saved-state"><Check /> Saved</span> : null}</div>
                  <Textarea value={noteDraft} onChange={(event) => onNoteChange(event.target.value)} aria-label="Clinical note" className="clinical-note-editor" />
                </section>
              </TabsPanel>
              <TabsPanel value="context">
                <PatientContext consult={consult} />
              </TabsPanel>
            </Tabs>}
          </div>
        </ScrollArea>
      ) : null}

      {stage === 'review' ? <ArtifactReview consult={consult} noteDraft={noteDraft} /> : null}
      {stage === 'photon' ? <PhotonPrescription consult={consult} onReviewAvs={() => onStageChange('review')} /> : null}

      {stage !== 'photon' ? <footer className="task-action-bar">
        {stage === 'note' ? (
          <>
            {!isMobile ? <><Button variant="ghost" onClick={onOpenHelper}><Sparkles /> Ask helper</Button><span className="action-spacer" /><Button variant="outline" onClick={onSave}><Save /> Save note</Button></> : null}
            <Button className="bloom-primary-action" onClick={() => { onSave(); onStageChange('photon') }}><Pill /> Continue to prescribe</Button>
          </>
        ) : null}
        {stage === 'review' ? (
          <>
            {!isMobile ? <><Button variant="ghost" onClick={() => onStageChange('photon')}><ArrowLeft /> Return to prescription</Button><span className="action-spacer" /></> : null}
            <Button className="bloom-primary-action" onClick={onComplete}><Check /> Complete task</Button>
          </>
        ) : null}
      </footer> : null}

      {isMobile ? <>
        <Sheet open={optionsOpen} onOpenChange={setOptionsOpen}>
          <SheetPopup side="bottom" className="mobile-task-sheet">
            <SheetHeader><SheetTitle>Task options</SheetTitle><SheetDescription>Secondary tools stay out of the clinical workflow.</SheetDescription></SheetHeader>
            <SheetPanel className="mobile-task-options">
              <Button variant="ghost" onClick={() => { onSave(); setOptionsOpen(false) }}><Save /> Save note</Button>
              <Button variant="ghost" onClick={() => { setOptionsOpen(false); setContextOpen(true) }}><FileText /> Patient context</Button>
              <Button variant="ghost" onClick={() => { setOptionsOpen(false); onOpenHelper() }}><Sparkles /> Ask clinical helper</Button>
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

function ArtifactReview({ consult, noteDraft }: { consult: Consult; noteDraft: string }) {
  const firstName = consult.patient.name.split(' ')[0]
  return (
    <ScrollArea className="task-scroll" scrollFade>
      <div className="task-canvas review-canvas">
        <section className="task-title-block"><span className="section-kicker">Review patient materials</span><h1>AVS and follow-up are ready</h1><p>Confirm patient-facing language after the prescription workflow.</p></section>
        <div className="artifact-layout">
          <nav className="artifact-nav" aria-label="Generated artifacts">
            <button type="button" data-selected="true"><span><FileText /> After Visit Summary</span><Badge variant="success">Ready</Badge></button>
            <button type="button"><span><MessageSquareText /> Follow-up</span><Badge variant="success">Ready</Badge></button>
            <button type="button"><span><Pill /> Medication summary</span><Badge variant="warning">Review</Badge></button>
          </nav>
          <article className="artifact-document">
            <span className="section-kicker">After Visit Summary</span>
            <h2>Your care plan</h2>
            <p>{firstName}, today we reviewed {consult.requestTitle.toLowerCase()}.</p>
            <Separator />
            <h3>What we discussed</h3>
            <p>{noteDraft.split('\n').filter(Boolean).slice(0, 2).join(' ') || consult.summary}</p>
            <h3>Next steps</h3>
            <ul>{consult.followUps.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
            <h3>When to contact us</h3>
            <p>Message Bloom if symptoms worsen, new side effects develop, or you have questions before follow-up.</p>
          </article>
        </div>
      </div>
    </ScrollArea>
  )
}

function PatientContext({ consult }: { consult: Consult }) {
  return (
    <section className="patient-context-grid">
      <div><span className="section-kicker">Summary</span><p>{consult.summary}</p></div>
      <div><span className="section-kicker">Safety review</span><ul>{consult.safetyFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul></div>
      <div><span className="section-kicker">Active medications</span><ul>{consult.ehrMedications.slice(0, 4).map((medication) => <li key={medication.name}>{medication.name}</li>)}</ul></div>
      <div><span className="section-kicker">Recent labs</span><ul>{consult.labs.slice(0, 4).map((lab) => <li key={lab.name}>{lab.name}: {lab.value}</li>)}</ul></div>
    </section>
  )
}
