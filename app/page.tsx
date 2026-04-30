'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-10">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black tracking-tight text-indigo-400">QuizBlitz</h1>
          <p className="text-gray-400">Live multiplayer quiz</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-3">
          <input
            value={roomCode}
            onChange={e => { setRoomCode(e.target.value.toUpperCase()); setError('') }}
            placeholder="ROOM CODE"
            maxLength={6}
            autoCapitalize="characters"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-center text-2xl font-bold tracking-widest uppercase placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <input
            value={name}
            onChange={e => { setName(e.target.value); setError('') }}
            placeholder="Your name"
            maxLength={20}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold text-lg transition-colors"
          >
            Join Game
          </button>
        </form>

        <div className="text-center">
          <Link href="/host" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            Host a quiz →
          </Link>
        </div>
      </div>
    </main>
  )
}
