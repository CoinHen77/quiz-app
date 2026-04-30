'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function verifyPassword(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const password = formData.get('password') as string
  if (password === process.env.HOST_PASSWORD) {
    const jar = await cookies()
    jar.set('host-auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8,
    })
    redirect('/host')
  }
  return 'Incorrect password'
}
