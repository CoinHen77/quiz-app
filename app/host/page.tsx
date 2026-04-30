'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listQuizzes, deleteQuiz } from '@/lib/quizzes'
import type { Quiz } from '@/lib/firebase'

export default function HostPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setQuizzes(await listQuizzes())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeletingId(id)
    await deleteQuiz(id)
    setQuizzes(q => q.filter(x => x.id !== id))
    setDeletingId(null)
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Quizzes</h1>
          <Link
            href="/host/edit/new"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
          >
            + New Quiz
          </Link>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-gray-400 text-lg">No quizzes yet.</p>
            <Link href="/host/edit/new" className="text-indigo-400 hover:text-indigo-300 underline">
              Create your first quiz
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {quizzes.map(quiz => (
              <li
                key={quiz.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-lg leading-tight">{quiz.title}</p>
                  <p className="text-gray-400 text-sm mt-0.5">
                    {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    href={`/host/edit/${quiz.id}`}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/host/play/${quiz.id}`}
                    className="px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    Play
                  </Link>
                  <button
                    onClick={() => handleDelete(quiz.id, quiz.title)}
                    disabled={deletingId === quiz.id}
                    className="px-3 py-1.5 bg-red-900 hover:bg-red-800 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    {deletingId === quiz.id ? '…' : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
