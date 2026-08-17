import { useEffect, useRef, useState } from 'react'
import { Globe, Link, Monitor, X } from 'lucide-react'

function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
    </svg>
  )
}
import {
  upsertSubmission,
  type ProjectSubmission,
} from '../../lib/registrationUtils'
import './RegistrationModal.css'

interface Props {
  eventId:    string
  eventTitle: string
  colorHex:   string
  colorRgb:   string
  userId:     string
  existing:   ProjectSubmission | null
  onClose:    () => void
  onSaved:    (sub: ProjectSubmission) => void
}

export default function ProjectSubmissionModal({
  eventId, eventTitle, colorHex, colorRgb,
  userId, existing, onClose, onSaved,
}: Props) {
  const [projectTitle, setProjectTitle] = useState(existing?.projectTitle ?? '')
  const [description,  setDescription]  = useState(existing?.description  ?? '')
  const [githubUrl,    setGithubUrl]    = useState(existing?.githubUrl    ?? '')
  const [demoUrl,      setDemoUrl]      = useState(existing?.demoUrl      ?? '')
  const [videoUrl,     setVideoUrl]     = useState(existing?.videoUrl     ?? '')
  const [slidesUrl,    setSlidesUrl]    = useState(existing?.slidesUrl    ?? '')
  const [techStack,    setTechStack]    = useState(existing?.techStack    ?? '')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const isEdit     = !!existing
  const overlayRef = useRef<HTMLDivElement>(null)
  const descLen    = description.length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const handleSubmit = async () => {
    setError(null)
    if (!projectTitle.trim())                    { setError('Project title is required.'); return }
    if (!description.trim())                     { setError('Description is required.'); return }
    if (!githubUrl && !demoUrl && !videoUrl)     { setError('Please provide at least one link — GitHub repo, live demo, or video.'); return }

    setSaving(true)
    try {
      const sub = await upsertSubmission({
        eventId,
        userId,
        projectTitle: projectTitle.trim(),
        description:  description.trim(),
        githubUrl:    githubUrl.trim(),
        demoUrl:      demoUrl.trim(),
        videoUrl:     videoUrl.trim(),
        slidesUrl:    slidesUrl.trim(),
        techStack:    techStack.trim(),
      })
      if (!sub) { setError('Submission failed. Please try again.'); return }
      onSaved(sub)
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
              {isEdit ? 'Edit Project Submission' : 'Submit Your Project'}
            </h2>
          </div>
          <button type="button" className="reg-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div className="reg-modal__body">
          {error && <div className="reg-error"><X size={14} /> {error}</div>}

          <div className="reg-field">
            <label className="reg-label">
              Project Title <span aria-hidden="true">*</span>
            </label>
            <input
              className="reg-input"
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="What's your project called?"
              autoFocus
            />
          </div>

          <div className="reg-field">
            <label className="reg-label">
              What did you build? <span aria-hidden="true">*</span>
            </label>
            <textarea
              className="reg-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 600))}
              placeholder="Describe your project — what problem it solves, how it works, and what you're most proud of."
              rows={4}
            />
            <span className={`reg-char-count${descLen > 540 ? ' reg-char-count--warn' : ''}`}>
              {descLen} / 600
            </span>
          </div>

          <div className="reg-divider">
            <div className="reg-divider__line" />
            <span className="reg-divider__label">Links — provide at least one</span>
            <div className="reg-divider__line" />
          </div>

          <div className="reg-field">
            <label className="reg-label">
              <GithubIcon size={11} /> GitHub Repository
            </label>
            <div className="reg-url-wrap">
              <span className="reg-url-icon"><GithubIcon size={14} /></span>
              <input
                className="reg-input"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/you/project"
              />
            </div>
          </div>

          <div className="reg-field">
            <label className="reg-label">
              <Globe size={11} /> Live Demo
            </label>
            <div className="reg-url-wrap">
              <span className="reg-url-icon"><Monitor size={14} /></span>
              <input
                className="reg-input"
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://my-project.vercel.app"
              />
            </div>
          </div>

          <div className="reg-field">
            <label className="reg-label">
              <Link size={11} /> Video Demo <span className="reg-label__opt">(Loom or YouTube)</span>
            </label>
            <div className="reg-url-wrap">
              <span className="reg-url-icon"><Link size={14} /></span>
              <input
                className="reg-input"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://loom.com/share/..."
              />
            </div>
          </div>

          <div className="reg-row">
            <div className="reg-field">
              <label className="reg-label">
                Slides <span className="reg-label__opt">(optional)</span>
              </label>
              <div className="reg-url-wrap">
                <span className="reg-url-icon"><Link size={14} /></span>
                <input
                  className="reg-input"
                  type="url"
                  value={slidesUrl}
                  onChange={(e) => setSlidesUrl(e.target.value)}
                  placeholder="https://slides.google.com/..."
                />
              </div>
            </div>
            <div className="reg-field">
              <label className="reg-label">
                Tech Stack <span className="reg-label__opt">(optional)</span>
              </label>
              <input
                className="reg-input"
                type="text"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                placeholder="React, Supabase, OpenAI"
              />
            </div>
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
              : isEdit ? 'Update Submission' : 'Submit Project'
            }
          </button>
        </div>
      </div>
    </div>
  )
}
