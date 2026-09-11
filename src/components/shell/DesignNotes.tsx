import type { ScreenId } from '@/types'
import { noteById } from '@/data/screenNotes'
import { IconBook, IconShield } from '@/components/common/Icons'

interface Props {
  current: ScreenId
}

export default function DesignNotes({ current }: Props) {
  const note = noteById(current)

  return (
    <aside className="w-[330px] shrink-0 hidden lg:flex flex-col gap-4 py-8 pr-8 pl-2 h-screen overflow-y-auto scroll-area">
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="chip bg-brand-50 text-brand-700">屏 {note.index}</span>
          <span className="text-xs text-ink-400">
            {note.role === 'parent' ? '家长端' : note.role === 'student' ? '学生端' : '入口'}
          </span>
        </div>
        <h2 className="text-lg font-bold mb-2">{note.name}</h2>
        <p className="text-sm text-ink-700 leading-relaxed">{note.intent}</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 text-[13px] font-bold text-ink-900 mb-3">
          <IconBook className="w-4 h-4 text-brand-600" />
          对表文档条款
        </div>
        <ul className="space-y-2.5">
          {note.refs.map((r, i) => (
            <li key={i} className="flex gap-2 text-[13px] text-ink-700 leading-relaxed">
              <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-2 text-[13px] font-bold text-ink-900 mb-3">
          <IconShield className="w-4 h-4 text-cheer-600" />
          青少年安全与友好设计
        </div>
        <ul className="space-y-2.5">
          {note.safety.map((s, i) => (
            <li key={i} className="flex gap-2 text-[13px] text-ink-700 leading-relaxed">
              <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-cheer-500 shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
