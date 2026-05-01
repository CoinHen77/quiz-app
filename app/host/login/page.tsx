'use client'

import { useActionState } from 'react'
import { verifyPassword } from './actions'
import { Sunburst, Logo, Panel, BlockButton, Bulbs, Chip } from '@/components/gameshow'

export default function HostLoginPage() {
  const [error, action, isPending] = useActionState(verifyPassword, null)

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-6" style={{ background: '#3a1f0a' }}>
      <Sunburst />

      <div className="absolute top-6 left-0 right-0 flex justify-center">
        <Bulbs count={36} />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-6 mt-12">
        <Chip variant="gold" style={{ letterSpacing: '0.35em', fontSize: 13 }}>★ HOST ENTRANCE ★</Chip>
        <Logo size={100} withTagline />

        <Panel variant="cream" style={{ padding: '24px 28px', width: '100%', marginTop: 12 }}>
          <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <div className="font-bungee" style={{ fontSize: 12, letterSpacing: '0.3em', opacity: 0.7, marginBottom: 8, color: '#3a1f0a' }}>
                HOST PASSWORD
              </div>
              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                autoFocus
                className="font-bungee"
                style={{
                  width: '100%', background: '#fff', border: '4px solid #3a1f0a', borderRadius: 8,
                  padding: '14px 16px', fontSize: 22, color: '#3a1f0a', letterSpacing: '0.4em',
                  outline: 'none', boxSizing: 'border-box', boxShadow: 'inset 0 2px 0 #00000018',
                }}
              />
            </div>
            {error && (
              <div className="font-bungee" style={{ fontSize: 13, color: '#c44b6a', textAlign: 'center' }}>
                {error}
              </div>
            )}
            <BlockButton type="submit" size="md" style={{ width: '100%' }} disabled={isPending}>
              {isPending ? 'CHECKING…' : 'ENTER ▶'}
            </BlockButton>
          </form>
        </Panel>

        <p className="font-inter" style={{ fontSize: 12, opacity: 0.6, fontWeight: 500, color: '#f7e9c4' }}>
          Players don't need a password — just the room code.
        </p>
      </div>

      <div className="absolute bottom-24 left-0 right-0 flex justify-center">
        <Bulbs count={36} />
      </div>
    </main>
  )
}
