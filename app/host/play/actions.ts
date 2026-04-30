'use server'

import { cookies } from 'next/headers'

export async function getHostPassword(): Promise<string | null> {
  const jar = await cookies()
  if (jar.get('host-auth')?.value !== 'true') return null
  return process.env.HOST_PASSWORD ?? null
}
