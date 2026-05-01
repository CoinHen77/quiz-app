'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'

type Reaction = 'idle' | 'correct' | 'wrong' | 'thinking' | 'cheer'
type Who = 'mira' | 'theo'

interface HostAvatarProps {
  who?: Who
  reaction?: Reaction
  size?: number
  bobOffset?: number
  label?: string
}

const HOST_SRC: Record<Who, string> = {
  mira: '/host_left.png',
  theo: '/host_right.png',
}

export function HostAvatar({ who = 'mira', reaction = 'idle', size = 220, bobOffset = 0, label }: HostAvatarProps) {
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

  const cheering = reaction === 'cheer' || reaction === 'correct'
  const height = Math.round(size * 1.2)

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: height,
        borderRadius: 12,
        overflow: 'hidden',
        transform: `translateY(${bob}px) scale(${cheering ? 1.04 : 1})`,
        transition: 'transform 0.05s linear, filter 0.2s ease',
        filter: cheering ? 'brightness(1.08)' : 'none',
        flexShrink: 0,
      }}
    >
      <Image
        src={HOST_SRC[who]}
        alt={who}
        width={size}
        height={height}
        style={{ objectFit: 'cover', objectPosition: 'top center', width: '100%', height: '100%' }}
        priority
      />
      {label && (
        <div style={{
          position: 'absolute', bottom: 8, left: 0, right: 0,
          textAlign: 'center',
          fontFamily: 'inherit',
          fontSize: Math.round(size * 0.08),
          color: '#ffd23f',
          letterSpacing: '0.2em',
          textShadow: '2px 2px 0 #3a1f0a',
          fontWeight: 700,
        }} className="font-bungee">
          {label}
        </div>
      )}
    </div>
  )
}
