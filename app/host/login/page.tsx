'use client'

import { useActionState } from 'react'
import { verifyPassword } from './actions'

export default function HostLoginPage() {
  const [error, action, isPending] = useActionState(verifyPassword, null)

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <form
        action={action}
        className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm space-y-5 shadow-2xl"
      >
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-white">Host Login</h1>
          <p className="text-gray-400 text-sm">Enter the host password to continue</p>
        </div>

        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          autoFocus
          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
        >
          {isPending ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </main>
  )
}
