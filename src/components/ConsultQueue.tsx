import {
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Gauge,
  LogOut,
  ListFilter,
  Palette,
  Search,
  Settings,
  Signature,
  UserCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AppearanceContrast, Consult, ThemePreference } from '../types'

interface ConsultQueueProps {
  consults: Consult[]
  selectedId: string
  filter: string
  themePreference: ThemePreference
  appearanceContrast: AppearanceContrast
  onFilterChange: (value: string) => void
  onSelect: (id: string) => void
  onThemePreferenceChange: (value: ThemePreference) => void
  onAppearanceContrastChange: (value: AppearanceContrast) => void
}

const statusIcon = {
  New: CircleDashed,
  'In review': Clock3,
  'Draft ready': CheckCircle2,
  Signed: CheckCircle2,
  Completed: CheckCircle2,
}

type WorkstreamFilter = 'all' | 'consult' | 'support'
type QueueView = 'needs-review' | 'signed'

const doneStatuses = new Set(['Signed', 'Completed'])

export function ConsultQueue({
  consults,
  selectedId,
  filter,
  themePreference,
  appearanceContrast,
  onFilterChange,
  onSelect,
  onThemePreferenceChange,
  onAppearanceContrastChange,
}: ConsultQueueProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeView, setActiveView] = useState<QueueView>('needs-review')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false)
  const [workstreamFilter, setWorkstreamFilter] = useState<WorkstreamFilter>('all')
  const [stateFilter, setStateFilter] = useState('all')

  const stateOptions = useMemo(
    () =>
      Array.from(new Set(consults.map((consult) => patientState(consult)).filter(Boolean))).sort(),
    [consults],
  )

  const filteredConsults = consults.filter((consult) => {
    const matchesPatient = consult.patient.name.toLowerCase().includes(filter.toLowerCase())
    const matchesWorkstream =
      workstreamFilter === 'all' || consult.workstream === workstreamFilter
    const matchesState = stateFilter === 'all' || patientState(consult) === stateFilter

    return matchesPatient && matchesWorkstream && matchesState
  })

  const needsReviewConsults = filteredConsults.filter((consult) => !doneStatuses.has(consult.status))
  const signedConsults = filteredConsults.filter((consult) => doneStatuses.has(consult.status))
  const visibleConsults = activeView === 'signed' ? signedConsults : needsReviewConsults

  return (
    <aside className="consult-queue" aria-label="Incoming asynchronous consults">
      <div className="queue-header">
        <div className="brand-lockup">
          <div className="brand-mark">B</div>
          <div>
            <div className="brand-name">Bloom</div>
            <div className="brand-subtitle">Ambient Care Environment</div>
          </div>
        </div>
        <button
          className={`icon-button quiet ${isFilterOpen ? 'active' : ''}`}
          onClick={() => setIsFilterOpen((current) => !current)}
          type="button"
          aria-label="Filter consults"
          aria-expanded={isFilterOpen}
        >
          <ListFilter size={16} />
        </button>
      </div>

      <nav className="queue-nav" aria-label="Queue views">
        <button
          className={activeView === 'needs-review' && isSearchOpen ? 'active' : ''}
          onClick={() => {
            setActiveView('needs-review')
            setIsSearchOpen(true)
          }}
          type="button"
          aria-pressed={activeView === 'needs-review' && isSearchOpen}
        >
          <Search size={15} aria-hidden="true" />
          <span>Search patients</span>
        </button>
        <button
          className={activeView === 'signed' ? 'active' : ''}
          onClick={() => {
            setActiveView('signed')
            setIsSearchOpen(false)
          }}
          type="button"
          aria-pressed={activeView === 'signed'}
        >
          <Signature size={15} aria-hidden="true" />
          <span>Signed Consults</span>
        </button>
      </nav>

      {isFilterOpen ? (
        <div className="queue-filter-panel" aria-label="Queue filters">
          <div className="filter-row">
            <span>Workstream</span>
            <div className="filter-chips">
              {(['all', 'consult', 'support'] as const).map((option) => (
                <button
                  className={workstreamFilter === option ? 'selected' : ''}
                  key={option}
                  onClick={() => setWorkstreamFilter(option)}
                  type="button"
                >
                  {option === 'all'
                    ? 'All'
                    : option === 'consult'
                      ? 'Incoming consults'
                      : 'Support'}
                </button>
              ))}
            </div>
          </div>
          <label className="filter-row">
            <span>State</span>
            <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
              <option value="all">All states</option>
              {stateOptions.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {activeView === 'needs-review' && isSearchOpen ? (
        <label className="queue-search-field">
          <input
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder="Search patients..."
            type="search"
          />
        </label>
      ) : null}

      <div className="queue-worklists">
        <QueueSection
          title={activeView === 'signed' ? 'Signed consults' : 'Needs review'}
          consults={visibleConsults}
          selectedId={selectedId}
          emptyLabel={
            activeView === 'signed' ? 'No matching signed consults.' : 'No matching active work.'
          }
          onSelect={onSelect}
        />
      </div>

      <div className="queue-settings-dock">
        {isSettingsOpen ? (
          <section className="settings-popover" aria-label="Account settings menu">
            <div className="settings-account-row muted">
              <UserCircle size={17} strokeWidth={1.8} />
              <span>nihardeals@gmail.com</span>
            </div>
            <div className="settings-account-row muted">
              <Settings size={17} strokeWidth={1.8} />
              <span>Personal account</span>
            </div>
            <div className="settings-divider" />
            <button className="settings-menu-row" type="button">
              <UserCircle size={17} strokeWidth={1.8} />
              <span>Profile</span>
            </button>
            <button className="settings-menu-row" type="button">
              <Settings size={17} strokeWidth={1.8} />
              <span>Settings</span>
              <kbd>⌘,</kbd>
            </button>
            <button
              className={`settings-menu-row ${isPersonalizationOpen ? 'selected' : ''}`}
              onClick={() => setIsPersonalizationOpen((current) => !current)}
              type="button"
              aria-expanded={isPersonalizationOpen}
            >
              <Palette size={17} strokeWidth={1.8} />
              <span>Personalization</span>
              <ChevronRight className={isPersonalizationOpen ? 'rotated' : ''} size={16} />
            </button>
            {isPersonalizationOpen ? (
              <div className="personalization-panel">
                <div className="personalization-group">
                  <span>Default appearance</span>
                  <div className="settings-option-grid three">
                    {(['system', 'dark', 'light'] as const).map((option) => (
                      <button
                        className={themePreference === option ? 'selected' : ''}
                        key={option}
                        onClick={() => onThemePreferenceChange(option)}
                        type="button"
                      >
                        {option === 'system' ? 'System' : option === 'dark' ? 'Dark' : 'Light'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="personalization-group">
                  <span>Contrast</span>
                  <div className="settings-option-list">
                    {(['system-medium', 'high', 'soft-clinical'] as const).map((option) => (
                      <button
                        className={appearanceContrast === option ? 'selected' : ''}
                        key={option}
                        onClick={() => onAppearanceContrastChange(option)}
                        type="button"
                      >
                        <strong>
                          {option === 'system-medium'
                            ? 'System Medium'
                            : option === 'high'
                              ? 'High Contrast'
                              : 'Soft Clinical'}
                        </strong>
                        <span>
                          {option === 'system-medium'
                            ? 'Balanced native-style dark and light surfaces'
                            : option === 'high'
                              ? 'Current high-contrast Bloom appearance'
                              : 'Lower-glare surfaces for longer review sessions'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="settings-divider" />
            <button className="settings-menu-row" type="button">
              <Gauge size={17} strokeWidth={1.8} />
              <span>Usage remaining</span>
              <ChevronRight size={16} />
            </button>
            <button className="settings-menu-row" type="button">
              <LogOut size={17} strokeWidth={1.8} />
              <span>Log out</span>
            </button>
          </section>
        ) : null}
        <button
          className={`queue-settings-trigger ${isSettingsOpen ? 'active' : ''}`}
          onClick={() => setIsSettingsOpen((current) => !current)}
          type="button"
          aria-expanded={isSettingsOpen}
        >
          <Settings size={17} strokeWidth={1.8} />
          <span>Settings</span>
        </button>
      </div>

    </aside>
  )
}

function QueueSection({
  title,
  consults,
  selectedId,
  emptyLabel,
  onSelect,
}: {
  title: string
  consults: Consult[]
  selectedId: string
  emptyLabel: string
  onSelect: (id: string) => void
}) {
  return (
    <section className="queue-section">
      {title ? (
        <div className="queue-section-title">
          <span>{title}</span>
          <span>{consults.length}</span>
        </div>
      ) : null}

      <div className="consult-list">
        {consults.length > 0 ? (
          consults.map((consult) => {
            const Icon = statusIcon[consult.status]
            const isSelected = consult.id === selectedId

            return (
              <button
                className={`consult-row ${isSelected ? 'selected' : ''}`}
                key={consult.id}
                onClick={() => onSelect(consult.id)}
                type="button"
              >
                <span className="patient-avatar">{consult.patient.initials}</span>
                <span className="consult-row-main">
                  <span className="consult-row-top">
                    <strong>{consult.patient.name}</strong>
                    <span>{doneStatuses.has(consult.status) ? consult.receivedAt : consult.waiting}</span>
                  </span>
                  <span className="consult-title">{consult.requestTitle}</span>
                  <span className="consult-row-meta">
                    <span className={`priority-dot ${consult.priority.toLowerCase()}`} />
                    <span>{consult.requestType}</span>
                    <span className="meta-divider" />
                    <Icon size={13} />
                    <span>{consult.status}</span>
                  </span>
                </span>
              </button>
            )
          })
        ) : (
          <div className="queue-empty">{emptyLabel}</div>
        )}
      </div>
    </section>
  )
}

function patientState(consult: Consult) {
  return consult.patient.location.split(',').at(-1)?.trim() ?? ''
}
