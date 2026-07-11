import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleGenAI } from '@google/genai'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import type { Session } from '@supabase/supabase-js'
import {
  computeStatus,
  deleteEvent,
  fetchAllEvents,
  getEndDateTime,
  getStartDateTime,
  newBlankEvent,
  publicStatusLabel,
  upsertEvent,
  type ComputedStatus,
  type EventRecord,
} from '../../lib/eventUtils'
import './AdminPage.css'

// ── Helpers ───────────────────────────────────────────────────

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7
}

function groupByDate<T extends EventRecord>(events: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {}
  for (const e of events) {
    if (!groups[e.startDate]) groups[e.startDate] = []
    groups[e.startDate].push(e)
  }
  return groups
}

function getTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days:    Math.floor(diff / 86400000),
    hours:   Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  }
}

// ── Icons ─────────────────────────────────────────────────────

function IconHome() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
}
function IconZap() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
}
function IconExternalLink() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
}
function IconPeople() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
}
function IconArchive() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>
}
function IconTrash() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6M9 6V4h6v2" /></svg>
}
function IconImage() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="36" height="36"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
}

// ── Countdown ─────────────────────────────────────────────────

function CountdownTimer({ target, label }: { target: Date; label: string }) {
  const [tl, setTl] = useState(() => getTimeLeft(target))
  useEffect(() => {
    const id = setInterval(() => setTl(getTimeLeft(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (!tl) return <div className="adm-countdown__done">{label} in progress</div>
  return (
    <div className="adm-countdown">
      <span className="adm-countdown__label">{label} in</span>
      <div className="adm-countdown__units">
        {[{ v: tl.days, u: 'D' }, { v: tl.hours, u: 'H' }, { v: tl.minutes, u: 'M' }, { v: tl.seconds, u: 'S' }].map(({ v, u }) => (
          <div key={u} className="adm-countdown__unit">
            <span className="adm-countdown__num">{String(v).padStart(2, '0')}</span>
            <span className="adm-countdown__u">{u}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── AI Generation ─────────────────────────────────────────────

const GENERATE_MARKER = '<<GENERATE>>'
const BUBBLE_SEP      = '<<|>>'

function buildAdminSystemPrompt(today: string) {
  return `You help an admin create hackathon events for Augusta Dev (Augusta, GA). Today is ${today}.

CRITICAL RULES — follow these exactly:
• Every single message = ONE sentence max. Short. Punchy. Like texting.
• Ask ONE question per message. Never two.
• No bullet points. No lists. No markdown. No long explanations. Ever.
• To send two short messages (acknowledge then ask), separate them with exactly: ${BUBBLE_SEP}
  Example: "Love it! 🔥${BUBBLE_SEP}What dates are you thinking?"
• Never use ${BUBBLE_SEP} more than once per response.
• Sound like a friend texting, not a form or an essay.

COLLECT in this order (one question at a time):
1. Theme / title idea
2. Type — Hackathon, Workshop, Summit, or Sprint?
3. Format — virtual, in-person, or hybrid?
4. Start + end date (ask together, one message)
5. Prize pool
6. Max participants
7. Any specific location? (skip if virtual)

When you have theme, dates, format, prize, and capacity — give a 2-sentence summary and ask: "Ready to build it?"
On confirmation (yes / go / do it / looks good / build it / generate): output the event.

WHEN GENERATING — end your response with this EXACT block, nothing after the JSON:
${GENERATE_MARKER}
{"title":"","category":"","tag":"Hackathon","description":"","location":"","format":"virtual","color":"purple","startDate":"","endDate":"","startTime":"09:00","endTime":"18:00","duration":"","prizePool":"","maxTeams":0,"maxParticipants":0,"tags":[]}

Fill every field. description = 2 exciting sentences for developers. color = purple|blue|green|orange|red. tags = 3-5 lowercase keywords.`
}

interface GenMessage { role: 'user' | 'model' | 'typing'; text: string }

const GREETING: GenMessage = {
  role: 'model',
  text: "Hey! 👋 What hackathon are you building today?",
}

function parseGenerated(text: string): EventRecord | null {
  const idx = text.indexOf(GENERATE_MARKER)
  if (idx === -1) return null
  try {
    let jsonStr = text.slice(idx + GENERATE_MARKER.length).trim()
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const p    = JSON.parse(jsonStr)
    const base = newBlankEvent()
    return {
      ...base,
      title:           p.title           ?? '',
      category:        p.category        ?? '',
      tag:             p.tag             ?? 'Hackathon',
      description:     p.description     ?? '',
      location:        p.location        ?? '',
      format:          p.format          ?? 'in-person',
      color:           p.color           ?? 'purple',
      startDate:       p.startDate       ?? base.startDate,
      endDate:         p.endDate         ?? base.endDate,
      startTime:       p.startTime       ?? '09:00',
      endTime:         p.endTime         ?? '17:00',
      duration:        p.duration        ?? '',
      prizePool:       p.prizePool       ?? '',
      maxTeams:        Number(p.maxTeams)        || 0,
      maxParticipants: Number(p.maxParticipants) || 0,
      tags:            Array.isArray(p.tags) ? p.tags : [],
      registrationOpen: false,
      published:        false,
      image:            null,
    }
  } catch {
    return null
  }
}

function GenerateModal({
  onGenerated,
  onClose,
}: {
  onGenerated: (event: EventRecord) => void
  onClose: () => void
}) {
  const [messages, setMessages] = useState<GenMessage[]>([GREETING])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatRef     = useRef<any>(null)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const adminKey    = import.meta.env.VITE_ADMIN_GEMINI_API_KEY as string | undefined

  useEffect(() => {
    if (!adminKey) return
    const today = new Date().toISOString().split('T')[0]
    const ai    = new GoogleGenAI({ apiKey: adminKey })
    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: buildAdminSystemPrompt(today) },
    })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 100) + 'px'
    }
  }, [input])

  async function send() {
    const msg = input.trim()
    if (!msg || loading || !chatRef.current) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages((prev) => [...prev, { role: 'user', text: msg }])
    setLoading(true)
    setError(null)

    try {
      const stream = await chatRef.current.sendMessageStream({ message: msg })
      let full = ''

      // Show typing dots while waiting — no streaming text visible
      setMessages((prev) => [...prev, { role: 'typing', text: '' }])

      for await (const chunk of stream) {
        full += chunk.text ?? ''
      }

      // Strip generate marker and JSON from display text
      const generated  = parseGenerated(full)
      const displayText = full.includes(GENERATE_MARKER)
        ? full.slice(0, full.indexOf(GENERATE_MARKER)).trimEnd()
        : full

      // Split into separate bubbles on the separator token
      const bubbles = displayText
        .split(BUBBLE_SEP)
        .map((b) => b.trim())
        .filter(Boolean)
      if (bubbles.length === 0) bubbles.push('…')

      // Replace typing indicator with first bubble immediately
      setMessages((prev) => [...prev.slice(0, -1), { role: 'model', text: bubbles[0] }])

      // Stagger remaining bubbles: pause → typing → pause → bubble
      for (let i = 1; i < bubbles.length; i++) {
        await new Promise((r) => setTimeout(r, 350))
        setMessages((prev) => [...prev, { role: 'typing', text: '' }])
        await new Promise((r) => setTimeout(r, 550))
        setMessages((prev) => [...prev.slice(0, -1), { role: 'model', text: bubbles[i] }])
      }

      if (generated) {
        await new Promise((r) => setTimeout(r, 900))
        onGenerated(generated)
      }
    } catch (err) {
      console.error('[AdminAI]', err)
      setError('Something went wrong — try again.')
      // Remove dangling typing indicator if present
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        return last?.role === 'typing' || (last?.role === 'model' && last.text === '')
          ? prev.slice(0, -1)
          : prev
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal adm-modal--chat" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal__head">
          <h2 className="adm-modal__title">✨ AI Hackathon Builder</h2>
          <button className="adm-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="adm-gen-chat">
          {messages.map((m, i) => (
            <div key={i} className={`adm-gen-msg adm-gen-msg--${m.role === 'typing' ? 'model' : m.role}`}>
              {(m.role === 'model' || m.role === 'typing') && <div className="adm-gen-msg__avatar">✨</div>}
              {m.role === 'typing' ? (
                <p className="adm-gen-msg__text adm-gen-msg__text--typing"><span /><span /><span /></p>
              ) : (
                <p className="adm-gen-msg__text">{m.text}</p>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {error && <p className="adm-gen__error adm-gen__error--chat">{error}</p>}

        <div className="adm-gen-input-row">
          <textarea
            ref={textareaRef}
            className="adm-gen-input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={!adminKey ? 'VITE_ADMIN_GEMINI_API_KEY not set' : 'Reply…'}
            disabled={loading || !adminKey}
          />
          <button
            className="adm-gen-send"
            onClick={send}
            disabled={loading || !input.trim() || !adminKey}
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </div>
        <p className="adm-gen-hint">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}

// ── Edit Modal ────────────────────────────────────────────────

function EditModal({
  event,
  onSave,
  onClose,
  saving,
  saveError,
}: {
  event: EventRecord
  onSave: (updated: EventRecord) => Promise<void>
  onClose: () => void
  saving: boolean
  saveError?: string | null
}) {
  const [draft, setDraft] = useState<EventRecord>({ ...event })
  const imgInputRef = useRef<HTMLInputElement>(null)

  function field<K extends keyof EventRecord>(k: K, v: EventRecord[K]) {
    setDraft((p) => ({ ...p, [k]: v }))
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => field('image', ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal__head">
          <h2 className="adm-modal__title">{event.title ? 'Edit Hackathon' : 'New Hackathon'}</h2>
          <button className="adm-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="adm-modal__body">
          <div className="adm-modal__row">
            <label className="adm-modal__label">
              Title
              <input className="adm-modal__input" value={draft.title} onChange={(e) => field('title', e.target.value)} />
            </label>
            <label className="adm-modal__label">
              Category
              <input className="adm-modal__input" value={draft.category} onChange={(e) => field('category', e.target.value)} />
            </label>
          </div>

          <div className="adm-modal__row">
            <label className="adm-modal__label">
              Type
              <select className="adm-modal__input adm-modal__select" value={draft.tag} onChange={(e) => field('tag', e.target.value)}>
                {['Hackathon', 'Workshop', 'Summit', 'Sprint'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </label>
            <label className="adm-modal__label">
              Format
              <select className="adm-modal__input adm-modal__select" value={draft.format} onChange={(e) => field('format', e.target.value as EventRecord['format'])}>
                <option value="virtual">Virtual</option>
                <option value="in-person">In-Person</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>
          </div>

          <label className="adm-modal__label">
            Description
            <textarea className="adm-modal__input adm-modal__textarea" value={draft.description} onChange={(e) => field('description', e.target.value)} rows={3} />
          </label>

          <label className="adm-modal__label">
            Location
            <input className="adm-modal__input" value={draft.location} onChange={(e) => field('location', e.target.value)} />
          </label>

          <div className="adm-modal__row">
            <label className="adm-modal__label">
              Start Date
              <input type="date" className="adm-modal__input" value={draft.startDate} onChange={(e) => field('startDate', e.target.value)} />
            </label>
            <label className="adm-modal__label">
              Start Time
              <input type="time" className="adm-modal__input" value={draft.startTime} onChange={(e) => field('startTime', e.target.value)} />
            </label>
          </div>

          <div className="adm-modal__row">
            <label className="adm-modal__label">
              End Date
              <input type="date" className="adm-modal__input" value={draft.endDate} onChange={(e) => field('endDate', e.target.value)} />
            </label>
            <label className="adm-modal__label">
              End Time
              <input type="time" className="adm-modal__input" value={draft.endTime} onChange={(e) => field('endTime', e.target.value)} />
            </label>
          </div>

          <div className="adm-modal__row">
            <label className="adm-modal__label">
              Prize Pool
              <input className="adm-modal__input" value={draft.prizePool} onChange={(e) => field('prizePool', e.target.value)} />
            </label>
            <label className="adm-modal__label">
              Duration
              <input className="adm-modal__input" value={draft.duration} onChange={(e) => field('duration', e.target.value)} placeholder="e.g. 48 hrs" />
            </label>
          </div>

          <div className="adm-modal__row">
            <label className="adm-modal__label">
              Max Teams
              <input type="number" className="adm-modal__input" value={draft.maxTeams} onChange={(e) => field('maxTeams', Number(e.target.value))} />
            </label>
            <label className="adm-modal__label">
              Max Participants
              <input type="number" className="adm-modal__input" value={draft.maxParticipants} onChange={(e) => field('maxParticipants', Number(e.target.value))} />
            </label>
          </div>

          <div className="adm-modal__label">
            Event Image
            <div className="adm-modal__img-upload">
              {draft.image ? (
                <div className="adm-modal__img-preview">
                  <img src={draft.image} alt="Event" className="adm-modal__img-thumb" />
                  <div className="adm-modal__img-actions">
                    <button type="button" className="adm-modal__img-btn" onClick={() => imgInputRef.current?.click()}>Replace</button>
                    <button type="button" className="adm-modal__img-btn adm-modal__img-btn--remove" onClick={() => field('image', null)}>Remove</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="adm-modal__img-drop" onClick={() => imgInputRef.current?.click()}>
                  <span className="adm-modal__img-icon">🖼</span>
                  <span>Click to upload image</span>
                  <span className="adm-modal__img-hint">PNG, JPG, WEBP</span>
                </button>
              )}
              <input ref={imgInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile} />
            </div>
          </div>

          <label className="adm-modal__label">
            Tags (comma-separated)
            <input
              className="adm-modal__input"
              value={draft.tags.join(', ')}
              onChange={(e) => field('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
            />
          </label>

          <div className="adm-modal__row adm-modal__row--toggles">
            <label className="adm-modal__toggle">
              <input type="checkbox" checked={draft.registrationOpen} onChange={(e) => field('registrationOpen', e.target.checked)} />
              <span className="adm-modal__toggle-track" />
              Registration Open
            </label>
            <label className="adm-modal__toggle">
              <input type="checkbox" checked={draft.published} onChange={(e) => field('published', e.target.checked)} />
              <span className="adm-modal__toggle-track" />
              Published
            </label>
          </div>
        </div>

        {saveError && <p className="adm-modal__save-error">{saveError}</p>}
        <div className="adm-modal__foot">
          <button className="adm-modal__cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="adm-modal__save" onClick={() => onSave(draft)} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Admin Management Panel ────────────────────────────────────

interface AdminRecord {
  id: string
  user_id: string
  email: string
  granted_by_email: string | null
  created_at: string
}

function AdminsPanel({ currentUserEmail }: { currentUserEmail: string }) {
  const [admins, setAdmins]           = useState<AdminRecord[]>([])
  const [loading, setLoading]         = useState(true)
  const [searchEmail, setSearchEmail] = useState('')
  const [searching, setSearching]     = useState(false)
  const [statusMsg, setStatusMsg]     = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => { loadAdmins() }, [])

  async function loadAdmins() {
    if (!supabase) return
    setLoading(true)
    const { data } = await supabase.from('admins').select('*').order('created_at', { ascending: true })
    setAdmins((data as AdminRecord[]) ?? [])
    setLoading(false)
  }

  async function grantAdmin() {
    if (!supabase || !searchEmail.trim()) return
    setSearching(true)
    setStatusMsg(null)

    // Look up user ID by email via RPC
    const { data: userId, error: rpcErr } = await supabase.rpc('get_user_id_by_email', { target_email: searchEmail.trim() })
    if (rpcErr || !userId) {
      setStatusMsg({ text: userId === null ? 'No account found with that email. They need to sign up first.' : `Error: ${rpcErr?.message}`, ok: false })
      setSearching(false)
      return
    }

    const { error } = await supabase.from('admins').insert({
      user_id: userId,
      email: searchEmail.trim(),
      granted_by_email: currentUserEmail,
    })
    if (error) {
      setStatusMsg({ text: error.code === '23505' ? 'That user is already an admin.' : `Error: ${error.message}`, ok: false })
    } else {
      setStatusMsg({ text: `${searchEmail.trim()} is now an admin.`, ok: true })
      setSearchEmail('')
      loadAdmins()
    }
    setSearching(false)
  }

  async function revokeAdmin(adminId: string, email: string) {
    if (!supabase) return
    if (!confirm(`Remove admin access for ${email}?`)) return
    await supabase.from('admins').delete().eq('id', adminId)
    loadAdmins()
  }

  return (
    <div className="adm-schedule">
      <div className="adm-schedule__head">
        <h2>Admin Management</h2>
      </div>

      <div className="adm-admins">
        <div className="adm-admins__grant">
          <p className="adm-admins__label">Grant admin access by email</p>
          <div className="adm-admins__row">
            <input
              className="adm-admins__input"
              type="email"
              placeholder="user@example.com"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && grantAdmin()}
            />
            <button className="adm-admins__grant-btn" onClick={grantAdmin} disabled={searching || !searchEmail.trim()}>
              {searching ? '…' : 'Grant'}
            </button>
          </div>
          {statusMsg && (
            <p className={`adm-admins__status${statusMsg.ok ? ' adm-admins__status--ok' : ' adm-admins__status--err'}`}>
              {statusMsg.text}
            </p>
          )}
        </div>

        <div className="adm-admins__list">
          <p className="adm-admins__label">Current admins</p>
          {loading ? (
            <p className="adm-admins__empty">Loading…</p>
          ) : admins.length === 0 ? (
            <p className="adm-admins__empty">No admins yet.</p>
          ) : (
            admins.map((a) => (
              <div key={a.id} className="adm-admins__item">
                <div className="adm-admins__item-info">
                  <span className="adm-admins__item-email">{a.email}</span>
                  {a.granted_by_email && (
                    <span className="adm-admins__item-by">Granted by {a.granted_by_email}</span>
                  )}
                </div>
                {a.email !== import.meta.env.VITE_ADMIN_EMAIL && a.email !== currentUserEmail && (
                  <button className="adm-admins__revoke" onClick={() => revokeAdmin(a.id, a.email)} title="Revoke admin">
                    <IconTrash />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────

type FilterStatus = 'all' | ComputedStatus
type AdminView = 'events' | 'admins'

export default function AdminPage() {
  const navigate = useNavigate()
  const [session, setSession]           = useState<Session | null>(null)
  const [loading, setLoading]           = useState(true)
  const [isAdmin, setIsAdmin]           = useState(false)
  const [events, setEvents]             = useState<EventRecord[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [selected, setSelected]         = useState<EventRecord | null>(null)
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null)
  const [saving, setSaving]             = useState(false)
  const [deleting, setDeleting]         = useState(false)
  const [calYear, setCalYear]           = useState(new Date().getFullYear())
  const [calMonth, setCalMonth]         = useState(new Date().getMonth())
  const [filterStatus, setFilterStatus]     = useState<FilterStatus>('all')
  const [page, setPage]                     = useState(1)
  const [view, setView]                     = useState<AdminView>('events')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [opError, setOpError]               = useState<string | null>(null)

  const PAGE_SIZE = 5

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) { setLoading(false); return }
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session ?? null
      setSession(s)
      await resolveAdmin(s)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s ?? null)
      await resolveAdmin(s ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function resolveAdmin(s: Session | null) {
    if (!s || !supabase) { setIsAdmin(false); return }
    if (s.user.email === import.meta.env.VITE_ADMIN_EMAIL) { setIsAdmin(true); return }
    if (s.user.app_metadata?.role === 'admin' || s.user.user_metadata?.role === 'admin') { setIsAdmin(true); return }
    const { data } = await supabase.from('admins').select('id').eq('user_id', s.user.id).maybeSingle()
    setIsAdmin(!!data)
  }

  useEffect(() => {
    if (loading) return
    if (!session || !isAdmin) navigate('/', { replace: true })
  }, [loading, session, isAdmin, navigate])

  useEffect(() => {
    if (!isAdmin) return
    fetchAllEvents().then((data) => { setEvents(data); setEventsLoading(false); setSelected(data[0] ?? null) })
  }, [isAdmin])

  if (loading || (session && !isAdmin && !loading)) {
    return <div className="adm-loading"><div className="adm-loading__spinner" /></div>
  }
  if (!session) return null

  const displayName =
    session.user?.user_metadata?.first_name ||
    session.user?.email?.split('@')[0] ||
    'Admin'

  async function handleSaveEdit(updated: EventRecord) {
    setSaving(true)
    setOpError(null)
    const saved = await upsertEvent(updated)
    if (saved) {
      setEvents((prev) => {
        const idx = prev.findIndex((e) => e.id === saved.id)
        return idx >= 0 ? prev.map((e) => e.id === saved.id ? saved : e) : [saved, ...prev]
      })
      setSelected(saved)
      setEditingEvent(null)
    } else {
      setOpError('Save failed — your Supabase user is not in the admins table yet. Run the bootstrap SQL from the setup guide.')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this hackathon? This cannot be undone.')) return
    setDeleting(true)
    setOpError(null)
    const ok = await deleteEvent(id)
    if (ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id))
      setSelected(null)
    } else {
      setOpError('Delete failed — your Supabase user is not in the admins table yet. Run the bootstrap SQL from the setup guide.')
    }
    setDeleting(false)
  }

  const eventsWithStatus = events.map((e) => ({ ...e, _status: computeStatus(e) }))
  const filtered = filterStatus === 'all'
    ? eventsWithStatus
    : eventsWithStatus.filter((e) => e._status === filterStatus)

  const grouped     = groupByDate(filtered)
  const sortedDates = Object.keys(grouped).sort().reverse()
  const allSorted   = sortedDates.flatMap((d) => grouped[d])
  const totalPages  = Math.max(1, Math.ceil(allSorted.length / PAGE_SIZE))
  const safePage    = Math.min(page, totalPages)
  const pageSlice   = allSorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const pageGrouped = groupByDate(pageSlice)
  const pageDates   = Object.keys(pageGrouped).sort().reverse()

  const hackathonDates = new Set(events.map((e) => e.startDate))
  const daysInMonth    = getDaysInMonth(calYear, calMonth)
  const firstDay       = getFirstDayOfMonth(calYear, calMonth)
  const today          = new Date()

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1) } else setCalMonth((m) => m - 1) }
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1) } else setCalMonth((m) => m + 1) }

  const upcoming         = eventsWithStatus.filter((e) => e._status === 'upcoming' || e._status === 'open-reg')
  const active           = eventsWithStatus.filter((e) => e._status === 'active')
  const totalParticipants = events.reduce((s, e) => s + e.currentParticipants, 0)
  const totalTeams        = events.reduce((s, e) => s + e.currentTeams, 0)

  const selectedStatus = selected ? computeStatus(selected) : null

  return (
    <div className="adm">
      {/* Sidebar */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar__logo">///</div>
        <nav className="adm-sidebar__nav">
          <button className="adm-sidebar__btn" onClick={() => navigate('/')} title="Home"><IconHome /></button>
          <button
            className={`adm-sidebar__btn${view === 'events' ? ' adm-sidebar__btn--active' : ''}`}
            onClick={() => setView('events')}
            title="Hackathon Management"
          ><IconZap /></button>
          <button
            className={`adm-sidebar__btn${view === 'admins' ? ' adm-sidebar__btn--active' : ''}`}
            onClick={() => setView('admins')}
            title="Admin Management"
          ><IconPeople /></button>
          <button className="adm-sidebar__btn" onClick={() => navigate('/hackathons')} title="View Public Hackathons"><IconExternalLink /></button>
        </nav>
        <button className="adm-sidebar__avatar" title={displayName} onClick={() => navigate('/profile')}>
          {displayName.charAt(0).toUpperCase()}
        </button>
      </aside>

      {/* Left panel — always visible */}
      <div className="adm-left">
        <div className="adm-left__head">
          <h1 className="adm-left__title">Dashboard</h1>
          <span className="adm-left__sub">Admin Portal</span>
        </div>

        <div className="adm-cal">
          <div className="adm-cal__head">
            <span className="adm-cal__month">{formatMonthYear(calYear, calMonth)}</span>
            <div className="adm-cal__arrows">
              <button onClick={prevMonth}>‹</button>
              <button onClick={nextMonth}>›</button>
            </div>
          </div>
          <div className="adm-cal__grid">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
              <span key={d} className="adm-cal__label">{d}</span>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <span key={`g${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const ds  = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday  = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day
              const hasEvent = hackathonDates.has(ds)
              return (
                <button key={day} className={['adm-cal__day', isToday ? 'adm-cal__day--today' : '', hasEvent ? 'adm-cal__day--event' : ''].filter(Boolean).join(' ')}>
                  {day}
                </button>
              )
            })}
          </div>
        </div>

        <div className="adm-stats">
          <div className="adm-stats__item">
            <span className="adm-stats__val">{upcoming.length + active.length}</span>
            <span className="adm-stats__lbl">Live / Soon</span>
          </div>
          <div className="adm-stats__item">
            <span className="adm-stats__val">{totalTeams}</span>
            <span className="adm-stats__lbl">Teams</span>
          </div>
          <div className="adm-stats__item">
            <span className="adm-stats__val">{totalParticipants}</span>
            <span className="adm-stats__lbl">Participants</span>
          </div>
        </div>

        {active.length > 0 && (
          <div className="adm-active-banner">
            <span className="adm-active-banner__dot" />
            <div>
              <p className="adm-active-banner__title">{active[0].title}</p>
              <p className="adm-active-banner__sub">
                Live now · ends {new Date(`${active[0].endDate}T${active[0].endTime}:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {upcoming.length > 0 && (
          <CountdownTimer target={getStartDateTime(upcoming[0])} label={upcoming[0].title} />
        )}
      </div>

      {/* Center panel — events or admins */}
      {view === 'admins' ? (
        <AdminsPanel currentUserEmail={session.user.email ?? ''} />
      ) : (
        <div className="adm-schedule">
          <div className="adm-schedule__head">
            <h2>Hackathon Schedule</h2>
            <div className="adm-schedule__controls">
              <div className="adm-schedule__filters">
                {(['all', 'active', 'open-reg', 'upcoming', 'completed', 'draft'] as FilterStatus[]).map((s) => (
                  <button
                    key={s}
                    className={`adm-schedule__filter${filterStatus === s ? ' adm-schedule__filter--active' : ''}`}
                    onClick={() => { setFilterStatus(s); setPage(1) }}
                  >
                    {s === 'all' ? 'All' : publicStatusLabel(s as ComputedStatus)}
                  </button>
                ))}
              </div>
              <div className="adm-schedule__new-group">
                <button className="adm-schedule__generate" onClick={() => setShowGenerateModal(true)}>
                  ✨ Generate
                </button>
                <button className="adm-schedule__new" onClick={() => setEditingEvent(newBlankEvent())}>
                  + New
                </button>
              </div>
            </div>
          </div>

          {opError && (
            <div className="adm-op-error">
              <span>{opError}</span>
              <button onClick={() => setOpError(null)}>✕</button>
            </div>
          )}

          <div className="adm-schedule__body">
            {eventsLoading ? (
              <div className="adm-schedule__empty">Loading events…</div>
            ) : pageDates.map((date) => (
              <div key={date} className="adm-schedule__group">
                <div className="adm-schedule__date">{formatDateLabel(date)}</div>
                {pageGrouped[date].map((h) => (
                  <button
                    key={h.id}
                    className={`adm-schedule__row${selected?.id === h.id ? ' adm-schedule__row--active' : ''}`}
                    onClick={() => setSelected(h)}
                  >
                    <div className="adm-schedule__time">
                      <span>{h.startTime}</span>
                      <span>{h.endTime}</span>
                    </div>
                    <div className="adm-schedule__info">
                      <span className="adm-schedule__name">{h.title}</span>
                      <span className="adm-schedule__cat">{h.category}</span>
                    </div>
                    <span className={`adm-schedule__badge adm-schedule__badge--${h._status}`}>
                      {publicStatusLabel(h._status)}
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {!eventsLoading && pageDates.length === 0 && (
              <div className="adm-schedule__empty">No hackathons match this filter.</div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="adm-pagination">
              <button className="adm-pagination__arrow" disabled={safePage === 1} onClick={() => setPage((p) => p - 1)}>‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={`adm-pagination__num${safePage === n ? ' adm-pagination__num--active' : ''}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
              <button className="adm-pagination__arrow" disabled={safePage === totalPages} onClick={() => setPage((p) => p + 1)}>›</button>
            </div>
          )}
        </div>
      )}

      {showGenerateModal && (
        <GenerateModal
          onGenerated={(generated) => { setShowGenerateModal(false); setEditingEvent(generated) }}
          onClose={() => setShowGenerateModal(false)}
        />
      )}

      {editingEvent && (
        <EditModal
          event={editingEvent}
          onSave={handleSaveEdit}
          onClose={() => { setEditingEvent(null); setOpError(null) }}
          saving={saving}
          saveError={opError}
        />
      )}

      {/* Right panel — detail (events view only) */}
      {view === 'events' && (
        <div className="adm-detail">
          {selected ? (
            <>
              <div className="adm-detail__top">
                <span className="adm-detail__badge">{selected.category}</span>
                <span className={`adm-schedule__badge adm-schedule__badge--${selectedStatus}`}>
                  {selectedStatus ? publicStatusLabel(selectedStatus) : ''}
                </span>
              </div>
              <h2 className="adm-detail__title">{selected.title}</h2>

              <div className="adm-detail__actions">
                <button className="adm-detail__edit" onClick={() => setEditingEvent(selected)}>Edit</button>
                <button
                  className="adm-detail__icon-btn adm-detail__icon-btn--archive"
                  title={selected.published ? 'Unpublish' : 'Publish'}
                  onClick={() => handleSaveEdit({ ...selected, published: !selected.published })}
                  disabled={saving}
                >
                  <IconArchive />
                </button>
                <button
                  className="adm-detail__icon-btn adm-detail__icon-btn--delete"
                  title="Delete"
                  onClick={() => handleDelete(selected.id)}
                  disabled={deleting}
                >
                  <IconTrash />
                </button>
              </div>

              <p className="adm-detail__desc">{selected.description}</p>

              {(selectedStatus === 'upcoming' || selectedStatus === 'open-reg') && (
                <CountdownTimer target={getStartDateTime(selected)} label="Starts" />
              )}
              {selectedStatus === 'active' && (
                <CountdownTimer target={getEndDateTime(selected)} label="Ends" />
              )}

              <div className="adm-detail__image">
                <IconImage />
                <span>{selected.location} · {selected.format}</span>
              </div>

              <div className="adm-detail__tags">
                {selected.tags.map((t) => <span key={t} className="adm-detail__tag">{t}</span>)}
              </div>

              <div className="adm-detail__dates">
                <span>{formatDateLabel(selected.startDate)} {selected.startTime}</span>
                <span className="adm-detail__dates-sep">→</span>
                <span>{formatDateLabel(selected.endDate)} {selected.endTime}</span>
              </div>

              <div className="adm-detail__stats">
                {[
                  { label: 'Duration', val: selected.duration, pct: 60 },
                  {
                    label: 'Teams',
                    val: selected.maxTeams > 0 ? `${selected.currentTeams}/${selected.maxTeams}` : '—',
                    pct: selected.maxTeams > 0 ? Math.round((selected.currentTeams / selected.maxTeams) * 100) : 0,
                  },
                  {
                    label: 'Participants',
                    val: `${selected.currentParticipants}/${selected.maxParticipants}`,
                    pct: selected.maxParticipants > 0 ? Math.round((selected.currentParticipants / selected.maxParticipants) * 100) : 0,
                  },
                  { label: 'Prize Pool', val: selected.prizePool, pct: 100, gold: true },
                ].map(({ label, val, pct, gold }) => (
                  <div key={label} className="adm-detail__stat">
                    <span className="adm-detail__stat-lbl">{label}</span>
                    <div className="adm-detail__stat-row">
                      <div className="adm-detail__track">
                        <div className={`adm-detail__fill${gold ? ' adm-detail__fill--gold' : ''}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="adm-detail__stat-val">{val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="adm-detail__empty">
              <p>Select a hackathon to view details</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
