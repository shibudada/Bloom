import { AlertTriangle, FileText, Loader2, Pill, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetDescription, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from '@/components/ui/sheet'
import type { AgentActionType, Consult } from '@/types'

const API_BASE_URL = import.meta.env.VITE_BLOOM_API_BASE_URL ?? ''

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
  const [desktopTab, setDesktopTab] = useState<'copilot' | 'chat' | 'prescription'>('prescription')
  const [photonConnected, setPhotonConnected] = useState(false)
  const content = (
    <HelperContent consult={consult} error={error} prompt={prompt} runningAction={runningAction} onPromptChange={setPrompt} onRequestAction={onRequestAction} />
  )

  useEffect(() => {
    if (isMobile) return
    let active = true
    async function refreshPhotonStatus() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/photon/mcp/oauth/status`)
        if (!response.ok) throw new Error('Photon status unavailable')
        const status = (await response.json()) as { enabled?: boolean; authenticated?: boolean }
        if (active) setPhotonConnected(status.enabled !== false && status.authenticated === true)
      } catch {
        if (active) setPhotonConnected(false)
      }
    }
    void refreshPhotonStatus()
    window.addEventListener('focus', refreshPhotonStatus)
    return () => {
      active = false
      window.removeEventListener('focus', refreshPhotonStatus)
    }
  }, [isMobile])

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
      <div className="utility-tabs">
        <nav className="workspace-button-menu utility-menu" aria-label="Clinical utility sections">
          <Button variant="ghost" size="xs" data-selected={desktopTab === 'prescription' || undefined} onClick={() => setDesktopTab('prescription')} aria-label={`Prescribe, Photon ${photonConnected ? 'connected' : 'disconnected'}`}><span className="photon-status-dot" data-connected={photonConnected || undefined} aria-hidden="true" />Prescribe</Button>
          <Button variant="ghost" size="xs" data-selected={desktopTab === 'chat' || undefined} onClick={() => setDesktopTab('chat')}>Chat History</Button>
          <Button variant="ghost" size="xs" data-selected={desktopTab === 'copilot' || undefined} onClick={() => setDesktopTab('copilot')}>Copilot</Button>
        </nav>
        <div className="utility-panel-content">{desktopTab === 'prescription' ? <PrescriptionConsole consult={consult} onOpenPrescription={onOpenPrescription} /> : desktopTab === 'chat' ? <ChatHistory consult={consult} /> : content}</div>
      </div>
    </aside>
  )
}

function ChatHistory({ consult }: { consult: Consult }) {
  return (
    <ScrollArea className="utility-panel-scroll" scrollFade>
      <div className="chat-history-list">
        {consult.chat.map((message) => <article className={`chat-message ${message.sender}`} key={message.id}><div><strong>{message.name}</strong><span>{message.time}</span></div>{message.body.map((line) => <p key={line}>{line}</p>)}</article>)}
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
