import { useEffect, useRef, useState } from 'react'
import { GoogleGenAI } from '@google/genai'
import { fetchPublicEvents, type EventRecord } from '../../lib/eventUtils'
import './ChatWidget.css'

interface Message {
  role: 'user' | 'model'
  text: string
}

const QUICK_PROMPTS = [
  { emoji: '⚡', text: 'Surprise me with a wild project idea' },
  { emoji: '🎵', text: 'I love music + tech — what can I build?' },
  { emoji: '🤖', text: 'Best AI project for a first hackathon?' },
  { emoji: '🏆', text: "What events are coming up?" },
]

function buildSystemPrompt(events: EventRecord[]) {
  return `You are a creative spark — an AI brainstorming partner built into the Augusta Dev hackathon platform. Your one job is to ignite ideas. You help people dream up projects to build at hackathons: wild, practical, weird, ambitious, absurd, or groundbreaking. No idea is too big or too small.

Here is the current hackathon event data so you can tie ideas to real upcoming themes and challenges:
${JSON.stringify(events, null, 2)}

Your personality:
- Enthusiastic, energetic, and genuinely excited about building things
- You think big AND think weird — suggest ideas that surprise people
- You ask one sharp follow-up question to push the idea further or help narrow focus
- You never shut down an idea — you always find the angle that makes it interesting
- You think across all domains: health, art, music, education, climate, gaming, social, finance, AI, hardware, absurdist projects, anything
- Short punchy responses with energy — not lectures. Use line breaks and bullet points sparingly for clarity

What you do:
- Generate creative, specific project ideas based on the user's interests, skills, or a theme
- Help users refine a vague idea into something concrete and buildable
- Suggest surprising tech combinations ("what if you used X to solve Y?")
- Connect ideas to upcoming hackathon events when relevant and registration is open
- Inspire people who are stuck, bored, or don't know where to start

What you don't do:
- Act as a customer support bot or FAQ for event logistics — if someone asks about registration or schedules, answer briefly then pivot back to ideas
- Reject ideas for being unrealistic — lean in and make unrealistic ideas interesting
- Write long essays — keep it punchy and conversational

Boilerplate generation:
- When a user lands on a specific project idea they're excited about, end your response with the exact token <<BOILERPLATE_LINK>> on its own line — nothing else on that line.
- Only include <<BOILERPLATE_LINK>> when there is a concrete buildable idea, not during general brainstorming or vague exploration.`
}

const MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
]

const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

const AISTUDIO_BOILERPLATE_URL =
  'https://aistudio.google.com/prompts/new_chat?preamble=' +
  encodeURIComponent(
    'You are an expert full-stack developer and hackathon mentor. ' +
    'The user will describe their project idea. Generate a complete boilerplate starter template including:\n' +
    '1. File and folder structure overview\n' +
    '2. Main code files with inline comments (HTML/CSS/JS or React/Next.js as appropriate)\n' +
    '3. package.json with required dependencies\n' +
    '4. README.md with setup and run instructions\n' +
    'Make the code clean, well-commented, and ready to build on.'
  )

