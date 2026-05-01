'use client'

import React from 'react'

const GS = {
  ORANGE: '#f56b1f',
  TEAL:   '#2ec4b6',
  GOLD:   '#ffd23f',
  CREAM:  '#f7e9c4',
  BROWN:  '#3a1f0a',
  PINK:   '#c44b6a',
} as const

export const OPTION_PALETTES = [GS.ORANGE, GS.TEAL, GS.GOLD, GS.PINK]
export const OPTION_LABELS   = ['A', 'B', 'C', 'D']
export const OPTION_SHAPES   = ['▲', '◆', '●', '■']

export function Bulbs({ count = 20, color = GS.GOLD, size = 12 }: { count?: number; color?: string; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: size * 0.7, flexWrap: 'wrap', justifyContent: 'center' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-gs-bulb"
          style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: `radial-gradient(circle at 30% 30%, #fff, ${color})`,
            boxShadow: `0 0 ${size * 0.7}px ${color}aa`,
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  )
}

export function Sunburst({ opacity = 0.7 }: { opacity?: number }) {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `repeating-conic-gradient(from 0deg at 50% 50%, ${GS.ORANGE}22 0deg, ${GS.ORANGE}22 8deg, transparent 8deg, transparent 16deg)`,
        opacity,
      }}
    />
  )
}

export function CarpetStripe({ height = 80 }: { height?: number }) {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 pointer-events-none"
      style={{
        height,
        background: `repeating-linear-gradient(135deg, ${GS.ORANGE} 0 20px, ${GS.GOLD} 20px 40px, ${GS.TEAL} 40px 60px, ${GS.BROWN} 60px 80px)`,
        opacity: 0.55,
      }}
    />
  )
}

export function Logo({ size = 80, withTagline = false }: { size?: number; withTagline?: boolean }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        className="font-bungee"
        style={{
          fontSize: size, lineHeight: 0.9, letterSpacing: '0.04em',
          color: GS.ORANGE,
          WebkitTextStroke: `${Math.max(2, size / 30)}px ${GS.BROWN}`,
          textShadow: `0 ${size / 16}px 0 ${GS.BROWN}, ${size / 22}px ${size / 9}px 0 ${GS.TEAL}`,
          paintOrder: 'stroke fill',
          transform: 'skewX(-6deg)',
        }}
      >
        INNOQUIZ
      </div>
      {withTagline && (
        <div
          className="font-bungee"
          style={{
            marginTop: size * 0.12, fontSize: size * 0.16, color: GS.GOLD,
            letterSpacing: '0.4em', background: GS.BROWN, padding: '4px 18px', borderRadius: 4,
          }}
        >
          ★  THE GAME SHOW  ★
        </div>
      )}
    </div>
  )
}

type PanelVariant = 'cream' | 'orange' | 'teal' | 'gold' | 'pink' | 'stage' | 'brown'

export function Panel({
  variant = 'cream', children, style = {}, innerStroke, className = '',
}: {
  variant?: PanelVariant
  children?: React.ReactNode
  style?: React.CSSProperties
  innerStroke?: string
  className?: string
}) {
  const base: React.CSSProperties = { border: `5px solid ${GS.BROWN}`, borderRadius: 12, position: 'relative' }
  const v: Record<PanelVariant, React.CSSProperties> = {
    cream:  { background: GS.CREAM,  color: GS.BROWN, boxShadow: `inset 0 0 0 3px ${innerStroke || GS.GOLD}, 6px 6px 0 ${GS.BROWN}` },
    orange: { background: GS.ORANGE, color: GS.CREAM, boxShadow: `inset 0 0 0 3px ${innerStroke || GS.CREAM}, 6px 6px 0 ${GS.BROWN}` },
    teal:   { background: GS.TEAL,   color: GS.CREAM, boxShadow: `inset 0 0 0 3px ${innerStroke || GS.CREAM}, 6px 6px 0 ${GS.BROWN}` },
    gold:   { background: GS.GOLD,   color: GS.BROWN, boxShadow: `inset 0 0 0 3px ${innerStroke || GS.BROWN}, 6px 6px 0 ${GS.BROWN}` },
    pink:   { background: GS.PINK,   color: GS.CREAM, boxShadow: `inset 0 0 0 3px ${innerStroke || GS.CREAM}, 6px 6px 0 ${GS.BROWN}` },
    stage:  { background: `radial-gradient(ellipse at 50% 20%, ${GS.ORANGE}, ${GS.BROWN})`, color: GS.CREAM, border: `5px solid ${GS.GOLD}`, boxShadow: `inset 0 0 0 3px ${GS.BROWN}, 6px 6px 0 ${GS.BROWN}` },
    brown:  { background: GS.BROWN,  color: GS.CREAM, boxShadow: `inset 0 0 0 3px ${innerStroke || GS.GOLD}, 6px 6px 0 #000` },
  }
  return <div className={className} style={{ ...base, ...v[variant], ...style }}>{children}</div>
}

type BtnVariant = 'gold' | 'orange' | 'teal' | 'cream'
type BtnSize    = 'sm' | 'md' | 'lg'

