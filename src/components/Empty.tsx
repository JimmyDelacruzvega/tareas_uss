import type { ReactNode } from 'react'

export function Empty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <svg width="52" height="52" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="10" y="14" width="44" height="36" rx="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M22 32h20M22 40h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  )
}

export function Ring({ value, label }: { value: number; label: string }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const safe = Math.max(0, Math.min(100, value))
  const offset = circumference - (safe / 100) * circumference
  return (
    <div className="ring">
      <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
        <circle className="ring-track" cx="38" cy="38" r={radius} />
        <circle
          className="ring-value"
          cx="38"
          cy="38"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div>
        <strong>{safe}%</strong>
        <span>{label}</span>
      </div>
    </div>
  )
}
