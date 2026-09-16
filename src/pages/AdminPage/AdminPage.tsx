import { useEffect, useState } from 'react'
import { Check, ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react'
import './AdminPage.css'

interface EventRecord {
  id: string
  title: string
  description: string
  published: boolean
  category: string
  tag: string
  location: string
  format: 'in-person' | 'virtual' | 'hybrid'
  color: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  duration: string
  prizePool: string
  registrationOpen: boolean
  tags: string[]
  image: string | null
}

type FormState = Omit<EventRecord, 'id'>

const COLORS: { value: string; hex: string }[] = [
  { value: 'red', hex: '#f87171' },
  { value: 'yellow', hex: '#fbbf24' },
  { value: 'teal', hex: '#2dd4bf' },
  { value: 'purple', hex: '#c084fc' },
  { value: 'orange', hex: '#fb923c' },
  { value: 'green', hex: '#4ade80' },
]

const EVENT_TYPES = ['Hackathon', 'Sprint', 'Summit', 'Workshop']
const ATTEND_FORMATS: { value: FormState['format']; label: string }[] = [
  { value: 'in-person', label: 'In-Person' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'hybrid', label: 'Hybrid' },
]

const BLANK_FORM: FormState = {
  title: '',
  description: '',
  published: false,
  category: '',
  tag: 'Hackathon',
  location: '',
  format: 'in-person',
  color: 'teal',
  startDate: '',
  endDate: '',
  startTime: '09:00',
  endTime: '17:00',
  duration: '',
  prizePool: '',
  registrationOpen: false,
  tags: [],
  image: null,
}

export default function AdminPage() {
  const [events, setEvents] = useState<EventRecord[] | null>(null)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagDraft, setTagDraft] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    void loadEvents()
  }, [])

  async function loadEvents() {
    try {
      const res = await fetch('/api/admin/events')
      if (!res.ok) throw new Error()
      setEvents(await res.json())
    } catch {
      setEvents([])
      setError('Couldn’t load hackathons. Make sure you’re running `npm run dev`, not viewing the live site.')
    }
  }

  function startNew() {
    setForm(BLANK_FORM)
    setTagDraft('')
    setError(null)
    setEditingId('new')
  }

  function startEdit(event: EventRecord) {
    const { id, ...fields } = event
    setForm(fields)
    setTagDraft('')
    setError(null)
    setEditingId(id)
  }

  function cancelEdit() {
    setEditingId(null)
    setError(null)
  }

  async function handleSave() {
    if (!form.title || !form.description || !form.category || !form.location || !form.startDate || !form.endDate) {
      setError('Please fill in the event name, description, category, location, and both dates — those are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const isNew = editingId === 'new'
      const res = await fetch(isNew ? '/api/admin/events' : `/api/admin/events/${editingId}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setEditingId(null)
      await loadEvents()
    } catch {
      setError('Something went wrong saving — check the terminal running `npm run dev` for details.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(event: EventRecord) {
    if (!window.confirm(`Delete "${event.title}"? This can’t be undone.`)) return
    try {
      const res = await fetch(`/api/admin/events/${event.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      await loadEvents()
    } catch {
      setError('Couldn’t delete that event — check the terminal running `npm run dev` for details.')
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/admin/images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, dataUrl }),
      })
      if (!res.ok) throw new Error()
      const { path } = await res.json()
      setForm((f) => ({ ...f, image: path }))
    } catch {
      setError('Couldn’t upload that image — check the terminal running `npm run dev` for details.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  function addTag() {
    const value = tagDraft.trim()
    if (!value || form.tags.includes(value)) {
      setTagDraft('')
      return
    }
    setForm((f) => ({ ...f, tags: [...f.tags, value] }))
    setTagDraft('')
  }

  function removeTag(tag: string) {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))
  }

  const isEditing = editingId !== null

  return (
    <div className="adm">
      <div className="adm__topbar">
        <h1 className="adm__title">Manage Hackathons</h1>
        {!isEditing && (
          <button type="button" className="adm-btn adm-btn--primary" onClick={startNew}>
            <Plus size={16} /> Add Hackathon
          </button>
        )}
      </div>

      {error && <div className="adm-banner adm-banner--error">{error}</div>}

      {!isEditing && (
        <div className="adm-list">
          {events === null && <p className="adm-empty">Loading…</p>}
          {events?.length === 0 && (
            <p className="adm-empty">No hackathons yet — click “Add Hackathon” to create your first one.</p>
          )}
          {events?.map((event) => (
            <div key={event.id} className="adm-card">
              <span className="adm-card__swatch" style={{ background: COLORS.find((c) => c.value === event.color)?.hex ?? '#64748b' }} />
              <div className="adm-card__body">
                <div className="adm-card__row">
                  <span className="adm-card__title">{event.title}</span>
                  <span className={`adm-badge ${event.published ? 'adm-badge--live' : 'adm-badge--draft'}`}>
                    {event.published ? 'Visible' : 'Draft'}
                  </span>
                </div>
                <span className="adm-card__meta">{event.startDate} → {event.endDate} · {event.location}</span>
              </div>
              <div className="adm-card__actions">
                <button type="button" className="adm-icon-btn" onClick={() => startEdit(event)} aria-label="Edit">
                  <Pencil size={15} />
                </button>
                <button type="button" className="adm-icon-btn adm-icon-btn--danger" onClick={() => handleDelete(event)} aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isEditing && (
        <div className="adm-form">
          <section className="adm-section">
            <h2 className="adm-section__title">The Basics</h2>
            <label className="adm-field">
              <span className="adm-field__label">Event Name</span>
              <input
                className="adm-input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Mobile App Blitz"
              />
            </label>
            <label className="adm-field">
              <span className="adm-field__label">Description</span>
              <textarea
                className="adm-input adm-input--textarea"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="A sentence or two about the event."
                rows={3}
              />
            </label>
            <div className="adm-field-row">
              <label className="adm-field">
                <span className="adm-field__label">Category</span>
                <input
                  className="adm-input"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Web Dev, AI / ML"
                />
              </label>
              <label className="adm-field">
                <span className="adm-field__label">Event Type</span>
                <select
                  className="adm-input"
                  value={form.tag}
                  onChange={(e) => setForm((f) => ({ ...f, tag: e.target.value }))}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="adm-toggle">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))}
              />
              <span className="adm-toggle__track"><span className="adm-toggle__thumb" /></span>
              <span>
                <span className="adm-field__label">Visible on the website</span>
                <span className="adm-field__hint">Turn on when you're ready for people to see it.</span>
              </span>
            </label>
          </section>

          <section className="adm-section">
            <h2 className="adm-section__title">When &amp; Where</h2>
            <div className="adm-field-row">
              <label className="adm-field">
                <span className="adm-field__label">Start Date</span>
                <input
                  type="date"
                  className="adm-input"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </label>
              <label className="adm-field">
                <span className="adm-field__label">End Date</span>
                <input
                  type="date"
                  className="adm-input"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </label>
            </div>
            <div className="adm-field-row">
              <label className="adm-field">
                <span className="adm-field__label">Start Time</span>
                <input
                  type="time"
                  className="adm-input"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </label>
              <label className="adm-field">
                <span className="adm-field__label">End Time</span>
                <input
                  type="time"
                  className="adm-input"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </label>
            </div>
            <div className="adm-field-row">
              <label className="adm-field">
                <span className="adm-field__label">Duration</span>
                <input
                  className="adm-input"
                  value={form.duration}
                  onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                  placeholder='e.g. "36 hrs" or "2 days"'
                />
              </label>
              <label className="adm-field">
                <span className="adm-field__label">Location</span>
                <input
                  className="adm-input"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder='e.g. "Augusta, GA" or "Online"'
                />
              </label>
            </div>
            <label className="adm-field">
              <span className="adm-field__label">How people attend</span>
              <select
                className="adm-input"
                value={form.format}
                onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as FormState['format'] }))}
              >
                {ATTEND_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </label>
            <label className="adm-toggle">
              <input
                type="checkbox"
                checked={form.registrationOpen}
                onChange={(e) => setForm((f) => ({ ...f, registrationOpen: e.target.checked }))}
              />
              <span className="adm-toggle__track"><span className="adm-toggle__thumb" /></span>
              <span>
                <span className="adm-field__label">Registration Open</span>
                <span className="adm-field__hint">Turn on to let people sign up, off once it closes.</span>
              </span>
            </label>
          </section>

          <section className="adm-section">
            <h2 className="adm-section__title">Prize &amp; Keywords</h2>
            <label className="adm-field">
              <span className="adm-field__label">Prize Pool</span>
              <input
                className="adm-input"
                value={form.prizePool}
                onChange={(e) => setForm((f) => ({ ...f, prizePool: e.target.value }))}
                placeholder='e.g. "$3,000" or "Network"'
              />
            </label>
            <div className="adm-field">
              <span className="adm-field__label">Keywords</span>
              <span className="adm-field__hint">Short words shown as chips on the card, like "React" or "Beginner Friendly".</span>
              <div className="adm-tags">
                {form.tags.map((tag) => (
                  <span key={tag} className="adm-chip">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                      <X size={12} />
                    </button>
                  </span>
                ))}
                <input
                  className="adm-tags__input"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addTag() }
                  }}
                  onBlur={addTag}
                  placeholder="Type a keyword and press Enter"
                />
              </div>
            </div>
          </section>

          <section className="adm-section">
            <h2 className="adm-section__title">Appearance</h2>
            <div className="adm-field">
              <span className="adm-field__label">Card Color</span>
              <span className="adm-field__hint">Just changes the color of the event's card.</span>
              <div className="adm-swatches">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    className="adm-swatch"
                    style={{ background: c.hex }}
                    aria-label={c.value}
                    onClick={() => setForm((f) => ({ ...f, color: c.value }))}
                  >
                    {form.color === c.value && <Check size={16} color="#0f172a" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>
            <div className="adm-field">
              <span className="adm-field__label">Cover Image</span>
              <span className="adm-field__hint">Optional — leave empty to use the default picture.</span>
              <div className="adm-image-upload">
                {form.image && <img src={form.image} alt="" className="adm-image-upload__preview" />}
                <label className="adm-btn adm-btn--secondary">
                  <ImagePlus size={16} />
                  {uploading ? 'Uploading…' : form.image ? 'Change Image' : 'Choose Image'}
                  <input type="file" accept="image/*" hidden onChange={handleImageChange} disabled={uploading} />
                </label>
                {form.image && (
                  <button type="button" className="adm-btn adm-btn--secondary" onClick={() => setForm((f) => ({ ...f, image: null }))}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          </section>

          <div className="adm-form__actions">
            <button type="button" className="adm-btn adm-btn--secondary" onClick={cancelEdit} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="adm-btn adm-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
