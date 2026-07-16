import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'
import {
  createRegistration,
  updateRegistration,
  type Registration,
} from '../../lib/registrationUtils'
import './RegistrationModal.css'

interface Props {
  eventId:     string
  eventTitle:  string
  colorHex:    string
  colorRgb:    string
  userId:      string
  userEmail:   string
  existing:    Registration | null
  onClose:     () => void
  onSaved:     (reg: Registration) => void
}

const EXPERIENCE_OPTS = ['Beginner', 'Intermediate', 'Advanced', 'Expert'] as const

export default function RegistrationModal({
  eventId, eventTitle, colorHex, colorRgb,
  userId, userEmail, existing, onClose, onSaved,
}: Props) {
  const [fullName,        setFullName]        = useState(existing?.fullName        ?? '')
  const [teamName,        setTeamName]        = useState(existing?.teamName        ?? '')
  const [teamMembers,     setTeamMembers]     = useState(existing?.teamMembers     ?? '')
  const [experienceLevel, setExperienceLevel] = useState(existing?.experienceLevel ?? 'Beginner')
  const [projectIdea,     setProjectIdea]     = useState(existing?.projectIdea     ?? '')
  const [agreed,          setAgreed]          = useState(existing ? true : false)
  const [saving,          setSaving]          = useState(false)
  const [error,           setError]           = useState<string | null>(null)

  const isEdit = !!existing
  const overlayRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const ideaLen = projectIdea.length

  const handleSubmit = async () => {
    setError(null)
    if (!fullName.trim()) { setError('Full name is required.'); return }
    if (!agreed)          { setError('Please agree to the event rules.'); return }

    setSaving(true)
    try {
      if (isEdit && existing) {
        const ok = await updateRegistration(existing.id, {
          fullName: fullName.trim(),
          teamName: teamName.trim(),
          teamMembers: teamMembers.trim(),
          experienceLevel,
          projectIdea: projectIdea.trim(),
        })
        if (!ok) { setError('Failed to update registration. Please try again.'); return }
        onSaved({ ...existing, fullName: fullName.trim(), teamName: teamName.trim(), teamMembers: teamMembers.trim(), experienceLevel, projectIdea: projectIdea.trim() })
      } else {
        const reg = await createRegistration({
          eventId,
          userId,
          fullName: fullName.trim(),
          email: userEmail,
          teamName: teamName.trim(),
          teamMembers: teamMembers.trim(),
          experienceLevel,
          projectIdea: projectIdea.trim(),
        })
        if (!reg) { setError('Failed to register. Please try again.'); return }
        onSaved(reg)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="reg-overlay"
      ref={overlayRef}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className="reg-modal"
        style={{ '--reg-color': colorHex, '--reg-rgb': colorRgb } as React.CSSProperties}
      >
        {/* Header */}
        <div className="reg-modal__head">
          <div className="reg-modal__head-text">
            <span className="reg-modal__eyebrow">{eventTitle}</span>
            <h2 className="reg-modal__title">
              {isEdit ? 'Edit Registration' : 'Register for this Event'}
            </h2>
          </div>
          <button type="button" className="reg-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="reg-modal__body">
          {error && <div className="reg-error"><X size={14} /> {error}</div>}

          {/* Name + Email */}
          <div className="reg-row">
            <div className="reg-field">
              <label className="reg-label">
                Full Name <span aria-hidden="true">*</span>
              </label>
              <input
                className="reg-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                autoFocus
              />
            </div>
            <div className="reg-field">
              <label className="reg-label">Email</label>
              <input
                className="reg-input"
                type="email"
                value={userEmail}
                disabled
                readOnly
              />
            </div>
          </div>

          {/* Team */}
          <div className="reg-row">
            <div className="reg-field">
              <label className="reg-label">
                Team Name <span className="reg-label__opt">(optional)</span>
              </label>
              <input
                className="reg-input"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="The Builders"
              />
            </div>
            <div className="reg-field">
              <label className="reg-label">
                Experience Level <span aria-hidden="true">*</span>
              </label>
              <select
                className="reg-select"
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
              >
                {EXPERIENCE_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Team members */}
          <div className="reg-field">
            <label className="reg-label">
              Team Members <span className="reg-label__opt">(optional — solo is fine)</span>
            </label>
            <textarea
              className="reg-textarea"
              value={teamMembers}
              onChange={(e) => setTeamMembers(e.target.value)}
              placeholder={"Alex Johnson — alex@example.com\nSam Lee — sam@example.com"}
              rows={3}
            />
          </div>

          <div className="reg-divider">
            <div className="reg-divider__line" />
            <span className="reg-divider__label">Project</span>
            <div className="reg-divider__line" />
          </div>

          {/* Project idea */}
          <div className="reg-field">
            <label className="reg-label">
              What are you hoping to build? <span className="reg-label__opt">(optional)</span>
            </label>
            <textarea
              className="reg-textarea"
              value={projectIdea}
              onChange={(e) => setProjectIdea(e.target.value.slice(0, 280))}
              placeholder="A quick pitch for your idea — you can always change this later."
              rows={3}
            />
            <span className={`reg-char-count${ideaLen > 250 ? ' reg-char-count--warn' : ''}`}>
              {ideaLen} / 280
            </span>
          </div>

          {/* Rules */}
          <div
            className={`reg-rules${agreed ? ' reg-rules--checked' : ''}`}
            onClick={() => setAgreed((a) => !a)}
          >
            <div className="reg-rules__check" aria-hidden="true">
              <Check size={11} strokeWidth={3} color="#fff" />
            </div>
            <p className="reg-rules__text">
              I agree to follow the event rules and the Augusta Dev code of conduct.
              I understand that violating these may result in disqualification.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="reg-modal__foot">
          <button type="button" className="reg-cancel" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="reg-submit"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving
              ? <><div className="reg-submit__spinner" /> Saving…</>
              : isEdit ? 'Save Changes' : 'Complete Registration'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
