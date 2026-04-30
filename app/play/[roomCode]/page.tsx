import { Suspense } from 'react'
import PlayerClient from './player-client'

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ roomCode: string }>
}) {
  const { roomCode } = await params
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
          <p className="text-gray-400">Connecting…</p>
        </main>
      }
    >
      <PlayerClient roomCode={roomCode} />
    </Suspense>
  )
}
