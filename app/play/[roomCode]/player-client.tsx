'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'

type Player = { id: string; name: string }
type Phase = 'name-form' | 'joining' | 'lobby' | 'question' | 'answer-locked' | 'reveal' | 'game-over' | 'error'

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
  { bg: 'bg-red-600',    active: 'ring-4 ring-red-300',    shape: '▲' },
  { bg: 'bg-blue-600',   active: 'ring-4 ring-blue-300',   shape: '◆' },
  { bg: 'bg-yellow-500', active: 'ring-4 ring-yellow-300', shape: '●' },
  { bg: 'bg-green-600',  active: 'ring-4 ring-green-300',  shape: '■' },
]

export default function PlayerClient({ roomCode }: { roomCode: string }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialName = searchParams.get('name') ?? ''

  const [phase, setPhase] = useState<Phase>(initialName ? 'joining' : 'name-form')
  const [name, setName] = useState(initialName)
  const [nameInput, setNameInput] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [questionData, setQuestionData] = useState<QuestionData | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [revealData, setRevealData] = useState<RevealData | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [standings, setStandings] = useState<Standing[]>([])
  const socketRef = useRef<Socket | null>(null)

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

  function connect(playerName: string) {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, { autoConnect: true })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit(
        'player:join',
        { roomCode, name: playerName },
        (res: { playerId: string } | { error: string }) => {
          if ('error' in res) {
            setErrorMsg(res.error)
            setPhase('error')
            socket.disconnect()
          } else {
            setPlayerId(res.playerId)
            setPhase('lobby')
          }
        }
      )
    })

    socket.on('lobby:update', ({ players }: { players: Player[] }) => {
      setPlayers(players)
    })

    socket.on('question:show', (data: QuestionData) => {
      setQuestionData(data)
      setSelectedAnswer(null)
      setRevealData(null)
      setTimeLeft(data.timeLimitSeconds)
      setPhase('question')
    })

    socket.on('question:locked', () => {
      setPhase(prev => prev === 'question' ? 'answer-locked' : prev)
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
      setErrorMsg('Could not connect to game server')
      setPhase('error')
    })
  }

  useEffect(() => {
    if (phase === 'joining' && name) connect(name)
    return () => { socketRef.current?.disconnect() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleNameSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = nameInput.trim()
    if (!n) return
    setName(n)
    setPhase('joining')
    connect(n)
  }

  function handleAnswer(answerIndex: number) {
    if (phase !== 'question' || selectedAnswer !== null) return
    setSelectedAnswer(answerIndex)
    setPhase('answer-locked')
    socketRef.current?.emit('player:submit-answer', { roomCode, playerId, answerIndex })
  }

  // ── name form ──────────────────────────────────────────────────────────────
  if (phase === 'name-form') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <form onSubmit={handleNameSubmit} className="w-full max-w-xs space-y-4">
          <div className="text-center">
            <p className="text-gray-400 text-sm">Joining room</p>
            <p className="text-2xl font-bold tracking-widest text-indigo-400">{roomCode}</p>
          </div>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            placeholder="Your name"
            maxLength={20}
            autoFocus
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-colors">
            Join
          </button>
        </form>
      </main>
    )
  }

  // ── joining ────────────────────────────────────────────────────────────────
  if (phase === 'joining') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Joining room {roomCode}…</p>
      </main>
    )
  }

  // ── error ──────────────────────────────────────────────────────────────────
  if (phase === 'error') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-red-400 text-lg">{errorMsg}</p>
        <button onClick={() => router.push('/')} className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
          ← Back to home
        </button>
      </main>
    )
  }

  // ── lobby ──────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-1">
            <p className="text-gray-400 text-sm uppercase tracking-widest">Room</p>
            <p className="text-3xl font-black tracking-widest text-indigo-400">{roomCode}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <p className="text-gray-400 text-sm text-center">Waiting for the host to start…</p>
            <ul className="space-y-2">
              {players.map(p => (
                <li key={p.id} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${p.id === playerId ? 'bg-indigo-900 text-indigo-200' : 'bg-gray-800 text-gray-200'}`}>
                  {p.id === playerId && <span className="text-indigo-400">▶</span>}
                  {p.name}
                  {p.id === playerId && <span className="text-indigo-500 text-xs ml-auto">(you)</span>}
                </li>
              ))}
            </ul>
            <p className="text-gray-600 text-xs text-center">{players.length} player{players.length !== 1 ? 's' : ''} in lobby</p>
          </div>
        </div>
      </main>
    )
  }

  // ── question ───────────────────────────────────────────────────────────────
  if (phase === 'question' && questionData) {
    const urgent = timeLeft <= 5
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col">
        {/* Timer bar */}
        <div className="h-2 bg-gray-800">
          <div
            className={`h-full transition-all duration-250 ${urgent ? 'bg-red-500' : 'bg-indigo-500'}`}
            style={{ width: `${(timeLeft / questionData.timeLimitSeconds) * 100}%` }}
          />
        </div>

        <div className="flex-1 flex flex-col p-5 gap-5">
          {/* Header */}
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Q{questionData.questionIndex + 1} / {questionData.totalQuestions}</span>
            <span className={`text-2xl font-black ${urgent ? 'text-red-400' : 'text-white'}`}>{timeLeft}</span>
          </div>

          {/* Question */}
          <div className="flex-1 flex items-center justify-center">
            <p key={questionData.questionIndex} className="text-xl font-bold text-center leading-snug animate-fade-in">{questionData.text}</p>
          </div>

          {/* Options grid */}
          <div key={questionData.questionIndex} className="grid grid-cols-2 gap-3">
            {questionData.options.map((opt, i) => {
              const style = OPTION_STYLES[i] ?? OPTION_STYLES[0]
              return (
                <button
                  key={i}
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => handleAnswer(i)}
                  className={`${style.bg} rounded-2xl p-4 text-white font-semibold text-left flex flex-col gap-2 active:scale-95 transition-transform min-h-[90px] animate-slide-up`}
                >
                  <span className="text-lg">{style.shape}</span>
                  <span className="text-sm leading-snug">{opt}</span>
                </button>
              )
            })}
          </div>
        </div>
      </main>
    )
  }

  // ── answer locked ──────────────────────────────────────────────────────────
  if (phase === 'answer-locked' && questionData) {
    const style = selectedAnswer !== null ? (OPTION_STYLES[selectedAnswer] ?? OPTION_STYLES[0]) : null
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 gap-6">
        <div className="text-center space-y-2">
          <p className="text-5xl">✓</p>
          <p className="text-xl font-bold">Answer locked in!</p>
          <p className="text-gray-400 text-sm">Waiting for the host to reveal…</p>
        </div>
        {selectedAnswer !== null && style && (
          <div className={`${style.bg} rounded-2xl px-6 py-4 text-white font-semibold text-center w-full max-w-xs animate-pop-in`}>
            <span className="mr-2">{style.shape}</span>
            {questionData.options[selectedAnswer]}
          </div>
        )}
      </main>
    )
  }

  // Time expired without answering
  if (phase === 'answer-locked' && !selectedAnswer) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-4xl">⏱</p>
        <p className="text-xl font-bold text-red-400">Time&apos;s up!</p>
        <p className="text-gray-400 text-sm">Waiting for the host to reveal…</p>
      </main>
    )
  }

  // ── reveal ─────────────────────────────────────────────────────────────────
  if (phase === 'reveal' && questionData && revealData) {
    const total = revealData.answerCounts.reduce((a, b) => a + b, 0) || 1
    const playerCorrect = selectedAnswer === revealData.correctIndex
    const playerAnswered = selectedAnswer !== null

    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col p-5 gap-6">
        <div className="text-center space-y-1">
          <p className="text-gray-400 text-sm">Q{questionData.questionIndex + 1} of {questionData.totalQuestions}</p>
          <p className="font-semibold text-lg leading-snug">{questionData.text}</p>
        </div>

        {playerAnswered && (
          <div className={`text-center py-3 rounded-xl font-bold text-lg animate-pop-in ${playerCorrect ? 'bg-green-800 text-green-200' : 'bg-red-900 text-red-200'}`}>
            {playerCorrect ? '🎉 Correct!' : '✗ Wrong'}
          </div>
        )}

        <div className="space-y-3">
          {questionData.options.map((opt, i) => {
            const count = revealData.answerCounts[i] ?? 0
            const pct = Math.round((count / total) * 100)
            const isCorrect = i === revealData.correctIndex
            const style = OPTION_STYLES[i] ?? OPTION_STYLES[0]
            return (
              <div key={i} style={{ animationDelay: `${i * 80}ms` }} className={`rounded-xl overflow-hidden border-2 animate-slide-up ${isCorrect ? 'border-green-400' : 'border-transparent'}`}>
                <div className="flex items-center gap-3 px-3 py-2 bg-gray-900">
                  <span className={`${style.bg} rounded-lg w-8 h-8 flex items-center justify-center text-sm flex-shrink-0`}>
                    {style.shape}
                  </span>
                  <span className="flex-1 text-sm font-medium">{opt}</span>
                  <span className="text-gray-400 text-sm">{count}</span>
                  {isCorrect && <span className="text-green-400 font-bold">✓</span>}
                </div>
                <div className="h-2 bg-gray-800">
                  <div className={`h-full ${style.bg} transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Leaderboard */}
        {standings.length > 0 && (() => {
          const top5 = standings.slice(0, 5)
          const mine = standings.find(s => s.name === name)
          const showSelf = mine && mine.rank > 5
          return (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Leaderboard</h3>
              {top5.map((s, idx) => (
                <div key={s.rank} style={{ animationDelay: `${idx * 60}ms` }} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm animate-slide-up ${s.name === name ? 'bg-indigo-900 border border-indigo-600' : 'bg-gray-900'}`}>
                  <span className="w-6 text-center font-bold">
                    {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `${s.rank}.`}
                  </span>
                  <span className="flex-1 font-medium">{s.name}{s.name === name && <span className="text-indigo-400 text-xs ml-1">(you)</span>}</span>
                  <span className="font-bold text-gray-300">{s.score.toLocaleString()}</span>
                </div>
              ))}
              {showSelf && (
                <>
                  <p className="text-center text-gray-600 text-xs">···</p>
                  <div style={{ animationDelay: `${top5.length * 60}ms` }} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-indigo-900 border border-indigo-600 animate-slide-up">
                    <span className="w-6 text-center font-bold">{mine.rank}.</span>
                    <span className="flex-1 font-medium">{mine.name} <span className="text-indigo-400 text-xs">(you)</span></span>
                    <span className="font-bold text-indigo-300">{mine.score.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          )
        })()}

        <p className="text-gray-500 text-xs text-center">Waiting for next question…</p>
      </main>
    )
  }

  // ── game over ──────────────────────────────────────────────────────────────
  if (phase === 'game-over') {
    const mine = standings.find(s => s.name === name)
    return (
      <main className="min-h-screen bg-gray-950 text-white flex flex-col p-6 gap-5 overflow-y-auto">
        <h1 className="text-center text-3xl font-black pt-2">Game Over!</h1>

        {mine && (
          <div className="text-center bg-indigo-900 border border-indigo-600 rounded-2xl p-4 animate-pop-in" style={{ animationDelay: '100ms' }}>
            <p className="text-gray-400 text-sm">Your final rank</p>
            <p className="text-5xl font-black text-indigo-300">#{mine.rank}</p>
            <p className="text-lg font-bold">{mine.score.toLocaleString()} pts</p>
          </div>
        )}

        {standings.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Final Standings</h3>
            {standings.slice(0, 10).map((s, idx) => (
              <div key={s.rank} style={{ animationDelay: `${200 + idx * 50}ms` }} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm animate-slide-up ${s.name === name ? 'bg-indigo-900 border border-indigo-600' : 'bg-gray-900'}`}>
                <span className="w-6 text-center font-bold">
                  {s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `${s.rank}.`}
                </span>
                <span className="flex-1 font-medium">{s.name}</span>
                <span className="font-bold text-gray-300">{s.score.toLocaleString()}</span>
              </div>
            ))}
            {standings.length > 10 && mine && mine.rank > 10 && (
              <>
                <p className="text-center text-gray-600 text-xs">···</p>
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-indigo-900 border border-indigo-600">
                  <span className="w-6 text-center font-bold">{mine.rank}.</span>
                  <span className="flex-1 font-medium">{mine.name} <span className="text-indigo-400 text-xs">(you)</span></span>
                  <span className="font-bold text-indigo-300">{mine.score.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        )}

        <button onClick={() => router.push('/')} className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold transition-colors text-sm">
          Play again
        </button>
      </main>
    )
  }

  return null
}
