import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import TopBar from '../components/TopBar'
import BunqLogo from '../components/BunqLogo'
import { SparklesIcon, MicIcon, StopIcon, XIcon } from '../components/Icons'
import type { Page, EventDraft } from '../App'

type Props = {
  onBack: () => void
  onNavigate: (page: Page) => void
  setDraft: (d: EventDraft) => void
}

type TextMessage  = { kind: 'text';  text: string }
type VoiceMessage = { kind: 'voice'; url: string; blob: Blob; duration: number }
type Message = TextMessage | VoiceMessage

type MediaFile = {
  id: string
  file: File
  previewUrl: string
  kind: 'image' | 'video'
}

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm', 'video/quicktime',
])
const MAX_IMAGE = 10 * 1024 * 1024
const MAX_VIDEO = 50 * 1024 * 1024
const MAX_FILES = 5

function fmtDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function VoiceBubble({ url, duration }: { url: string; duration: number }) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  // Stable waveform heights — computed once per bubble instance
  const barHeights = useMemo(
    () => Array.from({ length: 20 }, (_, i) => 6 + Math.sin(i * 0.8) * 6 + Math.random() * 6),
    []
  )

  // Stop playback if the bubble is removed mid-play
  useEffect(() => () => { audioRef.current?.pause() }, [])

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(p => !p)
  }

  return (
    <div className="ai-bubble ai-voice-bubble">
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} />
      <button className="voice-play-btn" onClick={toggle}>
        {playing ? '⏸' : '▶'}
      </button>
      <div className="voice-bars">
        {barHeights.map((h, i) => (
          <span
            key={i}
            className={`voice-bar${playing ? ' playing' : ''}`}
            style={{ animationDelay: `${i * 60}ms`, height: `${h}px` }}
          />
        ))}
      </div>
      <span className="voice-duration">{fmtDuration(duration)}</span>
    </div>
  )
}

