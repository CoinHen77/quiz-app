'use client'

import React, { useEffect, useState } from 'react'

type Reaction = 'idle' | 'correct' | 'wrong' | 'thinking' | 'cheer'
type Who = 'mira' | 'theo'

interface HostAvatarProps {
  who?: Who
  reaction?: Reaction
  size?: number
  bobOffset?: number
}

const HOST_DATA = {
  mira: { skin: '#e8c4a0', skinShadow: '#c89878', hair: '#3a2418', hairAccent: '#8a4a2a', shirt: '#d94c3a', shirtShadow: '#a8392b' },
  theo: { skin: '#d4a575', skinShadow: '#a8845a', hair: '#1a1a1a', hairAccent: '#444',    shirt: '#2a4a8a', shirtShadow: '#1f3868' },
}

export function HostAvatar({ who = 'mira', reaction = 'idle', size = 220, bobOffset = 0 }: HostAvatarProps) {
  const d = HOST_DATA[who]
  const [bob, setBob] = useState(0)

  useEffect(() => {
    let raf: number
    const start = performance.now() + bobOffset * 1000
    const tick = (t: number) => {
      setBob(Math.sin(((t - start) / 1000) * 1.4) * 2.5)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [bobOffset])

  const mouth = (() => {
    if (reaction === 'correct' || reaction === 'cheer')
      return <path d="M 88 122 Q 100 134 112 122" stroke="#3a1a14" strokeWidth="3" fill="#5a2418" strokeLinecap="round" />
    if (reaction === 'wrong')
      return <path d="M 88 128 Q 100 118 112 128" stroke="#3a1a14" strokeWidth="3" fill="none" strokeLinecap="round" />
    if (reaction === 'thinking')
      return <path d="M 92 126 L 108 124" stroke="#3a1a14" strokeWidth="3" fill="none" strokeLinecap="round" />
    return <path d="M 90 124 Q 100 130 110 124" stroke="#3a1a14" strokeWidth="3" fill="none" strokeLinecap="round" />
  })()

  const eyesClosed = reaction === 'cheer'
  const eyesWide   = reaction === 'correct'
  const browY = reaction === 'thinking' ? 88 : reaction === 'wrong' ? 90 : 92

  const hairPath = who === 'mira'
    ? 'M 60 80 Q 60 38 100 38 Q 140 38 140 80 Q 140 86 142 92 Q 130 70 100 70 Q 70 70 58 92 Q 60 86 60 80 Z'
    : 'M 64 78 Q 64 42 100 42 Q 136 42 136 78 Q 136 84 132 88 Q 130 74 120 70 Q 110 78 100 78 Q 90 78 80 70 Q 70 74 68 88 Q 64 84 64 78 Z'

  return (
    <svg
      viewBox="0 0 200 240"
      width={size}
      height={size * 1.2}
      style={{ transform: `translateY(${bob}px)`, transition: 'transform 0.05s linear' }}
    >
      <path d="M 40 240 Q 40 180 100 175 Q 160 180 160 240 Z" fill={d.shirt} />
      <path d="M 40 240 Q 50 200 70 195 L 70 240 Z" fill={d.shirtShadow} opacity="0.5" />
      <rect x="88" y="155" width="24" height="25" fill={d.skinShadow} />
      <ellipse cx="100" cy="115" rx="42" ry="48" fill={d.skin} />
      <path d="M 100 70 Q 142 80 138 130 Q 134 158 100 162 Q 130 158 134 130 Q 138 80 100 70 Z" fill={d.skinShadow} opacity="0.4" />
      <path d={hairPath} fill={d.hair} />
      <path d="M 78 60 Q 90 50 105 52" stroke={d.hairAccent} strokeWidth="3" fill="none" opacity="0.6" />
      <rect x="78" y={browY} width="14" height="3" rx="1.5" fill={d.hair} transform={reaction === 'thinking' ? 'rotate(-8 85 92)' : ''} />
      <rect x="108" y={browY} width="14" height="3" rx="1.5" fill={d.hair} transform={reaction === 'thinking' ? 'rotate(8 115 92)'  : ''} />
      {eyesClosed ? (
        <>
          <path d="M 78 104 Q 85 100 92 104"   stroke="#1a1a1a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 108 104 Q 115 100 122 104" stroke="#1a1a1a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="85"  cy="104" rx={eyesWide ? 4 : 2.8} ry={eyesWide ? 4 : 3.2} fill="#1a1a1a" />
          <ellipse cx="115" cy="104" rx={eyesWide ? 4 : 2.8} ry={eyesWide ? 4 : 3.2} fill="#1a1a1a" />
          <circle cx="86"  cy="103" r="1" fill="#fff" />
          <circle cx="116" cy="103" r="1" fill="#fff" />
        </>
      )}
      {(reaction === 'cheer' || reaction === 'correct') && (
        <>
          <ellipse cx="74"  cy="118" rx="6" ry="3" fill="#e88060" opacity="0.5" />
          <ellipse cx="126" cy="118" rx="6" ry="3" fill="#e88060" opacity="0.5" />
        </>
      )}
      {mouth}
    </svg>
  )
}
