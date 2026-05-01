'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { getHostPassword } from '../actions'
import { getQuiz } from '@/lib/quizzes'
import type { Quiz } from '@/lib/firebase'
import { Bulbs, Sunburst, CarpetStripe, Logo, Panel, BlockButton, Chip, ChromeNumber, OptionButton, OPTION_PALETTES, OPTION_LABELS } from '@/components/gameshow'
import { HostAvatar } from '@/components/HostAvatar'

type Player    = { id: string; name: string }
type Phase     = 'pre' | 'lobby' | 'question' | 'reveal' | 'game-over'
type QuestionData = { questionIndex: number; totalQuestions: number; text: string; options: string[]; timeLimitSeconds: number; startTimestamp: number }
type RevealData   = { correctIndex: number; answerCounts: number[] }
type Standing     = { name: string; score: number; rank: number }

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
    getQuiz(quizId).then(q => { if (!q) { router.push('/host'); return }; setQuiz(q) })
    return () => { socketRef.current?.disconnect() }
  }, [quizId, router])

  useEffect(() => {
    if (phase !== 'question' || !questionData) return
    const tick = () => {
      const elapsed = Date.now() - questionData.startTimestamp
      setTimeLeft(Math.ceil(Math.max(0, questionData.timeLimitSeconds * 1000 - elapsed) / 1000))
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [phase, questionData])

  async function handleCreateRoom() {
    setCreating(true); setError('')
    const password = await getHostPassword()
    if (!password) { setError('Session expired. Please log in again.'); setCreating(false); return }
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, { autoConnect: true })
    socketRef.current = socket
    socket.on('connect', () => {
      socket.emit('host:create-room', { quizId, password }, (res: { roomCode: string } | { error: string }) => {
        if ('error' in res) { setError(res.error); setCreating(false); socket.disconnect() }
        else { setRoomCode(res.roomCode); setPhase('lobby'); setCreating(false) }
      })
    })
    socket.on('lobby:update',      ({ players }: { players: Player[] }) => setPlayers(players))
    socket.on('question:show',     (data: QuestionData) => { setQuestionData(data); setAnswersReceived(0); setRevealData(null); setPhase('question') })
    socket.on('answer:received',   ({ count }: { count: number }) => setAnswersReceived(count))
    socket.on('question:reveal',   (data: RevealData) => { setRevealData(data); setPhase('reveal') })
    socket.on('leaderboard:update',({ standings }: { standings: Standing[] }) => setStandings(standings))
    socket.on('game:over',         ({ finalStandings }: { finalStandings: Standing[] }) => { setStandings(finalStandings); setPhase('game-over') })
    socket.on('connect_error',     () => { setError('Could not connect to game server'); setCreating(false); socket.disconnect() })
  }

  function handleStartGame()    { if (!quiz || !roomCode) return; socketRef.current?.emit('host:start-game', { roomCode, questions: quiz.questions }) }
  function handleReveal()       { socketRef.current?.emit('host:reveal-answer', { roomCode }) }
  function handleNextQuestion() { socketRef.current?.emit('host:next-question', { roomCode }) }

  // ── pre ────────────────────────────────────────────────────────────────────
  if (phase === 'pre') {
    return (
      <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center gap-6 p-6" style={{ background: '#3a1f0a' }}>
        <Sunburst />
        <div className="absolute top-5 left-0 right-0 flex justify-center"><Bulbs count={36} /></div>
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="font-bungee" style={{ fontSize: 14, letterSpacing: '0.5em', color: '#ffd23f' }}>★  READY TO BROADCAST  ★</div>
          <Logo size={120} withTagline />
          <Panel variant="cream" style={{ padding: '24px 36px', textAlign: 'center', marginTop: 12 }}>
            <div className="font-bungee" style={{ fontSize: 13, letterSpacing: '0.3em', color: '#3a1f0a', opacity: 0.7 }}>SELECTED QUIZ</div>
            <div className="font-bungee" style={{ fontSize: 28, color: '#3a1f0a', marginTop: 8 }}>{quiz?.title ?? '…'}</div>
            <div className="font-bungee" style={{ fontSize: 14, color: '#3a1f0a', opacity: 0.7, marginTop: 6, letterSpacing: '0.15em' }}>
              {quiz ? `${quiz.questions.length} QUESTIONS` : ''}
            </div>
          </Panel>
          {error && <div className="font-bungee" style={{ color: '#c44b6a', fontSize: 14 }}>{error}</div>}
          <BlockButton size="lg" onClick={handleCreateRoom} disabled={creating || !quiz}>
            {creating ? 'CREATING…' : 'CREATE ROOM ▶'}
          </BlockButton>
          <button onClick={() => router.push('/host')} className="font-bungee" style={{ color: '#ffd23f', fontSize: 13, opacity: 0.7, background: 'none', border: 'none', cursor: 'pointer' }}>
            ← BACK
          </button>
        </div>
        <div className="absolute bottom-24 left-0 right-0 flex justify-center"><Bulbs count={36} /></div>
        <CarpetStripe />
      </main>
    )
  }

  // ── lobby ──────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <main className="min-h-screen relative overflow-hidden" style={{ background: '#3a1f0a' }}>
        <Sunburst />
        <div className="absolute top-4 left-0 right-0 flex justify-center z-10"><Bulbs count={48} /></div>
        <div style={{ position: 'absolute', inset: '60px 32px 100px 32px', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 24 }}>
          {/* Left: room code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <Logo size={56} />
            <Panel variant="cream" style={{ padding: '28px 40px', textAlign: 'center', width: '100%' }}>
              <div className="font-bungee" style={{ fontSize: 14, letterSpacing: '0.4em', color: '#3a1f0a', opacity: 0.7 }}>ROOM CODE</div>
              <div
                className="font-bungee"
                style={{
                  marginTop: 10, fontSize: 'clamp(60px, 10vw, 120px)', lineHeight: 1, letterSpacing: '0.1em',
                  color: '#f56b1f', WebkitTextStroke: '4px #3a1f0a',
                  textShadow: '0 8px 0 #3a1f0a, 5px 12px 0 #2ec4b6', paintOrder: 'stroke fill',
                }}
              >
                {roomCode}
              </div>
              <div className="font-inter" style={{ fontSize: 13, color: '#3a1f0a', marginTop: 8, opacity: 0.7, letterSpacing: '0.1em', fontWeight: 500 }}>
                GO TO innoquiz.netlify.app AND ENTER THIS CODE
              </div>
            </Panel>
            <BlockButton size="lg" variant="gold" onClick={handleStartGame} disabled={players.length === 0}>
              START GAME ▶
            </BlockButton>
          </div>
          {/* Right: players */}
          <Panel variant="brown" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div className="font-bungee" style={{ fontSize: 14, color: '#ffd23f', letterSpacing: '0.25em' }}>PLAYERS</div>
              <Chip variant="orange" style={{ fontSize: 12 }}>{players.length} JOINED</Chip>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flex: 1, alignContent: 'start' }}>
              {players.map((p, i) => (
                <div key={p.id} style={{
                  background: i % 2 === 0 ? '#2ec4b6' : '#f56b1f', color: '#f7e9c4',
                  border: '4px solid #3a1f0a', borderRadius: 8, padding: '12px 14px',
                  boxShadow: 'inset 0 0 0 2px #f7e9c4, 4px 4px 0 #3a1f0a',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div className="font-bungee" style={{ width: 24, height: 24, borderRadius: '50%', background: '#f7e9c4', color: '#3a1f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, border: '2px solid #3a1f0a' }}>
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <div className="font-bungee" style={{ fontSize: 16, letterSpacing: '0.12em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name.toUpperCase()}
                  </div>
                </div>
              ))}
              {players.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ border: '3px dashed #ffd23f', borderRadius: 8, padding: '12px 14px', color: '#ffd23f', opacity: 0.4, fontSize: 12, letterSpacing: '0.2em', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="font-bungee">
                  WAITING…
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <div className="absolute bottom-24 left-0 right-0 flex justify-center z-10"><Bulbs count={48} /></div>
        <CarpetStripe />
      </main>
    )
  }

  // ── question ───────────────────────────────────────────────────────────────
  if (phase === 'question' && questionData) {
    const urgent = timeLeft <= 5
    return (
      <main className="h-screen overflow-hidden relative" style={{ background: '#3a1f0a' }}>
        <Sunburst opacity={0.4} />
        <div style={{ position: 'absolute', inset: 12, display: 'grid', gridTemplateRows: '1fr 1fr', gap: 12 }}>
          {/* Top row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Hosts panel */}
            <Panel variant="stage" style={{ padding: 12, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 6, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                <Bulbs count={18} size={9} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', justifyContent: 'center', height: '100%', paddingTop: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <HostAvatar who="mira" size={160} reaction="idle" bobOffset={0} />
                  <div className="font-bungee" style={{ fontSize: 13, color: '#ffd23f', letterSpacing: '0.2em', textShadow: '2px 2px 0 #3a1f0a', marginTop: -4 }}>MIRA</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <HostAvatar who="theo" size={160} reaction="idle" bobOffset={0.5} />
                  <div className="font-bungee" style={{ fontSize: 13, color: '#ffd23f', letterSpacing: '0.2em', textShadow: '2px 2px 0 #3a1f0a', marginTop: -4 }}>THEO</div>
                </div>
              </div>
              <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                <Bulbs count={18} size={9} />
              </div>
            </Panel>
            {/* Question panel */}
            <Panel variant="cream" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Chip variant="teal">ROUND {questionData.questionIndex + 1} OF {questionData.totalQuestions}</Chip>
                <div style={{ display: 'flex', gap: 4 }}>
                  {Array.from({ length: questionData.totalQuestions }).map((_, i) => (
                    <div key={i} style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: i < questionData.questionIndex ? '#ffd23f' : i === questionData.questionIndex ? '#f56b1f' : '#f7e9c4',
                      border: '2px solid #3a1f0a',
                      boxShadow: i === questionData.questionIndex ? '0 0 8px #f56b1f' : 'none',
                    }} />
                  ))}
                </div>
              </div>
              <div className="font-bungee" style={{ fontSize: 'clamp(18px,2.2vw,30px)', lineHeight: 1.2, color: '#3a1f0a' }}>
                {questionData.text}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="font-bungee" style={{ fontSize: 11, letterSpacing: '0.3em', opacity: 0.7, color: '#3a1f0a' }}>ANSWERS RECEIVED</div>
                  <ChromeNumber size={32} color={urgent ? '#c44b6a' : '#f56b1f'}>{answersReceived} / {players.length}</ChromeNumber>
                </div>
                <ChromeNumber size={48} color={urgent ? '#c44b6a' : '#ffd23f'}>{timeLeft}s</ChromeNumber>
              </div>
              <BlockButton size="sm" variant="gold" onClick={handleReveal}>REVEAL ANSWER ▶</BlockButton>
            </Panel>
          </div>
          {/* Answers 2×2 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12 }}>
            {questionData.options.map((opt, i) => (
              <OptionButton key={i} index={i} label={opt} state="idle" size="md" disabled />
            ))}
          </div>
        </div>
      </main>
    )
  }

  // ── reveal ─────────────────────────────────────────────────────────────────
  if (phase === 'reveal' && questionData && revealData) {
    const total = revealData.answerCounts.reduce((a, b) => a + b, 0) || 1
    const isLastQuestion = questionData.questionIndex + 1 === questionData.totalQuestions
    const top5 = standings.slice(0, 5)

    return (
      <main className="h-screen overflow-hidden relative" style={{ background: '#3a1f0a' }}>
        <Sunburst opacity={0.4} />
        <div style={{ position: 'absolute', inset: 12, display: 'grid', gridTemplateRows: '1fr 1.4fr', gap: 12 }}>
          {/* Top row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Hosts cheering */}
            <Panel variant="stage" style={{ padding: 12, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 6, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                <Bulbs count={18} size={9} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', justifyContent: 'center', height: '100%', paddingTop: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <HostAvatar who="mira" size={150} reaction="cheer" bobOffset={0} />
                  <div className="font-bungee" style={{ fontSize: 12, color: '#ffd23f', letterSpacing: '0.2em', textShadow: '2px 2px 0 #3a1f0a', marginTop: -4 }}>MIRA</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <HostAvatar who="theo" size={150} reaction="cheer" bobOffset={0.5} />
                  <div className="font-bungee" style={{ fontSize: 12, color: '#ffd23f', letterSpacing: '0.2em', textShadow: '2px 2px 0 #3a1f0a', marginTop: -4 }}>THEO</div>
                </div>
              </div>
              <div
                className="font-bungee animate-gs-pop"
                style={{
                  position: 'absolute', top: 28, left: '50%',
                  background: '#ffd23f', color: '#3a1f0a',
                  padding: '6px 18px', borderRadius: 8, border: '3px solid #3a1f0a',
                  fontSize: 18, letterSpacing: '0.15em', boxShadow: '4px 4px 0 #3a1f0a',
                }}
              >
                ★ ANSWER REVEALED ★
              </div>
            </Panel>
            {/* Question panel with correct answer */}
            <Panel variant="cream" style={{ padding: 22, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Chip variant="teal">ROUND {questionData.questionIndex + 1} OF {questionData.totalQuestions}</Chip>
              </div>
              <div className="font-bungee" style={{ fontSize: 'clamp(16px,2vw,26px)', lineHeight: 1.2, opacity: 0.85, color: '#3a1f0a' }}>
                {questionData.text}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  className="font-bungee"
                  style={{
                    width: 52, height: 52, borderRadius: '50%', background: '#ffd23f', color: '#3a1f0a',
                    border: '4px solid #3a1f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                  }}
                >
                  {OPTION_LABELS[revealData.correctIndex]}
                </div>
                <div>
                  <div className="font-bungee" style={{ fontSize: 11, letterSpacing: '0.3em', opacity: 0.7, color: '#3a1f0a' }}>CORRECT ANSWER</div>
                  <div className="font-bungee" style={{ fontSize: 20, color: '#3a1f0a', letterSpacing: '0.02em' }}>
                    {questionData.options[revealData.correctIndex]}
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* Bottom: bar chart + leaderboard */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
            {/* Bar chart */}
            <Panel variant="cream" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="font-bungee" style={{ fontSize: 12, letterSpacing: '0.3em', opacity: 0.7, color: '#3a1f0a' }}>RESPONSES</div>
              {questionData.options.map((opt, i) => {
                const isCorrect = i === revealData.correctIndex
                const pct = Math.round(((revealData.answerCounts[i] ?? 0) / total) * 100)
                return (
                  <div key={i} style={{
                    background: '#f7e9c4', color: '#3a1f0a',
                    border: `4px solid ${isCorrect ? '#ffd23f' : '#3a1f0a'}`, borderRadius: 8,
                    boxShadow: isCorrect ? `0 0 16px #ffd23f, 4px 4px 0 #3a1f0a` : '4px 4px 0 #3a1f0a',
                    padding: '6px 10px',
                    display: 'grid', gridTemplateColumns: '36px 1fr 48px', alignItems: 'center', gap: 10,
                    position: 'relative', flex: 1,
                  }}>
                    <div
                      className="font-bungee"
                      style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: OPTION_PALETTES[i], color: i === 2 ? '#3a1f0a' : '#f7e9c4',
                        border: '3px solid #3a1f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                      }}
                    >
                      {OPTION_LABELS[i]}
                    </div>
                    <div style={{ position: 'relative', height: 24, background: '#e0d4ad', borderRadius: 4, overflow: 'hidden', border: '2px solid #3a1f0a' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: `${pct}%`, background: OPTION_PALETTES[i], transition: 'width 0.6s ease-out' }} />
                      <div className="font-inter" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 13, color: '#3a1f0a', fontWeight: 600 }}>{opt}</div>
                    </div>
                    <div className="font-bungee" style={{ fontSize: 16, textAlign: 'right' }}>{revealData.answerCounts[i] ?? 0}</div>
                    {isCorrect && (
                      <div style={{
                        position: 'absolute', top: -10, right: -10, width: 32, height: 32, borderRadius: '50%',
                        background: '#ffd23f', border: '3px solid #3a1f0a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, transform: 'rotate(-12deg)', boxShadow: '2px 2px 0 #3a1f0a',
                      }}>★</div>
                    )}
                  </div>
                )
              })}
            </Panel>

            {/* Leaderboard */}
            <Panel variant="brown" style={{ padding: 14, display: 'flex', flexDirection: 'column' }}>
              <div className="font-bungee" style={{ fontSize: 13, color: '#ffd23f', letterSpacing: '0.3em', marginBottom: 10 }}>LEADERBOARD</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {top5.map((p, i) => (
                  <div key={p.rank} style={{
                    background: '#f7e9c4', color: '#3a1f0a',
                    border: '3px solid #3a1f0a', borderRadius: 6, padding: '7px 10px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div
                      className="font-bungee"
                      style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: i === 0 ? '#ffd23f' : i === 1 ? '#2ec4b6' : '#f56b1f',
                        color: '#3a1f0a', border: '2px solid #3a1f0a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                      }}
                    >{i + 1}</div>
                    <div className="font-bungee" style={{ flex: 1, fontSize: 14, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <ChromeNumber size={16} color="#f56b1f" stroke={1.5}>${p.score.toLocaleString()}</ChromeNumber>
                  </div>
                ))}
                {top5.length === 0 && <div className="font-bungee" style={{ color: '#ffd23f', opacity: 0.4, fontSize: 12, textAlign: 'center', marginTop: 20 }}>AWAITING RESULTS…</div>}
              </div>
              <div style={{ marginTop: 12 }}>
                <BlockButton size="sm" variant="gold" style={{ width: '100%' }} onClick={handleNextQuestion}>
                  {isLastQuestion ? 'FINAL RESULTS ▶' : 'NEXT ROUND ▶'}
                </BlockButton>
              </div>
            </Panel>
          </div>
        </div>
      </main>
    )
  }

  // ── game over ─────────────────────────────────────────────────────────────
  if (phase === 'game-over') {
    const podium = standings.slice(0, 3)
    const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean)
    const podiumColors = ['#2ec4b6', '#ffd23f', '#f56b1f']
    const podiumHeights = [180, 260, 130]
    const podiumRanks = [2, 1, 3]

    return (
      <main className="min-h-screen overflow-auto relative pb-8" style={{ background: '#3a1f0a' }}>
        <Sunburst />
        <div className="absolute top-4 left-0 right-0 flex justify-center"><Bulbs count={60} /></div>
        <CarpetStripe />

        <div style={{ position: 'relative', zIndex: 10, padding: '60px 32px 24px', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, minHeight: '100vh', alignItems: 'start' }}>
          {/* Podium */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              className="font-bungee"
              style={{
                fontSize: 'clamp(32px, 5vw, 56px)', letterSpacing: '0.05em',
                color: '#ffd23f', WebkitTextStroke: '3px #3a1f0a',
                textShadow: '0 6px 0 #3a1f0a, 4px 10px 0 #2ec4b6', paintOrder: 'stroke fill',
                transform: 'skewX(-4deg)', marginBottom: 24,
              }}
            >
              FINAL RESULTS
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
              {podiumOrder.map((p, i) => p && (
                <div key={p.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div
                    className="font-bungee"
                    style={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: podiumColors[i], color: '#3a1f0a',
                      border: '5px solid #3a1f0a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 32, boxShadow: '5px 5px 0 #3a1f0a',
                    }}
                  >
                    {podiumRanks[i] === 1 ? '★' : podiumRanks[i]}
                  </div>
                  <div className="font-bungee" style={{ fontSize: 16, color: '#f7e9c4', letterSpacing: '0.1em', textShadow: '2px 2px 0 #3a1f0a' }}>{p.name}</div>
                  <div style={{
                    width: 110, height: podiumHeights[i],
                    background: podiumColors[i], border: '5px solid #3a1f0a',
                    boxShadow: 'inset 0 0 0 3px #f7e9c4, 6px 6px 0 #3a1f0a',
                    borderRadius: '8px 8px 0 0',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 10,
                  }}>
                    <ChromeNumber size={22} color="#3a1f0a" stroke={1}>${p.score.toLocaleString()}</ChromeNumber>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full standings */}
          <Panel variant="brown" style={{ padding: 16, display: 'flex', flexDirection: 'column' }}>
            <div className="font-bungee" style={{ fontSize: 13, color: '#ffd23f', letterSpacing: '0.3em', marginBottom: 10 }}>FULL STANDINGS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              {standings.map((p, i) => (
                <div key={p.rank} style={{
                  background: '#f7e9c4', color: '#3a1f0a',
                  border: '3px solid #3a1f0a', borderRadius: 6, padding: '8px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div
                    className="font-bungee"
                    style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: i < 3 ? ['#ffd23f', '#2ec4b6', '#f56b1f'][i] : '#f7e9c4',
                      color: '#3a1f0a', border: '2px solid #3a1f0a',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                    }}
                  >{i + 1}</div>
                  <div className="font-bungee" style={{ flex: 1, fontSize: 14, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <ChromeNumber size={16} color="#f56b1f" stroke={1.2}>${p.score.toLocaleString()}</ChromeNumber>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <BlockButton size="sm" style={{ width: '100%' }} onClick={() => router.push('/host')}>BACK TO QUIZZES</BlockButton>
            </div>
          </Panel>
        </div>
      </main>
    )
  }

  return null
}
