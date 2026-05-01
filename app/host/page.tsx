'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { listQuizzes, deleteQuiz } from '@/lib/quizzes'
import type { Quiz } from '@/lib/firebase'
import { Sunburst, CarpetStripe, Logo, Panel, BlockButton, Chip } from '@/components/gameshow'

const ACCENT_COLORS = ['#f56b1f', '#2ec4b6', '#ffd23f', '#c44b6a']

export default function HostPage() {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try { setQuizzes(await listQuizzes()) }
    finally { setLoading(false) }
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
    <main className="min-h-screen relative overflow-hidden pb-24" style={{ background: '#3a1f0a' }}>
      <Sunburst />
      <CarpetStripe />

      <div className="relative z-10 p-6 md:p-8">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <Logo size={44} />
          <BlockButton
            size="sm" variant="cream"
            onClick={() => {
              document.cookie = 'host-auth=; Max-Age=0; path=/'
              router.push('/host/login')
            }}
          >
            SIGN OUT
          </BlockButton>
        </div>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <div>
            <div className="font-bungee" style={{ fontSize: 13, letterSpacing: '0.4em', color: '#ffd23f', marginBottom: 6 }}>
              ★ YOUR QUIZ SHOWS ★
            </div>
            <div
              className="font-bungee"
              style={{ fontSize: 38, color: '#f7e9c4', textShadow: '4px 4px 0 #3a1f0a', letterSpacing: '0.04em', lineHeight: 1.1 }}
            >
              READY TO BROADCAST
            </div>
          </div>
          <Link href="/host/edit/new">
            <BlockButton size="md" variant="gold">+ NEW QUIZ</BlockButton>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="font-bungee" style={{ color: '#ffd23f', fontSize: 18, letterSpacing: '0.2em', textAlign: 'center', padding: '40px 0' }}>
            LOADING…
          </div>
        ) : quizzes.length === 0 ? (
          <div
            className="font-bungee"
            style={{ border: '4px dashed #ffd23f', borderRadius: 12, padding: '60px 20px', textAlign: 'center', color: '#ffd23f', opacity: 0.6 }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>+</div>
            <div style={{ fontSize: 14, letterSpacing: '0.3em' }}>NO QUIZZES YET</div>
            <Link href="/host/edit/new" style={{ fontSize: 12, marginTop: 12, display: 'block', textDecoration: 'underline' }}>
              Create your first quiz
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {quizzes.map((quiz, idx) => {
              const accent = ACCENT_COLORS[idx % ACCENT_COLORS.length]
              const accentText = accent === '#ffd23f' ? '#3a1f0a' : '#f7e9c4'
              return (
                <Panel key={quiz.id} variant="cream" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div className="font-bungee" style={{ fontSize: 18, letterSpacing: '0.04em', lineHeight: 1.2, flex: 1, color: '#3a1f0a' }}>
                      {quiz.title}
                    </div>
                    <div
                      className="font-bungee"
                      style={{
                        width: 48, height: 48, borderRadius: 8, background: accent, color: accentText,
                        border: '4px solid #3a1f0a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0, boxShadow: '3px 3px 0 #3a1f0a',
                      }}
                    >
                      {quiz.questions.length}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Chip variant="teal" style={{ fontSize: 11 }}>{quiz.questions.length} QUESTIONS</Chip>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <Link href={`/host/play/${quiz.id}`} style={{ flex: 1 }}>
                      <BlockButton size="sm" variant="gold" style={{ width: '100%' }}>▶ PLAY</BlockButton>
                    </Link>
                    <Link href={`/host/edit/${quiz.id}`} style={{ flex: 1 }}>
                      <BlockButton size="sm" variant="teal" style={{ width: '100%' }}>EDIT</BlockButton>
                    </Link>
                    <BlockButton
                      size="sm" variant="orange"
                      disabled={deletingId === quiz.id}
                      onClick={() => handleDelete(quiz.id, quiz.title)}
                    >
                      {deletingId === quiz.id ? '…' : '✕'}
                    </BlockButton>
                  </div>
                </Panel>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
