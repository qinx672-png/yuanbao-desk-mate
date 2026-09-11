import type { ReactNode } from 'react'
import { IconArrowLeft } from './Icons'

interface Props {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
  tone?: 'student' | 'parent' | 'dark'
}

export default function AppBar({ title, subtitle, onBack, right, tone = 'student' }: Props) {
  const light = tone === 'student'
  const bg = light ? 'bg-white' : tone === 'parent' ? 'bg-parent-800' : 'bg-[#121a26]'
  const text = light ? 'text-ink-900' : 'text-white'
  const sub = light ? 'text-ink-500' : 'text-white/70'

  return (
    <div className={`shrink-0 ${bg} ${text} px-4 py-3 flex items-center gap-2 border-b ${light ? 'border-ink-100' : 'border-white/10'}`}>
      {onBack && (
        <button
          onClick={onBack}
          aria-label="返回"
          className="tap w-11 h-11 -ml-2 rounded-full active:bg-ink-100/60 transition shrink-0"
        >
          <IconArrowLeft />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-lg font-bold leading-tight truncate">{title}</div>
        {subtitle && <div className={`text-xs ${sub} truncate mt-0.5`}>{subtitle}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}
