'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createQuiz, getQuiz, saveQuiz } from '@/lib/quizzes'
import type { Question } from '@/lib/firebase'

function emptyQuestion(): Question {
  return { order: 0, text: '', options: ['', ''], correctIndex: 0, timeLimitSeconds: 20 }
}

export default function EditQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>
}) {
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
      const opts = [...q.options]
      opts[oi] = value
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
      return {
        ...q,
        options: opts,
        correctIndex: q.correctIndex >= opts.length ? 0 : q.correctIndex,
      }
    }))
  }

  function addQuestion() {
    setQuestions(qs => [...qs, { ...emptyQuestion(), order: qs.length }])
  }

  function removeQuestion(qi: number) {
    setQuestions(qs =>
      qs.filter((_, i) => i !== qi).map((q, i) => ({ ...q, order: i }))
    )
  }

  async function handleSave() {
    if (!title.trim()) { setError('Quiz title is required'); return }
    for (const [i, q] of questions.entries()) {
      if (!q.text.trim()) { setError(`Question ${i + 1} needs a text`); return }
      if (q.options.some(o => !o.trim())) { setError(`Question ${i + 1} has a blank option`); return }
    }
    setError(null)
    setSaving(true)
    try {
      const normalized = questions.map((q, i) => ({ ...q, order: i }))
      if (isNew) {
        await createQuiz({ title: title.trim(), questions: normalized })
      } else {
        await saveQuiz(quizId, { title: title.trim(), questions: normalized })
      }
      router.push('/host')
    } catch {
      setError('Save failed — check your Firebase connection.')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading quiz…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white pb-16">
      <div className="max-w-2xl mx-auto p-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{isNew ? 'New Quiz' : 'Edit Quiz'}</h1>
          <button
            onClick={() => router.push('/host')}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-400">Quiz Title</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Company Trivia Night"
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Questions */}
        <div className="space-y-5">
          {questions.map((q, qi) => (
            <div
              key={qi}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-indigo-400 text-sm">Question {qi + 1}</span>
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(qi)}
                    className="text-red-500 hover:text-red-400 text-xs transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                value={q.text}
                onChange={e => updateQuestion(qi, { text: e.target.value })}
                placeholder="Enter question text"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />

              <div className="space-y-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Options — circle to mark correct
                </p>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuestion(qi, { correctIndex: oi })}
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                        q.correctIndex === oi
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-600 hover:border-green-500'
                      }`}
                    />
                    <input
                      value={opt}
                      onChange={e => updateOption(qi, oi, e.target.value)}
                      placeholder={`Option ${oi + 1}`}
                      className="flex-1 px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {q.options.length > 2 && (
                      <button
                        onClick={() => removeOption(qi, oi)}
                        className="text-gray-600 hover:text-red-400 text-sm w-5 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {q.options.length < 4 && (
                  <button
                    onClick={() => addOption(qi)}
                    className="text-indigo-400 hover:text-indigo-300 text-sm mt-1 transition-colors"
                  >
                    + Add option
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-400">Time limit</label>
                <select
                  value={q.timeLimitSeconds}
                  onChange={e => updateQuestion(qi, { timeLimitSeconds: Number(e.target.value) })}
                  className="px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none"
                >
                  {[10, 15, 20, 30, 45, 60].map(t => (
                    <option key={t} value={t}>{t}s</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addQuestion}
          className="w-full py-3 border-2 border-dashed border-gray-700 hover:border-indigo-500 text-gray-400 hover:text-indigo-400 rounded-xl transition-colors"
        >
          + Add Question
        </button>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-colors"
        >
          {saving ? 'Saving…' : 'Save Quiz'}
        </button>
      </div>
    </main>
  )
}
