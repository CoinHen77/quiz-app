'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { io, Socket } from 'socket.io-client'
import { Bulbs, Sunburst, Logo, Panel, BlockButton, Chip, ChromeNumber, OPTION_PALETTES, OPTION_LABELS, OPTION_SHAPES } from '@/components/gameshow'

type Player      = { id: string; name: string }
type Phase       = 'name-form' | 'joining' | 'lobby' | 'question' | 'answer-locked' | 'reveal' | 'game-over' | 'error'
type QuestionData = { questionIndex: number; totalQuestions: number; text: string; options: string[]; timeLimitSeconds: number; startTimestamp: number }
type RevealData   = { correctIndex: number; answerCounts: number[] }
type Standing     = { name: string; score: number; rank: number }

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
  const [myScore, setMyScore] = useState(0)
  const socketRef = useRef<Socket | null>(null)

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

  function connect(playerName: string) {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, { autoConnect: true })
    socketRef.current = socket
    socket.on('connect', () => {
      socket.emit('player:join', { roomCode, name: playerName }, (res: { playerId: string } | { error: string }) => {
        if ('error' in res) { setErrorMsg(res.error); setPhase('error'); socket.disconnect() }
        else { setPlayerId(res.playerId); setPhase('lobby') }
      })
    })
    socket.on('lobby:update',      ({ players }: { players: Player[] }) => setPlayers(players))
    socket.on('question:show',     (data: QuestionData) => { setQuestionData(data); setSelectedAnswer(null); setRevealData(null); setTimeLeft(data.timeLimitSeconds); setPhase('question') })
    socket.on('question:locked',   () => setPhase(prev => prev === 'question' ? 'answer-locked' : prev))
    socket.on('question:reveal',   (data: RevealData) => { setRevealData(data); setPhase('reveal') })
    socket.on('leaderboard:update',({ standings }: { standings: Standing[] }) => {
      setStandings(standings)
      const mine = standings.find(s => s.name === playerName)
      if (mine) setMyScore(mine.score)
    })
    socket.on('game:over',         ({ finalStandings }: { finalStandings: Standing[] }) => { setStandings(finalStandings); setPhase('game-over') })
    socket.on('connect_error',     () => { setErrorMsg('Could not connect to game server'); setPhase('error') })
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
    setName(n); setPhase('joining'); connect(n)
  }

  function handleAnswer(answerIndex: number) {
    if (phase !== 'question' || selectedAnswer !== null) return
    setSelectedAnswer(answerIndex)
    setPhase('answer-locked')
    socketRef.current?.emit('player:submit-answer', { roomCode, playerId, answerIndex })
  }

  const wrap = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <main className="min-h-screen relative overflow-hidden" style={{ background: '#3a1f0a', maxWidth: 480, margin: '0 auto', height: '100vh', ...extra }}>
      <Sunburst opacity={0.45} />
      {children}
    </main>
  )

  // ── name form ──────────────────────────────────────────────────────────────
  if (phase === 'name-form') return wrap(
    <>
      <div className="absolute top-14 left-0 right-0 flex justify-center"><Bulbs count={14} size={8} /></div>
      <div style={{ position: 'absolute', inset: '90px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <Logo size={48} />
        <div className="font-bungee" style={{ fontSize: 12, letterSpacing: '0.4em', color: '#ffd23f' }}>JOINING ROOM</div>
        <div className="font-bungee" style={{ fontSize: 72, lineHeight: 1, letterSpacing: '0.1em', color: '#f56b1f', WebkitTextStroke: '3px #3a1f0a', textShadow: '0 5px 0 #3a1f0a, 3px 7px 0 #2ec4b6', paintOrder: 'stroke fill' }}>
          {roomCode}
        </div>
        <Panel variant="cream" style={{ padding: '18px 20px', width: '100%' }}>
          <form onSubmit={handleNameSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="font-bungee" style={{ fontSize: 11, letterSpacing: '0.3em', opacity: 0.7, color: '#3a1f0a' }}>YOUR CONTESTANT NAME</div>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              placeholder="Your name"
              maxLength={20}
              autoFocus
              className="font-bungee"
              style={{ width: '100%', background: '#fff', border: '4px solid #3a1f0a', borderRadius: 8, padding: '12px 14px', fontSize: 20, color: '#3a1f0a', letterSpacing: '0.08em', outline: 'none', boxSizing: 'border-box' }}
            />
            <BlockButton type="submit" size="md" style={{ width: '100%' }}>JOIN GAME ▶</BlockButton>
          </form>
        </Panel>
      </div>
      <div className="absolute bottom-8 left-0 right-0 flex justify-center"><Bulbs count={14} size={8} /></div>
    </>
  )

  // ── joining ────────────────────────────────────────────────────────────────
  if (phase === 'joining') return wrap(
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="font-bungee animate-gs-shimmer" style={{ color: '#ffd23f', fontSize: 18, letterSpacing: '0.3em' }}>JOINING…</div>
    </div>
  )

  // ── error ──────────────────────────────────────────────────────────────────
  if (phase === 'error') return wrap(
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 }}>
      <div className="font-bungee" style={{ color: '#c44b6a', fontSize: 20, letterSpacing: '0.1em', textAlign: 'center' }}>{errorMsg}</div>
      <BlockButton size="md" onClick={() => router.push('/')}>← BACK TO HOME</BlockButton>
    </div>
  )

  // ── lobby ──────────────────────────────────────────────────────────────────
  if (phase === 'lobby') return wrap(
    <>
      <div className="absolute top-14 left-0 right-0 flex justify-center"><Bulbs count={14} size={8} /></div>
      <div style={{ position: 'absolute', inset: '90px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div className="font-bungee" style={{ fontSize: 11, letterSpacing: '0.4em', color: '#ffd23f' }}>ROOM</div>
        <div className="font-bungee" style={{ fontSize: 52, lineHeight: 1, letterSpacing: '0.1em', color: '#f56b1f', WebkitTextStroke: '3px #3a1f0a', textShadow: '0 4px 0 #3a1f0a, 3px 6px 0 #2ec4b6', paintOrder: 'stroke fill' }}>
          {roomCode}
        </div>
        <Panel variant="cream" style={{ padding: '16px 18px', width: '100%', textAlign: 'center' }}>
          <div className="font-bungee" style={{ fontSize: 12, letterSpacing: '0.3em', opacity: 0.7, color: '#3a1f0a' }}>YOU JOINED AS</div>
          <div className="font-bungee" style={{ marginTop: 6, fontSize: 26, letterSpacing: '0.12em', color: '#3a1f0a' }}>{name.toUpperCase()}</div>
        </Panel>
        {players.length > 1 && (
          <div style={{ width: '100%' }}>
            <div className="font-bungee" style={{ fontSize: 11, letterSpacing: '0.3em', color: '#ffd23f', marginBottom: 8 }}>OTHER PLAYERS · {players.length - 1}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {players.filter(p => p.id !== playerId).slice(0, 6).map((p, i) => (
                <div key={p.id} className="font-bungee" style={{
                  background: i % 2 === 0 ? '#2ec4b6' : '#f56b1f', color: '#f7e9c4',
                  border: '3px solid #3a1f0a', borderRadius: 6,
                  boxShadow: 'inset 0 0 0 2px #f7e9c4, 3px 3px 0 #3a1f0a',
                  padding: '9px 12px', fontSize: 13, letterSpacing: '0.1em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {p.name.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{ flex: 1 }} />
        <Panel variant="brown" style={{ padding: 14, width: '100%', textAlign: 'center' }}>
          <div className="font-bungee animate-gs-shimmer" style={{ fontSize: 14, color: '#ffd23f', letterSpacing: '0.2em' }}>
            ● WAITING FOR HOST ●
          </div>
        </Panel>
      </div>
      <div className="absolute bottom-8 left-0 right-0 flex justify-center"><Bulbs count={14} size={8} /></div>
    </>
  )

  // ── question ───────────────────────────────────────────────────────────────
  if (phase === 'question' && questionData) {
    const urgent = timeLeft <= 5
    const pct = (timeLeft / questionData.timeLimitSeconds) * 100
    return wrap(
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Timer bar */}
        <div style={{ height: 14, background: '#3a1f0a', borderBottom: '3px solid #ffd23f', flexShrink: 0 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: urgent ? '#c44b6a' : '#f56b1f', transition: 'width 0.25s linear, background 0.3s' }} />
        </div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', flexShrink: 0 }}>
          <Chip variant="teal" style={{ fontSize: 10, padding: '3px 10px' }}>Q{questionData.questionIndex + 1} / {questionData.totalQuestions}</Chip>
          <ChromeNumber size={32} color={urgent ? '#c44b6a' : '#ffd23f'} stroke={1.5}>{timeLeft}</ChromeNumber>
        </div>
        {/* Question hint */}
        <div style={{ padding: '0 16px', flexShrink: 0 }}>
          <Panel variant="cream" style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div className="font-inter" style={{ fontSize: 15, fontWeight: 600, color: '#3a1f0a', lineHeight: 1.3 }}>
              {questionData.text}
            </div>
          </Panel>
        </div>
        {/* 4 tiles */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12, padding: '12px 16px', minHeight: 0 }}>
          {questionData.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className="animate-slide-up font-bungee"
              style={{
                animationDelay: `${i * 60}ms`,
                background: OPTION_PALETTES[i], color: i === 2 ? '#3a1f0a' : '#f7e9c4',
                border: '5px solid #3a1f0a', borderRadius: 12,
                boxShadow: 'inset 0 0 0 3px #f7e9c4, 5px 5px 0 #3a1f0a',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 48, lineHeight: 1 }}>{OPTION_SHAPES[i]}</div>
              <div style={{ fontSize: 14, letterSpacing: '0.12em' }}>{OPTION_LABELS[i]}</div>
            </button>
          ))}
        </div>
        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px 16px', flexShrink: 0 }}>
          <div className="font-bungee" style={{ fontSize: 13, letterSpacing: '0.15em', color: '#ffd23f' }}>{name.toUpperCase()}</div>
          <ChromeNumber size={20} color="#f56b1f" stroke={1.5}>${myScore.toLocaleString()}</ChromeNumber>
        </div>
      </div>
    )
  }

  // ── answer locked ──────────────────────────────────────────────────────────
  if (phase === 'answer-locked' && questionData) {
    const picked = selectedAnswer
    return wrap(
      <>
        <div className="absolute top-14 left-0 right-0 flex justify-center"><Bulbs count={14} size={8} /></div>
        <div style={{ position: 'absolute', inset: '90px 20px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Chip variant="teal" style={{ fontSize: 11 }}>Q{questionData.questionIndex + 1} / {questionData.totalQuestions}</Chip>
          <div
            className="font-bungee animate-gs-pop-center"
            style={{ fontSize: 34, color: '#ffd23f', lineHeight: 1.1, textAlign: 'center', letterSpacing: '0.1em', textShadow: '3px 3px 0 #3a1f0a' }}
          >
            ANSWER<br/>LOCKED!
          </div>
          {picked !== null ? (
            <div
              className="animate-gs-pop-center"
              style={{
                width: 180, height: 180,
                background: OPTION_PALETTES[picked], color: picked === 2 ? '#3a1f0a' : '#f7e9c4',
                border: '6px solid #3a1f0a', borderRadius: 18,
                boxShadow: 'inset 0 0 0 4px #f7e9c4, 6px 6px 0 #3a1f0a',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >
              <div style={{ fontSize: 90, lineHeight: 1 }}>{OPTION_SHAPES[picked]}</div>
              <div className="font-bungee" style={{ fontSize: 20, letterSpacing: '0.15em' }}>{OPTION_LABELS[picked]}</div>
            </div>
          ) : (
            <div className="font-bungee" style={{ fontSize: 24, color: '#c44b6a', letterSpacing: '0.1em', textShadow: '2px 2px 0 #3a1f0a' }}>TIME&apos;S UP!</div>
          )}
          <div style={{ flex: 1 }} />
          <Panel variant="brown" style={{ padding: 14, width: '100%', textAlign: 'center' }}>
            <div className="font-bungee animate-gs-shimmer" style={{ fontSize: 14, color: '#ffd23f', letterSpacing: '0.2em' }}>
              WAITING FOR OTHERS…
            </div>
            <div className="font-inter" style={{ fontSize: 12, color: '#f7e9c4', opacity: 0.6, marginTop: 4, fontWeight: 500 }}>
              {answersReceivedDisplay(players.length)}
            </div>
          </Panel>
        </div>
      </>
    )
  }

  // ── reveal ─────────────────────────────────────────────────────────────────
  if (phase === 'reveal' && questionData && revealData) {
    const total = revealData.answerCounts.reduce((a, b) => a + b, 0) || 1
    const playerCorrect = selectedAnswer === revealData.correctIndex
    const playerAnswered = selectedAnswer !== null
    const mine = standings.find(s => s.name === name)

    return wrap(
      <>
        <div className="absolute top-14 left-0 right-0 flex justify-center">
          <Bulbs count={14} color={playerCorrect ? '#ffd23f' : '#c44b6a'} size={8} />
        </div>
        <div style={{ position: 'absolute', inset: '80px 20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, overflowY: 'auto' }}>
          {/* Verdict */}
          {playerAnswered && (
            <div
              className="font-bungee animate-gs-pop-center"
              style={{
                fontSize: 46, color: playerCorrect ? '#ffd23f' : '#c44b6a',
                WebkitTextStroke: '3px #3a1f0a', textShadow: `0 5px 0 #3a1f0a, 4px 8px 0 ${playerCorrect ? '#2ec4b6' : '#3a1f0a'}`,
                paintOrder: 'stroke fill', letterSpacing: '0.05em', transform: 'rotate(-3deg)',
              }}
            >
              {playerCorrect ? '★ CORRECT ★' : 'OH NO!'}
            </div>
          )}
          {/* Score change */}
          <Panel variant={playerCorrect ? 'gold' : 'cream'} style={{ padding: '10px 20px', textAlign: 'center' }}>
            <div className="font-bungee" style={{ fontSize: 11, letterSpacing: '0.3em', opacity: 0.7, color: '#3a1f0a' }}>
              {playerCorrect ? 'YOU EARNED' : 'NO POINTS'}
            </div>
            <ChromeNumber size={38} color={playerCorrect ? '#f56b1f' : '#3a1f0a'} stroke={2}>
              {playerCorrect ? '+$500' : '+$0'}
            </ChromeNumber>
          </Panel>
          {/* Correct answer */}
          <div style={{ width: '100%' }}>
            <div className="font-bungee" style={{ fontSize: 11, letterSpacing: '0.3em', color: '#ffd23f', marginBottom: 6 }}>CORRECT ANSWER</div>
            <div style={{
              background: '#ffd23f', color: '#3a1f0a', border: '4px solid #3a1f0a', borderRadius: 10,
              boxShadow: 'inset 0 0 0 3px #3a1f0a, 4px 4px 0 #3a1f0a',
              padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div
                className="font-bungee"
                style={{ width: 34, height: 34, borderRadius: '50%', background: '#ffd23f', color: '#3a1f0a', border: '3px solid #3a1f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}
              >
                {OPTION_LABELS[revealData.correctIndex]}
              </div>
              <div className="font-bungee" style={{ flex: 1, fontSize: 15, letterSpacing: '0.05em' }}>{questionData.options[revealData.correctIndex]}</div>
              <div style={{ fontSize: 20 }}>★</div>
            </div>
          </div>
          {/* Answer distribution */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {questionData.options.map((opt, i) => {
              const pct = Math.round(((revealData.answerCounts[i] ?? 0) / total) * 100)
              const isCorrect = i === revealData.correctIndex
              return (
                <div key={i} className="animate-slide-up" style={{
                  animationDelay: `${i * 60}ms`,
                  background: '#f7e9c4', border: `3px solid ${isCorrect ? '#ffd23f' : '#3a1f0a'}`, borderRadius: 8,
                  boxShadow: isCorrect ? '0 0 12px #ffd23f, 3px 3px 0 #3a1f0a' : '3px 3px 0 #3a1f0a',
                  overflow: 'hidden',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px' }}>
                    <div className="font-bungee" style={{ width: 24, height: 24, borderRadius: '50%', background: OPTION_PALETTES[i], color: i === 2 ? '#3a1f0a' : '#f7e9c4', border: '2px solid #3a1f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                      {OPTION_LABELS[i]}
                    </div>
                    <div className="font-inter" style={{ flex: 1, fontSize: 13, color: '#3a1f0a', fontWeight: 600 }}>{opt}</div>
                    <div className="font-bungee" style={{ fontSize: 14, color: '#3a1f0a' }}>{revealData.answerCounts[i] ?? 0}</div>
                  </div>
                  <div style={{ height: 6, background: '#e0d4ad' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: OPTION_PALETTES[i], transition: 'width 0.5s ease-out' }} />
                  </div>
                </div>
              )
            })}
          </div>
          {/* Personal rank */}
          {mine && (
            <Panel variant="brown" style={{ padding: 12, width: '100%' }}>
              <div className="font-bungee" style={{ fontSize: 11, color: '#ffd23f', letterSpacing: '0.3em', marginBottom: 6 }}>YOUR STANDING</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  className="font-bungee"
                  style={{ width: 46, height: 46, borderRadius: '50%', background: '#ffd23f', color: '#3a1f0a', border: '4px solid #3a1f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}
                >
                  {mine.rank}
                </div>
                <div className="font-bungee" style={{ flex: 1, fontSize: 16, color: '#f7e9c4', letterSpacing: '0.12em' }}>{name.toUpperCase()}</div>
                <ChromeNumber size={24} color="#f56b1f" stroke={1.5}>${mine.score.toLocaleString()}</ChromeNumber>
              </div>
            </Panel>
          )}
          <div className="font-inter" style={{ fontSize: 12, color: '#f7e9c4', opacity: 0.6, letterSpacing: '0.15em', fontWeight: 500, textAlign: 'center', paddingBottom: 8 }}>
            NEXT QUESTION COMING UP…
          </div>
        </div>
      </>
    )
  }

  // ── game over ──────────────────────────────────────────────────────────────
  if (phase === 'game-over') {
    const mine = standings.find(s => s.name === name)
    return wrap(
      <>
        <div className="absolute top-14 left-0 right-0 flex justify-center"><Bulbs count={14} size={8} /></div>
        <div style={{ position: 'absolute', inset: '80px 20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, overflowY: 'auto' }}>
          <div
            className="font-bungee"
            style={{ fontSize: 40, color: '#ffd23f', WebkitTextStroke: '3px #3a1f0a', textShadow: '0 5px 0 #3a1f0a, 4px 8px 0 #2ec4b6', paintOrder: 'stroke fill', letterSpacing: '0.05em', transform: 'skewX(-4deg)' }}
          >
            GAME OVER
          </div>
          {/* Trophy */}
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, #f7e9c4, #ffd23f)`,
            border: '6px solid #3a1f0a',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 52, color: '#3a1f0a', boxShadow: '0 0 28px #ffd23faa, 5px 5px 0 #3a1f0a',
          }}>★</div>
          {mine && (
            <>
              <div className="font-bungee" style={{ fontSize: 13, letterSpacing: '0.4em', color: '#ffd23f' }}>YOU FINISHED</div>
              <ChromeNumber size={60} color="#f56b1f" stroke={3}>#{mine.rank}</ChromeNumber>
              <Panel variant="gold" style={{ padding: '10px 22px' }}>
                <ChromeNumber size={28} color="#3a1f0a" stroke={1.5}>${mine.score.toLocaleString()}</ChromeNumber>
              </Panel>
            </>
          )}
          {/* Top 3 */}
          <div style={{ width: '100%', marginTop: 6 }}>
            <div className="font-bungee" style={{ fontSize: 11, letterSpacing: '0.3em', color: '#ffd23f', marginBottom: 8 }}>TOP 3</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {standings.slice(0, 3).map((p, i) => (
                <div key={p.rank} style={{
                  background: i === 0 ? '#ffd23f' : '#f7e9c4', color: '#3a1f0a',
                  border: '3px solid #3a1f0a', borderRadius: 6, padding: '8px 12px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div
                    className="font-bungee"
                    style={{ width: 26, height: 26, borderRadius: '50%', background: ['#ffd23f', '#2ec4b6', '#f56b1f'][i], color: '#3a1f0a', border: '2px solid #3a1f0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                  >{i + 1}</div>
                  <div className="font-bungee" style={{ flex: 1, fontSize: 15, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <ChromeNumber size={15} color="#f56b1f" stroke={1.2}>${p.score.toLocaleString()}</ChromeNumber>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <BlockButton size="md" style={{ width: '100%' }} onClick={() => router.push('/')}>PLAY AGAIN</BlockButton>
        </div>
      </>
    )
  }

  return null
}

function answersReceivedDisplay(_total: number) {
  return 'Waiting for everyone…'
}