export function BlockButton({
  children, variant = 'gold', size = 'md', style = {}, onClick, disabled, className = '', type = 'button',
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: BtnSize }) {
  const sizes: Record<BtnSize, { padding: string; fontSize: number; shadow: number }> = {
    sm: { padding: '10px 20px', fontSize: 14, shadow: 4 },
    md: { padding: '14px 28px', fontSize: 18, shadow: 5 },
    lg: { padding: '18px 48px', fontSize: 26, shadow: 8 },
  }
  const variants: Record<BtnVariant, React.CSSProperties> = {
    gold:   { background: `linear-gradient(180deg, ${GS.GOLD}, ${GS.ORANGE})`, color: GS.BROWN },
    orange: { background: GS.ORANGE, color: GS.CREAM },
    teal:   { background: GS.TEAL,   color: GS.CREAM },
    cream:  { background: GS.CREAM,  color: GS.BROWN },
  }
  const s = sizes[size]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`font-bungee ${className}`}
      style={{
        ...variants[variant],
        border: `4px solid ${GS.BROWN}`,
        padding: s.padding, fontSize: s.fontSize, letterSpacing: '0.2em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: `${s.shadow}px ${s.shadow}px 0 ${GS.BROWN}`,
        opacity: disabled ? 0.6 : 1,
        transition: 'transform 0.08s',
        ...style,
      }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = `translate(${s.shadow / 2}px,${s.shadow / 2}px)` }}
      onMouseUp={e   => { if (!disabled) e.currentTarget.style.transform = 'none' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
    >
      {children}
    </button>
  )
}

type ChipVariant = 'teal' | 'orange' | 'gold' | 'cream' | 'brown'

export function Chip({
  children, variant = 'teal', style = {},
}: {
  children?: React.ReactNode; variant?: ChipVariant; style?: React.CSSProperties
}) {
  const v: Record<ChipVariant, React.CSSProperties> = {
    teal:   { background: GS.TEAL,   color: GS.CREAM },
    orange: { background: GS.ORANGE, color: GS.BROWN },
    gold:   { background: GS.GOLD,   color: GS.BROWN },
    cream:  { background: GS.CREAM,  color: GS.BROWN },
    brown:  { background: GS.BROWN,  color: GS.GOLD  },
  }
  return (
    <div
      className="font-bungee inline-block"
      style={{ ...v[variant], padding: '4px 14px', borderRadius: 4, fontSize: 13, letterSpacing: '0.2em', border: `3px solid ${GS.BROWN}`, ...style }}
    >
      {children}
    </div>
  )
}

export function ChromeNumber({
  children, size = 36, color = GS.ORANGE, stroke = 2,
}: {
  children?: React.ReactNode; size?: number; color?: string; stroke?: number
}) {
  return (
    <div
      className="font-bungee"
      style={{ color, fontSize: size, WebkitTextStroke: `${stroke}px ${GS.BROWN}`, paintOrder: 'stroke fill', letterSpacing: '0.05em', lineHeight: 1 }}
    >
      {children}
    </div>
  )
}

type OptionState = 'idle' | 'picked' | 'correct' | 'wrong' | 'dimmed'
type OptionSize  = 'lg' | 'md' | 'sm'

export function OptionButton({
  index, label, state = 'idle', size = 'lg', onClick, disabled, showShape = false,
}: {
  index: number; label: string; state?: OptionState; size?: OptionSize
  onClick?: () => void; disabled?: boolean; showShape?: boolean
}) {
  const c  = OPTION_PALETTES[index]
  const bg = state === 'correct' ? GS.GOLD : state === 'wrong' ? '#5a2a1a' : c
  const textColor = state === 'correct' || index === 2 ? GS.BROWN : GS.CREAM
  const sz: Record<OptionSize, { fontSize: number; badgeSize: number; padding: string; minHeight: number; gap: number }> = {
    lg: { fontSize: 24, badgeSize: 60, padding: '0 28px', minHeight: 100, gap: 22 },
    md: { fontSize: 20, badgeSize: 50, padding: '0 22px', minHeight: 80,  gap: 16 },
    sm: { fontSize: 16, badgeSize: 40, padding: '0 16px', minHeight: 64,  gap: 12 },
  }
  const s = sz[size]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="font-bungee"
      style={{
        background: bg, color: state === 'wrong' ? GS.CREAM : textColor,
        border: `5px solid ${GS.BROWN}`, borderRadius: 12,
        boxShadow: `inset 0 0 0 3px ${state === 'correct' ? GS.BROWN : GS.CREAM}, 6px 6px 0 ${GS.BROWN}`,
        padding: s.padding, display: 'flex', alignItems: 'center', gap: s.gap,
        cursor: disabled ? 'default' : 'pointer', textAlign: 'left',
        opacity: state === 'dimmed' ? 0.45 : 1,
        transform: state === 'correct' ? 'translate(-3px,-3px) rotate(-1deg)' : 'none',
        transition: 'transform 0.15s', minHeight: s.minHeight, width: '100%',
      }}
    >
      <div style={{
        width: s.badgeSize, height: s.badgeSize, borderRadius: '50%',
        background: GS.CREAM, color: GS.BROWN, border: `4px solid ${GS.BROWN}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: s.badgeSize * 0.45, flexShrink: 0,
      }}>
        {showShape ? OPTION_SHAPES[index] : OPTION_LABELS[index]}
      </div>
      <div style={{ fontSize: s.fontSize, lineHeight: 1.15, flex: 1, letterSpacing: '0.02em' }}>{label}</div>
      {state === 'correct' && <div style={{ fontSize: s.fontSize * 1.2 }}>★</div>}
    </button>
  )
}
