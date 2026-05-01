'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Sunburst, CarpetStripe, Logo, Panel, BlockButton, Chip, Bulbs } from '@/components/gameshow'

export default function HomePage() {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    const code = roomCode.trim().toUpperCase()
    const playerName = name.trim()
    if (!code || code.length !== 6) { setError('Enter a 6-character room code'); return }
    if (!playerName) { setError('Enter your name'); return }
    router.push(`/play/${code}?name=${encodeURIComponent(playerName)}`)
  }

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6" style={{ background: '#3a1f0a' }}>
      <Sunburst />
      <CarpetStripe />

      <div className="absolute top-5 left-0 right-0 flex justify-center">
        <Bulbs count={28} />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6">
        <Chip variant="gold" style={{ letterSpacing: '0.35em', fontSize: 13 }}>★ STEP RIGHT UP ★</Chip>
        <Logo size={100} />

        <Panel variant="cream" style={{ padding: '24px 28px', width: '100%' }}>
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="font-bungee" style={{ fontSize: 11, letterSpacing: '0.3em', opacity: 0.7, marginBottom: 6, color: '#3a1f0a' }}>
                ROOM CODE
              </div>
              <input
                value={roomCode}
                onChange={e => { setRoomCode(e.target.value.toUpperCase()); setError('') }}
                placeholder="XXXXXX"
                maxLength={6}
                autoCapitalize="characters"
                className="font-bungee"
                style={{
                  width: '100%', background: '#fff', border: '4px solid #3a1f0a', borderRadius: 8,
                  padding: '12px 16px', fontSize: 28, color: '#3a1f0a', letterSpacing: '0.2em',
                  textAlign: 'center', textTransform: 'uppercase', outline: 'none',
                  boxSizing: 'border-box', boxShadow: 'inset 0 2px 0 #00000018',
                }}
              />
            </div>
            <div>
              <div className="font-bungee" style={{ fontSize: 11, letterSpacing: '0.3em', opacity: 0.7, marginBottom: 6, color: '#3a1f0a' }}>
                YOUR NAME
              </div>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setError('') }}
                placeholder="Enter your name"
                maxLength={20}
                className="font-inter"
                style={{
                  width: '100%', background: '#fff', border: '4px solid #3a1f0a', borderRadius: 8,
                  padding: '12px 16px', fontSize: 16, color: '#3a1f0a', outline: 'none',
                  boxSizing: 'border-box', boxShadow: 'inset 0 2px 0 #00000018',
                }}
              />
            </div>
            {error && (
              <div className="font-bungee" style={{ fontSize: 13, color: '#c44b6a', textAlign: 'center', letterSpacing: '0.05em' }}>
                {error}
              </div>
            )}
            <BlockButton type="submit" size="md" style={{ width: '100%', marginTop: 4 }}>
              JOIN GAME ▶
            </BlockButton>
          </form>
        </Panel>

        <Link href="/host" className="font-bungee" style={{ color: '#ffd23f', fontSize: 13, letterSpacing: '0.2em', textDecoration: 'underline' }}>
          HOST A QUIZ →
        </Link>
      </div>

      <div className="absolute bottom-24 left-0 right-0 flex justify-center">
        <Bulbs count={28} />
      </div>
    </main>
  )
}
