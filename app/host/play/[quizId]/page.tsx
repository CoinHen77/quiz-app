import { Suspense } from 'react'
import HostClient from './host-client'

export default async function HostPlayPage({
  params,
}: {
  params: Promise<{ quizId: string }>
}) {
  const { quizId } = await params
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
          <p className="text-gray-400">Loading…</p>
        </main>
      }
    >
      <HostClient quizId={quizId} />
    </Suspense>
  )
}
