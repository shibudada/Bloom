import { CheckCircle2, Clock3, Moon, Search, Sun } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Consult, ThemeMode } from '@/types'

export function PatientQueue({
  consults,
  filter,
  selectedId,
  theme,
  onFilterChange,
  onSelect,
  onThemeChange,
}: {
  consults: Consult[]
  filter: string
  selectedId: string
  theme: ThemeMode
  onFilterChange: (value: string) => void
  onSelect: (id: string) => void
  onThemeChange: () => void
}) {
  const visibleConsults = consults.filter((consult) =>
    `${consult.patient.name} ${consult.requestTitle}`.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <aside className="patient-queue" aria-label="Patient queue">
      <header className="queue-brand-row">
        <div className="bloom-brand">
          <span className="bloom-mark" aria-hidden="true">B</span>
          <span><strong>Bloom</strong><small>Clinical workspace</small></span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onThemeChange} aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} theme`}>
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
      </header>

      <div className="queue-heading">
        <div><span className="section-kicker">Patient queue</span><h1>Needs review</h1></div>
        <Badge variant="warning">{visibleConsults.length}</Badge>
      </div>

      <label className="queue-search">
        <Search aria-hidden="true" />
        <Input
          nativeInput
          type="search"
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="Search patients"
          aria-label="Search patients"
        />
      </label>

      <ScrollArea className="queue-scroll" scrollFade>
        <div className="queue-list">
          {visibleConsults.map((consult) => {
            const selected = consult.id === selectedId
            const completed = consult.status === 'Signed' || consult.status === 'Completed'
            return (
              <button
                className="patient-queue-row"
                data-selected={selected || undefined}
                key={consult.id}
                type="button"
                onClick={() => onSelect(consult.id)}
                aria-current={selected ? 'page' : undefined}
              >
                <span className="patient-avatar">{consult.patient.initials}</span>
                <span className="patient-row-copy">
                  <strong>{consult.patient.name}</strong>
                  <span>{consult.requestTitle}</span>
                  <small>{consult.waiting} · {consult.patient.location}</small>
                </span>
                <span className="patient-row-state" data-completed={completed || undefined} title={consult.status}>
                  {completed ? <CheckCircle2 /> : <Clock3 />}
                </span>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </aside>
  )
}