function renderMessage(text: string) {
  const MARKER = '<<BOILERPLATE_LINK>>'
  if (!text.includes(MARKER)) return <>{text}</>

  const [before, ...rest] = text.split(MARKER)
  const after = rest.join('').trimStart()

  return (
    <>
      {before.trimEnd()}
      {'\n'}
      <a
        href={AISTUDIO_BOILERPLATE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="cw-boilerplate-btn"
      >
        🚀 Generate boilerplate in AI Studio
      </a>
      {after && <>{'\n'}{after}</>}
    </>
  )
}

export default function ChatWidget() {
  const [isOpen, setIsOpen]       = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const [messages, setMessages]   = useState<Message[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [initError, setInitError] = useState(false)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chatRef      = useRef<any>(null)
  const modelIdxRef  = useRef(0)
  const aiRef        = useRef<GoogleGenAI | null>(null)
  const systemPromptRef = useRef<string>('')
  const bottomRef    = useRef<HTMLDivElement>(null)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)

  function buildChat(ai: GoogleGenAI, modelIdx: number) {
    return ai.chats.create({
      model: MODEL_CANDIDATES[modelIdx],
      config: { systemInstruction: systemPromptRef.current },
    })
  }

  useEffect(() => {
    if (!apiKey) {
      console.warn('[ChatWidget] VITE_GEMINI_API_KEY is not set.')
      setInitError(true)
      return
    }
    async function init() {
      try {
        const events = await fetchPublicEvents()
        systemPromptRef.current = buildSystemPrompt(events)
        const ai = new GoogleGenAI({ apiKey: apiKey! })
        aiRef.current = ai
        chatRef.current = buildChat(ai, 0)
        console.info(`[ChatWidget] Init with model: ${MODEL_CANDIDATES[0]}, ${events.length} events loaded`)
      } catch (err) {
        console.error('[ChatWidget] Failed to init:', err)
        setInitError(true)
      }
    }
    init()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setHasOpened(true)
      setTimeout(() => textareaRef.current?.focus(), 150)
    }
  }, [isOpen])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading || !chatRef.current) return

    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setMessages((prev) => [...prev, { role: 'user', text: msg }])
    setLoading(true)

    let succeeded = false

    while (!succeeded && modelIdxRef.current < MODEL_CANDIDATES.length) {
      try {
        const stream = await chatRef.current.sendMessageStream({ message: msg })
        let full = ''
        setMessages((prev) => [...prev, { role: 'model', text: '' }])

        for await (const chunk of stream) {
          full += chunk.text ?? ''
          setMessages((prev) => [
            ...prev.slice(0, -1),
            { role: 'model', text: full },
          ])
        }

        succeeded = true
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        const isModelErr =
          errMsg.includes('404') ||
          errMsg.includes('not found') ||
          (errMsg.includes('429') && errMsg.includes('quota'))

        if (isModelErr && modelIdxRef.current < MODEL_CANDIDATES.length - 1) {
          modelIdxRef.current += 1
          const nextModel = MODEL_CANDIDATES[modelIdxRef.current]
          console.warn(`[ChatWidget] Model failed, switching to ${nextModel}`)
          chatRef.current = buildChat(aiRef.current!, modelIdxRef.current)
          setMessages((prev) =>
            prev[prev.length - 1]?.role === 'model' && prev[prev.length - 1].text === ''
              ? prev.slice(0, -1)
              : prev
          )
        } else {
          console.error('[ChatWidget] sendMessage error:', err)
          setMessages((prev) => {
            const last = prev[prev.length - 1]
            if (last?.role === 'model' && last.text === '') {
              return [...prev.slice(0, -1), { role: 'model', text: 'Something went wrong — try again.' }]
            }
            return [...prev, { role: 'model', text: 'Something went wrong — try again.' }]
          })
          succeeded = true
        }
      }
    }

    setLoading(false)
  }

  function clearChat() {
    setMessages([])
    if (aiRef.current) {
      chatRef.current = buildChat(aiRef.current, modelIdxRef.current)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="cw">
      {/* Panel */}
      <div className={`cw-panel${isOpen ? ' cw-panel--open' : ''}`} aria-hidden={!isOpen}>
        {/* Header */}
        <div className="cw-panel__header">
          <div className="cw-panel__header-info">
            <div className="cw-panel__avatar">⚡</div>
            <div className="cw-panel__header-text">
              <span className="cw-panel__title">Glitchy</span>
              <span className="cw-panel__subtitle">
                <span className={`cw-panel__dot${initError ? ' cw-panel__dot--error' : ''}`} />
                {initError ? 'Offline' : 'Augusta Dev · online'}
              </span>
            </div>
          </div>
          <div className="cw-panel__header-actions">
            {messages.length > 0 && (
              <button className="cw-panel__action-btn" onClick={clearChat} title="Clear chat" aria-label="Clear chat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                </svg>
              </button>
            )}
            <button className="cw-panel__close" onClick={() => setIsOpen(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="cw-panel__messages">
          {isEmpty && (
            <div className="cw-panel__welcome">
              <div className="cw-panel__welcome-glow">⚡</div>
              {initError ? (
                <>
                  <p className="cw-panel__welcome-title">Not configured</p>
                  <p className="cw-panel__welcome-sub">Add <code>VITE_GEMINI_API_KEY</code> to your <code>.env.local</code> and restart.</p>
                </>
              ) : (
                <>
                  <p className="cw-panel__welcome-title">What should we build?</p>
                  <p className="cw-panel__welcome-sub">Drop a vibe, a problem, an industry — I'll turn it into a hackathon idea.</p>
                  <div className="cw-panel__prompts">
                    {QUICK_PROMPTS.map((p) => (
                      <button
                        key={p.text}
                        className="cw-panel__prompt-chip"
                        onClick={() => sendMessage(p.text)}
                        disabled={loading}
                      >
                        <span className="cw-panel__prompt-emoji">{p.emoji}</span>
                        {p.text}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`cw-msg cw-msg--${m.role}`}>
              {m.role === 'model' && <div className="cw-msg__avatar">⚡</div>}
              <p className="cw-msg__text">{renderMessage(m.text)}</p>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== 'model' && (
            <div className="cw-msg cw-msg--model">
              <div className="cw-msg__avatar">⚡</div>
              <p className="cw-msg__text cw-msg__text--typing">
                <span /><span /><span />
              </p>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="cw-panel__input-row">
          <textarea
            ref={textareaRef}
            className="cw-panel__input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={initError ? 'AI not configured' : 'Drop an idea, a vibe, anything…'}
            disabled={loading || initError}
            aria-label="Chat input"
          />
          <button
            className="cw-panel__send"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim() || initError}
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </div>
        <p className="cw-panel__hint">Shift+Enter to send · Enter for new line</p>
      </div>

      {/* FAB */}
      <button
        className={`cw-fab${isOpen ? ' cw-fab--open' : ''}${!hasOpened ? ' cw-fab--pulse' : ''}`}
        onClick={() => setIsOpen((o) => !o)}
        aria-label={isOpen ? 'Close assistant' : 'Open assistant'}
      >
        <span className="cw-fab__icon cw-fab__icon--chat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </span>
        <span className="cw-fab__icon cw-fab__icon--close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </span>
      </button>
    </div>
  )
}
