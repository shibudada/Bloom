import { AlertTriangle, FileText, Loader2, Pill, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetDescription, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'
import type { AgentActionType, Consult } from '@/types'

export function ClinicalHelper({
  consult,
  error,
  isMobile = false,
  open,
  runningAction,
  onOpenChange,
  onRequestAction,
  onOpenPrescription,
}: {
  consult: Consult
  error: string | null
  isMobile?: boolean
  open: boolean
  runningAction: AgentActionType | null
  onOpenChange: (open: boolean) => void
  onRequestAction: (action: AgentActionType, prompt?: string) => void
  onOpenPrescription?: () => void
}) {
  const [prompt, setPrompt] = useState('')
  const [desktopTab, setDesktopTab] = useState<'copilot' | 'chat' | 'prescription'>('copilot')
  const content = (
    <HelperContent consult={consult} error={error} prompt={prompt} runningAction={runningAction} onPromptChange={setPrompt} onRequestAction={onRequestAction} />
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetPopup side="bottom" className="mobile-helper-sheet">
          <SheetHeader><SheetTitle>Clinical helper</SheetTitle><SheetDescription>Optional drafting support for this patient task.</SheetDescription></SheetHeader>
          <SheetPanel>{content}</SheetPanel>
        </SheetPopup>
      </Sheet>
    )
  }

  return (
    <aside className="clinical-helper" aria-label="Clinical utility sidebar">
      <Tabs value={desktopTab} onValueChange={(value) => setDesktopTab(value as typeof desktopTab)} className="utility-tabs">
        <TabsList variant="underline" aria-label="Clinical utility sections">
          <TabsTab value="copilot">Copilot</TabsTab>
          <TabsTab value="chat">Chat history</TabsTab>
          <TabsTab value="prescription">Prescription console</TabsTab>
        </TabsList>
        <TabsPanel value="copilot">{content}</TabsPanel>
        <TabsPanel value="chat"><ChatHistory consult={consult} /></TabsPanel>
        <TabsPanel value="prescription"><PrescriptionConsole consult={consult} onOpenPrescription={onOpenPrescription} /></TabsPanel>
      </Tabs>
    </aside>
  )
}

function ChatHistory({ consult }: { consult: Consult }) {
  return (
    <ScrollArea className="utility-panel-scroll" scrollFade>
      <div className="chat-history-list">
        {consult.chat.map((message) => <article key={message.id}><div><strong>{message.name}</strong><span>{message.time}</span></div>{message.body.map((line) => <p key={line}>{line}</p>)}</article>)}
      </div>
    </ScrollArea>
  )
}

function PrescriptionConsole({ consult, onOpenPrescription }: { consult: Consult; onOpenPrescription?: () => void }) {
  const order = consult.draftOrder
  return (
    <ScrollArea className="utility-panel-scroll" scrollFade>
      <section className="prescription-console">
        <div><span className="section-kicker">Draft order</span><h2>{order.medication}</h2><p>{order.sig}</p></div>
        <dl><dt>Quantity</dt><dd>{order.quantity}</dd><dt>Refills</dt><dd>{order.refills}</dd><dt>Days supply</dt><dd>{order.daysSupply}</dd><dt>Pharmacy</dt><dd>{order.pharmacy}</dd><dt>Substitutions</dt><dd>{order.substitutions}</dd></dl>
        <Button className="bloom-primary-action" onClick={onOpenPrescription} disabled={!onOpenPrescription}><Pill /> Open prescribe</Button>
      </section>
    </ScrollArea>
  )
}

function HelperContent({ consult, error, prompt, runningAction, onPromptChange, onRequestAction }: {
  consult: Consult
  error: string | null
  prompt: string
  runningAction: AgentActionType | null
  onPromptChange: (value: string) => void
  onRequestAction: (action: AgentActionType, prompt?: string) => void
}) {
  const latestCard = consult.actionCards[0]
  return (
    <div className="helper-content">
      <header className="helper-heading"><div><span className="section-kicker">Optional assistant</span><h2>Clinical helper</h2></div><Sparkles /></header>
      <p className="helper-description">Use the helper for a revision, safety summary, or alternate plan. The clinical task remains primary.</p>
      <div className="helper-quick-actions">
        <Button variant="outline" onClick={() => onRequestAction('draft_plan')} disabled={runningAction !== null}><FileText /> Draft plan</Button>
        <Button variant="outline" onClick={() => onRequestAction('draft_prescription')} disabled={runningAction !== null}><Pill /> Draft prescription</Button>
      </div>
      <ScrollArea className="helper-results" scrollFade>
        {runningAction ? <div className="helper-state"><Loader2 className="spin" /><strong>Preparing structured draft</strong><p>Reviewing the visible patient context.</p></div> : null}
        {error ? <div className="helper-state error"><AlertTriangle /><strong>Helper unavailable</strong><p>{error}</p></div> : null}
        {!runningAction && !error && latestCard ? (
          <article className="helper-card">
            <div className="helper-card-heading"><Badge variant="info">{latestCard.type === 'draft_plan' ? 'Plan draft' : 'Prescription draft'}</Badge><span>{latestCard.status}</span></div>
            <h3>{latestCard.title}</h3><p>{latestCard.rationale}</p>
            {latestCard.type === 'draft_plan' ? latestCard.sections.slice(0, 2).map((section) => <section key={section.heading}><strong>{section.heading}</strong><ul>{section.items.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></section>) : <dl><dt>Medication</dt><dd>{latestCard.order.medication}</dd><dt>Sig</dt><dd>{latestCard.order.sig}</dd></dl>}
          </article>
        ) : null}
        {!runningAction && !error && !latestCard ? <div className="helper-empty"><Sparkles /><p>Ask for help when the note needs another pass.</p></div> : null}
      </ScrollArea>
      <form className="helper-composer" onSubmit={(event) => { event.preventDefault(); if (!prompt.trim()) return; onRequestAction('draft_plan', prompt.trim()); onPromptChange('') }}>
        <Input nativeInput value={prompt} onChange={(event) => onPromptChange(event.target.value)} placeholder="Ask Bloom" aria-label="Ask clinical helper" />
        <Button size="icon" type="submit" disabled={!prompt.trim() || runningAction !== null}><Sparkles /></Button>
      </form>
    </div>
  )
}
