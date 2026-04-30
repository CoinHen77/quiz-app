'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { getHostPassword } from '../actions'
import { getQuiz } from '@/lib/quizzes'
import type { Quiz } from '@/lib/firebase'

type Player = { id: string; name: string }
type Phase = 'pre' | 'lobby' | 'question' | 'reveal' | 'game-over'

type QuestionData = {
  questionIndex: number
  totalQuestions: number
  text: string
  options: string[]
  timeLimitSeconds: number
  startTimestamp: number
}

type RevealData = {
  correctIndex: number
  answerCounts: number[]
}

type Standing = { name: string; score: number; rank: number }

const OPTION_STYLES = [
  { bg: 'bg-red-600',    shape: '▲' },
  { bg: 'bg-blue-600',   shape: '◆' },
  { bg: 'bg-yellow-500', shape: '●' },
  { bg: 'bg-green-600',  shape: '■' },
]

export default function HostClient({ quizId }: { quizId: string }) {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('pre')
  const [roomCode, setRoomCode] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [questionData, setQuestionData] = useState<QuestionData | null>(null)
  const [revealData, setRevealData] = useState<RevealData | null>(null)
  const [answersReceived, setAnswersReceived] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [standings, setStandings] = useState<Standing[]>([])
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    getQuiz(quizId).then(q => {
      if (!q) { router.push('/host'); return }
      setQuiz(q)
    })
    return () => { socketRef.current?.disconnect() }
  }, [quizId, router])

  // Countdown timer
  useEffect(() => {
    if (phase !== 'question' || !questionData) return
    const tick = () => {
      const elapsed = Date.now() - questionData.startTimestamp
      const remaining = Math.max(0, questionData.timeLimitSeconds * 1000 - elapsed)
      setTimeLeft(Math.ceil(remaining / 1000))
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [phase, questionData])

  async function handleCreateRoom() {
    setCreating(true)
    setError('')

    const password = await getHostPassword()
    if (!password) { setError('Session expired. Please log in again.'); setCreating(false); return }

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, { autoConnect: true })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit(
        'host:create-room',
        { quizId, password },
        (res: { roomCode: string } | { error: string }) => {
          if ('error' in res) {
            setError(res.error)
            setCreating(false)
            socket.disconnect()
          } else {
            setRoomCode(res.roomCode)
            setPhase('lobby')
            setCreating(false)
          }
        }
      )
    })

    socket.on('lobby:update', ({ players }: { players: Player[] }) => {
      setPlayers(players)
    })

    socket.on('question:show', (data: QuestionData) => {
      setQuestionData(data)
      setAnswersReceived(0)
      setRevealData(null)
      setPhase('question')
    })

    socket.on('answer:received', ({ count }: { count: number }) => {
      setAnswersReceived(count)
    })

    socket.on('question:locked', () => {
      // timer expired — UI already counts down to 0
    })

    socket.on('question:reveal', (data: RevealData) => {
      setRevealData(data)
      setPhase('reveal')
    })

    socket.on('leaderboard:update', ({ standings }: { standings: Standing[] }) => {
      setStandings(standings)
    })

    socket.on('game:over', ({ finalStandings }: { finalStandings: Standing[] }) => {
      setStandings(finalStandings)
      setPhase('game-over')
    })

    socket.on('connect_error', () => {
      setError('Could not connect to game server')
      setCreating(false)
      socket.disconnect()
    })
  }

  function handleStartGame() {
    if (!quiz || !roomCode) return
    socketRef.current?.emit('host:start-game', { roomCode, questions: quiz.questions })
  }

  function handleReveal() {
    socketRef.current?.emit('host:reveal-answer', { roomCode })
  }

  function handleNextQuestion() {
    socketRef.current?.emit('host:next-question', { roomCode })
  }

  // ── pre ────────────────────────────────────────────────────────────────────
  if (phase === 'pre') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6 text-center">
          <div>
            <p className="text-gray-400 text-sm">Quiz</p>
            <h1 className="text-2xl font-bold mt-1">{quiz?.title ?? '…'}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {quiz ? `${quiz.questions.length} question${quiz.questions.length !== 1 ? 's' : ''}` : ''}
            </p>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={handleCreateRoom}
            disabled={creating || !quiz}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-xl transition-colors"
          >
            {creating ? 'Creating room…' : 'Create Room'}
          </button>
          <div>
            <button onClick={() => router.push('/host')} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
              ← Back
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── lobby ──────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <main className="min-h-screen bg-gray-950 text-white p-6 md:p-10">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-2">
            <p className="text-gray-400 text-sm uppercase tracking-widest">Room Code</p>
            <p className="text-7xl font-black tracking-widest text-indigo-400">{roomCode}</p>
            <p className="text-gray-500 text-sm">Players go to the site and enter this code</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">{quiz?.title}</h2>
              <p className="text-gray-400 text-sm">{quiz?.questions.length} questions</p>
            </div>
            <button
              onClick={handleStartGame}
              disabled={players.length === 0}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-colors"
            >
              Start Game
            </button>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-200">Players</h3>
              <span className="text-gray-400 text-sm">{players.length} joined</span>
            </div>
            {players.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-4">Waiting for players to join…</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {players.map(p => (
                  <li key={p.id} className="bg-gray-800 rounded-lg px-3 py-2 text-sm font-medium text-gray-200 truncate">
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    )
  }

  // ── question ───────────────────────────────────────────────────────────────
  if (phase === 'question' && questionData) {
    const urgent = timeLeft <= 5
    return (
      <main className="min-h-screen bg-gray-950 text-white p-6 md:p-10">
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Progress + timer */}
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">
              Question {questionData.questionIndex + 1} of {questionData.totalQuestions}
            </span>
            <span className={`text-4xl font-black ${urgent ? 'text-red-400' : 'text-white'}`}>
              {timeLeft}s
            </span>
          </div>

          {/* Timer bar */}
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-250 ${urgent ? 'bg-red-500' : 'bg-indigo-500'}`}
              style={{ width: `${(timeLeft / questionData.timeLimitSeconds) * 100}%` }}
            />
          </div>

          {/* Question text */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <p className="text-2xl font-bold leading-snug">{questionData.text}</p>
          </div>

          {/* Options preview */}
          <div className="grid grid-cols-2 gap-3">
            {questionData.options.map((opt, i) => {
              const style = OPTION_STYLES[i] ?? OPTION_STYLES[0]
              return (
                <div key={i} className={`${style.bg} rounded-xl px-4 py-3 flex items-center gap-2`}>
                  <span className="text-sm">{style.shape}</span>
                  <span className="text-sm font-medium">{opt}</span>
                </div>
              )
            })}
          </div>

          {/* Answer count + reveal button */}
          <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div>
              <p className="text-2xl font-bold">{answersReceived} <span className="text-gray-400 text-base font-normal">/ {players.length} answered</span></p>
            </div>
            <button
              onClick={handleReveal}
              className="px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-gray-950 rounded-xl font-bold transition-colors"
            >
              Reveal Answer
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── reveal ─────────────────────────────────────────────────────────────────
  if (phase === 'reveal' && questionData && revealData) {
    const total = revealData.answerCounts.reduce((a, b) => a + b, 0) || 1
    const isLastQuestion = questionData.questionIndex + 1 === questionData.totalQuestions

    return (
      <main className="min-h-screen bg-gray-950 text-white p-6 md:p-10">
        <div className="max-w-2xl mx-auto space-y-6">

          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">
              Question {questionData.questionIndex + 1} of {questionData.totalQuestions} — Revealed
            </span>
          </div>

          {/* Question text */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <p className="text-xl font-bold">{questionData.text}</p>
          </div>

          {/* Bar chart */}
          <div className="space-y-3">
            {questionData.options.map((opt, i) => {
              const count = revealData.answerCounts[i] ?? 0
              const pct = Math.round((count / total) * 100)
              const isCorrect = i === revealData.correctIndex
              const style = OPTION_STYLES[i] ?? OPTION_STYLES[0]
              return (
                <div key={i} style={{ animationDelay: `${i * 80}ms` }} className={`rounded-xl overflow-hidden border-2 animate-slide-up ${isCorrect ? 'border-green-400' : 'border-transparent'}`}>
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-900">
                    <span className={`${style.bg} rounded-lg w-8 h-8 flex items-center justify-center text-sm flex-shrink-0`}>
                      {style.shape}
                    </span>
                    <span className="flex-1 font-medium">{opt}</span>
                    <span className="text-gray-300 font-semibold">{count}</span>
                    {isCorrect && <span className="text-green-400 text-xl">✓</span>}
                  </div>
                  <div className="h-3 bg-gray-800">
                    <div className={`h-full ${style.bg} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Top 5 leaderboard */}
          {standings.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Top Players</h3>
              {standings.slice(0, 5).map((s, idx) => (
                <div key={s.rank} style={{ animationDelay: `${idx * 60}ms` }} className="flex items-center gap-3 animate-slide-up">
                  <span className="w-7 text-center font-bold">
                    {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `${s.rank}.`}
                  </span>
                  <span className="flex-1 font-semibold">{s.name}</span>
                  <span className="text-indigo-300 font-bold">{s.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleNextQuestion}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-lg transition-colors"
            >
              {isLastQuestion ? 'End Game →' : 'Next Question →'}
            </button>
          </div>
        </div>
      </main>
    )
  }

  // ── game over ─────────────────────────────────────────────────────────────
  if (phase === 'game-over') {
    const top3 = standings.slice(0, 3)
    return (
      <main className="min-h-screen bg-gray-950 text-white p-6 md:p-10 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          <h1 className="text-center text-4xl font-black">Final Results</h1>

          {/* Olympic podium */}
          {top3.length > 0 && (
            <div className="flex items-end justify-center gap-3">
              {top3[1] && (
                <div className="flex-1 text-center animate-slide-up" style={{ animationDelay: '50ms' }}>
                  <p className="text-4xl mb-2">🥈</p>
                  <div className="bg-gray-600 rounded-t-xl p-3 h-24 flex flex-col justify-end">
                    <p className="font-bold text-lg leading-tight truncate">{top3[1].name}</p>
                    <p className="text-gray-300 text-sm">{top3[1].score.toLocaleString()}</p>
                  </div>
                </div>
              )}
              {top3[0] && (
                <div className="flex-1 text-center animate-slide-up" style={{ animationDelay: '400ms' }}>
                  <p className="text-5xl mb-2">🥇</p>
                  <div className="bg-yellow-600 rounded-t-xl p-3 h-36 flex flex-col justify-end">
                    <p className="font-bold text-xl leading-tight truncate">{top3[0].name}</p>
                    <p className="text-yellow-100 text-sm">{top3[0].score.toLocaleString()}</p>
                  </div>
                </div>
              )}
              {top3[2] && (
                <div className="flex-1 text-center animate-slide-up" style={{ animationDelay: '200ms' }}>
                  <p className="text-4xl mb-2">🥉</p>
                  <div className="bg-amber-800 rounded-t-xl p-3 h-16 flex flex-col justify-end">
                    <p className="font-bold leading-tight truncate">{top3[2].name}</p>
                    <p className="text-amber-200 text-sm">{top3[2].score.toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full standings */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">All Players</h3>
            {standings.map((s, idx) => (
              <div key={s.rank} style={{ animationDelay: `${500 + idx * 40}ms` }} className="flex items-center gap-3 animate-slide-up">
                <span className="w-7 text-center font-bold">
                  {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `${s.rank}.`}
                </span>
                <span className="flex-1 font-medium">{s.name}</span>
                <span className="font-bold text-gray-300">{s.score.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button onClick={() => router.push('/host')} className="px-8 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-colors">
              Back to Quizzes
            </button>
          </div>
        </div>
      </main>
    )
  }

  return null
}
