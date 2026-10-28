import { AlertTriangle, Check, Loader2, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Consult, Medication } from '@/types'

const API_BASE_URL = import.meta.env.VITE_BLOOM_API_BASE_URL ?? ''
const photonEvents = ['photon-prescriptions-created', 'photon-draft-prescription-created', 'photon-order-error'] as const

type PhotonConfig = { orgId: string; clientId: string; siteUrl: string; authDomain: string; authAudience: string }
type PhotonState = { status: 'review' | 'loading' | 'ready' | 'complete' | 'blocked'; config?: PhotonConfig; patientId?: string; error?: string }

export function PhotonPrescription({ consult, onReturnToNote }: { consult: Consult; onReturnToNote: () => void }) {
  const candidates = prescriptionCandidates(consult)
  const [selectedNames, setSelectedNames] = useState(() => candidates.map((medication) => medication.name))
  const [state, setState] = useState<PhotonState>({ status: 'review' })
  const selected = candidates.filter((medication) => selectedNames.includes(medication.name))

  const launchPhoton = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const configResponse = await fetch(`${API_BASE_URL}/api/photon/config`)
      const configPayload = (await configResponse.json()) as { ready: boolean; config: PhotonConfig | null; missing?: string[] }
      if (!configResponse.ok || !configPayload.ready || !configPayload.config) throw new Error(`Photon configuration is incomplete${configPayload.missing?.length ? `: ${configPayload.missing.join(', ')}` : '.'}`)
      const configuredOrigin = new URL(configPayload.config.siteUrl).origin
      if (configuredOrigin !== window.location.origin) throw new Error(`Photon login must run from ${configuredOrigin}.`)
      if (window.location.protocol !== 'https:') throw new Error('Photon login requires the HTTPS Bloom development URL.')
      await import('@photonhealth/elements')
      const syncResponse = await fetch(`${API_BASE_URL}/api/photon/patient/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ consultId: consult.id, patient: consult.patient }) })
      const syncPayload = (await syncResponse.json()) as { ok: boolean; patient?: { id: string }; error?: string }
      if (!syncResponse.ok || !syncPayload.ok || !syncPayload.patient) throw new Error(syncPayload.error ?? 'Photon patient sync failed.')
      setState({ status: 'ready', config: configPayload.config, patientId: syncPayload.patient.id })
    } catch (error) {
      setState({ status: 'blocked', error: error instanceof Error ? error.message : 'Photon setup failed.' })
    }
  }, [consult.id, consult.patient])

  return (
    <ScrollArea className="task-scroll" scrollFade>
      <div className="task-canvas photon-canvas">
        <section className="task-title-block"><span className="section-kicker">Prescription</span><h1>Review and send through Photon</h1><p>Confirm the candidate medications before opening the embedded prescribing workflow.</p></section>
        {state.status === 'review' || state.status === 'blocked' ? (
          <div className="prescription-review-grid">
            <section className="prescription-candidates">
              <div className="section-row"><div><h2>Candidate medications</h2><p>{candidates.length} ready for review</p></div><Badge variant="warning">Review</Badge></div>
              {candidates.map((medication) => {
                const active = selectedNames.includes(medication.name)
                return <button type="button" className="medication-candidate" data-selected={active || undefined} key={medication.name} onClick={() => setSelectedNames((current) => active ? current.filter((name) => name !== medication.name) : [...current, medication.name])} aria-pressed={active}><span className="medication-check">{active ? <Check /> : null}</span><span><strong>{medication.name}</strong><small>{medication.dosageInstructions ?? medication.effectiveDate ?? consult.draftOrder.sig}</small></span></button>
              })}
            </section>
            <section className="order-summary"><span className="section-kicker">Order details</span><dl><dt>Quantity</dt><dd>{consult.draftOrder.quantity}</dd><dt>Refills</dt><dd>{consult.draftOrder.refills}</dd><dt>Substitutions</dt><dd>{consult.draftOrder.substitutions}</dd><dt>Pharmacy</dt><dd>{consult.draftOrder.pharmacy}</dd></dl>
              {state.status === 'blocked' ? <div className="photon-error"><AlertTriangle /><p>{state.error}</p></div> : null}
              <Button className="bloom-primary-action" onClick={() => void launchPhoton()} disabled={selected.length === 0}><Send /> {state.status === 'blocked' ? 'Retry Photon' : 'Open Photon'}</Button>
            </section>
          </div>
        ) : null}
        {state.status === 'loading' ? <div className="photon-loading"><Loader2 className="spin" /><h2>Preparing Photon</h2><p>Syncing {consult.patient.name} and loading the prescribing workflow.</p></div> : null}
        {(state.status === 'ready' || state.status === 'complete') && state.config && state.patientId ? <PhotonEmbed consult={consult} config={state.config} patientId={state.patientId} selected={selected} onComplete={() => setState((current) => ({ ...current, status: 'complete' }))} /> : null}
        {state.status === 'complete' ? <div className="photon-complete"><span><Check /><strong>Prescription activity received from Photon.</strong></span><Button variant="outline" onClick={onReturnToNote}>Return to note</Button></div> : null}
      </div>
    </ScrollArea>
  )
}

function PhotonEmbed({ consult, config, patientId, selected, onComplete }: { consult: Consult; config: PhotonConfig; patientId: string; selected: Medication[]; onComplete: () => void }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const handleEvent = (event: Event) => { if (event.type !== 'photon-order-error') onComplete() }
    photonEvents.forEach((eventName) => host.addEventListener(eventName, handleEvent))
    return () => photonEvents.forEach((eventName) => host.removeEventListener(eventName, handleEvent))
  }, [onComplete])
  const templateIds = selected.map((medication) => medication.templateId).filter(Boolean).join(',')
  return <div ref={hostRef} className="photon-embed" aria-label="Photon prescribing workflow"><photon-client id={config.clientId} org={config.orgId} domain={config.authDomain} audience={config.authAudience} redirect-uri={config.siteUrl} redirect-path="" dev-mode="true"><photon-auth-wrapper auto-login="false" hide-loader="false" redirect-path=""><photon-prescribe-workflow patient-id={patientId} template-ids={templateIds || undefined} enable-order="false" enable-send-to-patient="true" enable-med-history="true" enable-med-history-links="true" enable-med-history-refill-button="true" additional-notes={`Bloom consult ${consult.id} prescription workflow.`} hide-patient-card="true" optional-patient-address="true" /></photon-auth-wrapper></photon-client></div>
}

function prescriptionCandidates(consult: Consult): Medication[] {
  const draft = consult.prescribedMedications.filter((medication) => medication.status === 'Draft' || medication.medicationStatus === 'Pending')
  if (draft.length > 0) return draft
  return consult.draftOrder.medication && consult.draftOrder.medication !== 'No prescription drafted' ? [{ name: consult.draftOrder.medication, status: 'Draft', medicationStatus: 'Candidate', dosageInstructions: consult.draftOrder.sig }] : []
}