export default function AICreateEvent({ onBack, onNavigate, setDraft }: Props) {
  const [files, setFiles]             = useState<MediaFile[]>([])
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordSecs, setRecordSecs]   = useState(0)
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState('')

  const scrollRef       = useRef<HTMLDivElement>(null)
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const recorderRef     = useRef<MediaRecorder | null>(null)
  const chunksRef       = useRef<Blob[]>([])
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef    = useRef<number>(0)

  useEffect(() => {
    return () => {
      files.forEach(f => URL.revokeObjectURL(f.previewUrl))
      messages.forEach(m => { if (m.kind === 'voice') URL.revokeObjectURL(m.url) })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const addFiles = useCallback((selected: FileList | null) => {
    if (!selected) return
    const next: MediaFile[] = []
    let err = ''

    Array.from(selected).forEach(file => {
      if (files.length + next.length >= MAX_FILES) { err = `Maximum ${MAX_FILES} files allowed.`; return }
      if (!ALLOWED_TYPES.has(file.type)) { err = `${file.name} is not a supported type.`; return }
      const limit = file.type.startsWith('video/') ? MAX_VIDEO : MAX_IMAGE
      if (file.size > limit) { err = `${file.name} exceeds size limit.`; return }
      next.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        kind: file.type.startsWith('video/') ? 'video' : 'image',
      })
    })

    setError(err)
    setFiles(prev => [...prev, ...next])
  }, [files.length])

  const removeFile = (id: string) => {
    setFiles(prev => {
      const t = prev.find(f => f.id === id)
      if (t) URL.revokeObjectURL(t.previewUrl)
      return prev.filter(f => f.id !== id)
    })
  }

  const submitMessage = () => {
    const text = input.trim()
    if (!text) return
    setMessages(prev => [...prev, { kind: 'text', text }])
    setInput('')
    setError('')
  }

  const handleSkip = () => {
    if (files.length) {
      setDraft({ name: '', date: '', location: '', description: '', ticketTiers: [], mediaFiles: files.map(f => f.file) })
    }
    onNavigate('create-event')
  }

  const startRecording = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      startTimeRef.current = Date.now()
      setRecordSecs(0)

      timerRef.current = setInterval(() => {
        setRecordSecs(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 500)

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType })
      recorderRef.current = recorder

      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        clearInterval(timerRef.current!)
        const duration = (Date.now() - startTimeRef.current) / 1000
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url  = URL.createObjectURL(blob)
        setMessages(prev => [...prev, { kind: 'voice', url, blob, duration }])
        setIsRecording(false)
        setRecordSecs(0)
      }

      recorder.start(100)
      setIsRecording(true)
    } catch {
      setError('Microphone access denied. Please allow microphone in your browser.')
    }
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
  }

  const handleNext = async () => {
    setIsLoading(true)
    setError('')

    try {
      const body = new FormData()

      const textParts = messages
        .filter((m): m is TextMessage => m.kind === 'text')
        .map(m => m.text)
      if (input.trim()) textParts.push(input.trim())
      body.append('message', textParts.join('\n'))

      // Attach image/video files
      files.forEach(f => body.append('files', f.file, f.file.name))

      // Attach voice recordings as audio files
      messages
        .filter((m): m is VoiceMessage => m.kind === 'voice')
        .forEach((m, i) => body.append('files', m.blob, `voice-${i}.webm`))

      const res = await fetch('/api/agent/analyze-venue', { method: 'POST', body })
      if (!res.ok) throw new Error(await res.text())

      const draft: EventDraft = await res.json()
      setDraft({ ...draft, mediaFiles: files.map(f => f.file) })
      onNavigate('create-event')
    } catch {
      setError('AI analysis failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="ai-loading-screen">
        <div className="ai-loading-ring">
          <svg className="ai-loading-svg" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" className="ai-loading-track" />
            <circle cx="80" cy="80" r="70" className="ai-loading-arc" />
          </svg>
          <div className="ai-loading-logo">
            <BunqLogo size={72} />
          </div>
        </div>
        <p className="ai-loading-title">Analysing your venue…</p>
        <p className="ai-loading-sub">AI is preparing your event details</p>
      </div>
    )
  }

  return (
    <div className="ai-create-page">
      <div className="ai-create-scroll" ref={scrollRef}>
        <TopBar onBack={onBack} />

        <div className="ai-page-header">
          <h1 className="page-title" style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>
            Create with AI
          </h1>
          <p className="ai-page-subtitle">Let AI set up your event in seconds</p>
        </div>

        <div className="form-card ai-agent-card">
          <p className="ai-agent-label">bunq AI Assistant</p>
          <div className="ai-agent-body">
            <div className="ai-agent-icon">
              <SparklesIcon size={22} color="#fff" />
            </div>
            <p className="ai-agent-msg">
              Upload a photo or video of your venue, and I'll help you set it up.
            </p>
          </div>

          <div className="ai-card-divider" />

          <p className="ai-media-label">Venue photos &amp; videos</p>
          <div className="ai-media-grid">
            {files.map(f => (
              <div key={f.id} className="ai-thumb">
                {f.kind === 'image'
                  ? <img src={f.previewUrl} alt="" className="ai-thumb-media" />
                  : <video src={f.previewUrl} className="ai-thumb-media" preload="metadata" muted />
                }
                {f.kind === 'video' && <div className="ai-thumb-play">▶</div>}
                <div className="ai-thumb-check">✓</div>
                <button className="ai-thumb-remove" onClick={() => removeFile(f.id)}>
                  <XIcon size={10} color="#fff" />
                </button>
              </div>
            ))}

            {Array.from({ length: Math.max(1, Math.min(MAX_FILES - files.length, 3 - files.length)) }).map((_, i) => (
              <button key={i} className="ai-thumb ai-thumb-empty" onClick={() => fileInputRef.current?.click()}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <rect x="2" y="6" width="24" height="17" rx="3" stroke="#48484a" strokeWidth="1.6" />
                  <circle cx="14" cy="14.5" r="4" stroke="#48484a" strokeWidth="1.6" />
                  <path d="M10 6l1.5-2.5h5L18 6" stroke="#48484a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="21" cy="10" r="1.2" fill="#48484a" />
                </svg>
                <span className="ai-thumb-empty-label">{files.length === 0 && i === 0 ? 'Add photo' : 'Add'}</span>
              </button>
            ))}
          </div>

          {error && <p className="ai-error" style={{ marginTop: 8 }}>{error}</p>}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
          multiple
          style={{ display: 'none' }}
          onChange={e => { addFiles(e.target.files); e.target.value = '' }}
        />

        {/* Chat messages */}
        {messages.length > 0 && (
          <div className="ai-messages">
            {messages.map((msg, i) =>
              msg.kind === 'text'
                ? <div key={i} className="ai-bubble">{msg.text}</div>
                : <VoiceBubble key={i} url={msg.url} duration={msg.duration} />
            )}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="ai-bottom-bar">
        <div className="ai-input-row">
          <div className="ai-input-wrap">
            <span className="ai-input-icon">💬</span>
            <input
              className="ai-input"
              placeholder={isRecording ? `Recording… ${fmtDuration(recordSecs)}` : 'Describe your event…'}
              value={isRecording ? '' : input}
              onChange={e => !isRecording && setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitMessage() } }}
              disabled={isLoading || isRecording}
            />
          </div>
          <button
            className={`ai-mic-btn${isRecording ? ' recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
          >
            {isRecording
              ? <StopIcon size={16} color="#ff453a" />
              : <MicIcon size={18} color="#fff" />
            }
          </button>
        </div>

        <button className="ai-next-btn" onClick={handleNext} disabled={isRecording}>
          Next
        </button>
        <p className="ai-next-hint">AI will auto-fill your event details</p>

        <button className="ai-skip-btn" onClick={handleSkip} disabled={isLoading || isRecording}>
          Skip
        </button>
      </div>
    </div>
  )
}
