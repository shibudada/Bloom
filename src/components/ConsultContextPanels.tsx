import { useState } from 'react'
import type { Consult } from '../types'

export function ChatHistoryPanel({
  consult,
  onInsertExcerpt,
}: {
  consult: Consult
  onInsertExcerpt: (excerpt: string) => void
}) {
  const [senderFilter, setSenderFilter] = useState<'all' | 'patient' | 'agent'>('all')
  const messages =
    senderFilter === 'all'
      ? consult.chat
      : consult.chat.filter((message) => message.sender === senderFilter)

  return (
    <div className="chat-panel">
      <div className="timeline-filters" aria-label="Chat filters">
        {(['all', 'patient', 'agent'] as const).map((sender) => (
          <button
            className={senderFilter === sender ? 'selected' : ''}
            key={sender}
            onClick={() => setSenderFilter(sender)}
            type="button"
          >
            {sender}
          </button>
        ))}
      </div>
      <div className="chat-history">
        {messages.map((message) => (
          <article className={`chat-bubble ${message.sender}`} key={message.id}>
            <div className="chat-bubble-top">
              <strong>{message.name}</strong>
              <span>{message.time}</span>
            </div>
            {message.body.map((line) => (
              <p key={line}>{line}</p>
            ))}
            <button
              className="excerpt-button"
              onClick={() => onInsertExcerpt(message.body.join(' '))}
              type="button"
            >
              Insert excerpt
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}

export function InternalNotesPanel({ consult }: { consult: Consult }) {
  const notes = consult.internalNotes
    .split(/\n+|(?<=\.)\s+/)
    .map((note) => note.trim())
    .filter(Boolean)

  return (
    <div className="internal-notes-context">
      <section className="internal-note-panel">
        <div className="internal-note-header">
          <h2>Internal Notes</h2>
          <button className="primary-button compact" type="button">
            Save notes
          </button>
        </div>
        <div className="internal-note-cards" aria-label="Internal clinician note cards">
          {notes.map((note, index) => (
            <label className="internal-note-card" key={`${consult.id}-note-${index + 1}`}>
              <span>Note {index + 1}</span>
              <textarea defaultValue={note} aria-label={`Internal clinician note ${index + 1}`} />
            </label>
          ))}
          <label className="internal-note-card add-note">
            <span>New note</span>
            <textarea placeholder="Add follow-up, safety watch, or context..." aria-label="New internal note" />
          </label>
        </div>
      </section>
    </div>
  )
}
