'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQuiz, getQuiz, saveQuiz } from '@/lib/quizzes'
import type { Question } from '@/lib/firebase'
import { Logo, Panel, BlockButton, Chip, OPTION_PALETTES, OPTION_LABELS } from '@/components/gameshow'

function emptyQuestion(): Question {
  return { order: 0, text: '', options: ['', ''], correctIndex: 0, timeLimitSeconds: 20 }
}

export default function EditQuizPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = use(params)
  const isNew = quizId === 'new'
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState<Question[]>([emptyQuestion()])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isNew) return
    getQuiz(quizId).then(quiz => {
      if (!quiz) { router.push('/host'); return }
      setTitle(quiz.title)
      setQuestions(quiz.questions.length > 0 ? quiz.questions : [emptyQuestion()])
      setLoading(false)
    })
  }, [quizId, isNew, router])

  function updateQuestion(qi: number, patch: Partial<Question>) {
    setQuestions(qs => qs.map((q, i) => i === qi ? { ...q, ...patch } : q))
  }
  function updateOption(qi: number, oi: number, value: string) {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qi) return q
      const opts = [...q.options]; opts[oi] = value
      return { ...q, options: opts }
    }))
  }
  function addOption(qi: number) {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qi || q.options.length >= 4) return q
      return { ...q, options: [...q.options, ''] }
    }))
  }
  function removeOption(qi: number, oi: number) {
    setQuestions(qs => qs.map((q, i) => {
      if (i !== qi || q.options.length <= 2) return q
      const opts = q.options.filter((_, j) => j !== oi)
      return { ...q, options: opts, correctIndex: q.correctIndex >= opts.length ? 0 : q.correctIndex }
    }))
  }
  function addQuestion() {
    setQuestions(qs => [...qs, { ...emptyQuestion(), order: qs.length }])
  }
  function removeQuestion(qi: number) {
    setQuestions(qs => qs.filter((_, i) => i !== qi).map((q, i) => ({ ...q, order: i })))
  }

  async function handleSave() {
    if (!title.trim()) { setError('Quiz title is required'); return }
    for (const [i, q] of questions.entries()) {
      if (!q.text.trim()) { setError(`Question ${i + 1} needs a text`); return }
      if (q.options.some(o => !o.trim())) { setError(`Question ${i + 1} has a blank option`); return }
    }
    setError(null); setSaving(true)
    try {
      const normalized = questions.map((q, i) => ({ ...q, order: i }))
      if (isNew) await createQuiz({ title: title.trim(), questions: normalized })
      else await saveQuiz(quizId, { title: title.trim(), questions: normalized })
      router.push('/host')
    } catch {
      setError('Save failed — check your Firebase connection.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center font-bungee" style={{ background: '#3a1f0a', color: '#ffd23f' }}>
        LOADING QUIZ…
      </main>
    )
  }

  return (
    <main className="min-h-screen pb-16" style={{ background: '#3a1f0a' }}>
      {/* Header bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#3a1f0a', borderBottom: '4px solid #ffd23f',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <BlockButton size="sm" variant="cream" onClick={() => router.push('/host')}>◀ BACK</BlockButton>
          <Logo size={32} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {error && (
            <div className="font-bungee" style={{ fontSize: 12, color: '#c44b6a', letterSpacing: '0.1em' }}>{error}</div>
          )}
          <BlockButton size="sm" variant="gold" onClick={handleSave} disabled={saving}>
            {saving ? 'SAVING…' : 'SAVE ▶'}
          </BlockButton>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Quiz title */}
        <Panel variant="cream" style={{ padding: 16 }}>
          <div className="font-bungee" style={{ fontSize: 11, letterSpacing: '0.3em', opacity: 0.7, marginBottom: 6, color: '#3a1f0a' }}>
            QUIZ TITLE
          </div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. COMPANY TRIVIA NIGHT"
            className="font-bungee"
            style={{
              width: '100%', background: '#fff', border: '4px solid #3a1f0a', borderRadius: 8,
              padding: '10px 14px', fontSize: 22, color: '#3a1f0a', letterSpacing: '0.04em',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </Panel>

        {/* Questions */}
        {questions.map((q, qi) => (
          <Panel key={qi} variant="cream" style={{ padding: 16 }}>
            {/* Question header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                className="font-bungee"
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#f56b1f', color: '#f7e9c4',
                  border: '3px solid #3a1f0a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0,
                }}
              >
                {qi + 1}
              </div>
              <div className="font-bungee" style={{ flex: 1, fontSize: 14, letterSpacing: '0.15em', color: '#3a1f0a', opacity: 0.6 }}>
                QUESTION {qi + 1}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Chip variant="gold" style={{ fontSize: 10 }}>{OPTION_LABELS[q.correctIndex]} ★</Chip>
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(qi)}
                    className="font-bungee"
                    style={{ color: '#c44b6a', fontSize: 12, letterSpacing: '0.1em', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    REMOVE
                  </button>
                )}
              </div>
            </div>

            {/* Question text */}
            <textarea
              value={q.text}
              onChange={e => updateQuestion(qi, { text: e.target.value })}
              placeholder="Enter question text"
              rows={2}
              className="font-inter"
              style={{
                width: '100%', background: '#fff', border: '4px solid #3a1f0a', borderRadius: 8,
                padding: '10px 14px', fontSize: 15, color: '#3a1f0a', fontWeight: 500,
                outline: 'none', boxSizing: 'border-box', resize: 'vertical', marginBottom: 10,
              }}
            />

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {q.options.map((opt, oi) => (
                <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => updateQuestion(qi, { correctIndex: oi })}
                    style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: q.correctIndex === oi ? '#ffd23f' : '#fff',
                      border: `3px solid ${q.correctIndex === oi ? '#3a1f0a' : '#ccc'}`,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                    }}
                  >
                    {q.correctIndex === oi && '★'}
                  </button>
                  <div
                    className="font-bungee"
                    style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: OPTION_PALETTES[oi], color: oi === 2 ? '#3a1f0a' : '#f7e9c4',
                      border: '3px solid #3a1f0a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                    }}
                  >
                    {OPTION_LABELS[oi]}
                  </div>
                  <input
                    value={opt}
                    onChange={e => updateOption(qi, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                    className="font-inter"
                    style={{
                      flex: 1, background: '#fff', border: '3px solid #3a1f0a', borderRadius: 6,
                      padding: '8px 12px', fontSize: 14, color: '#3a1f0a', fontWeight: 500,
                      outline: 'none',
                    }}
                  />
                  {q.options.length > 2 && (
                    <button
                      onClick={() => removeOption(qi, oi)}
                      style={{ color: '#c44b6a', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add option + time limit row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {q.options.length < 4 ? (
                <button
                  onClick={() => addOption(qi)}
                  className="font-bungee"
                  style={{ color: '#f56b1f', fontSize: 12, letterSpacing: '0.15em', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  + ADD OPTION
                </button>
              ) : <span />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="font-bungee" style={{ fontSize: 11, letterSpacing: '0.2em', color: '#3a1f0a', opacity: 0.7 }}>TIME</div>
                <select
                  value={q.timeLimitSeconds}
                  onChange={e => updateQuestion(qi, { timeLimitSeconds: Number(e.target.value) })}
                  className="font-bungee"
                  style={{
                    background: '#ffd23f', border: '3px solid #3a1f0a', borderRadius: 6,
                    padding: '6px 10px', fontSize: 13, color: '#3a1f0a', cursor: 'pointer', outline: 'none',
                  }}
                >
                  {[10, 15, 20, 30, 45, 60].map(t => <option key={t} value={t}>{t}s</option>)}
                </select>
              </div>
            </div>
          </Panel>
        ))}

        {/* Add question */}
        <button
          onClick={addQuestion}
          className="font-bungee"
          style={{
            border: '3px dashed #ffd23f', borderRadius: 10, padding: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            color: '#ffd23f', fontSize: 14, letterSpacing: '0.3em',
            background: 'none', cursor: 'pointer', width: '100%',
          }}
        >
          + ADD QUESTION
        </button>
      </div>
    </main>
  )
}
