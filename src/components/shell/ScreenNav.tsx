import type { ScreenId } from '@/types'
import { screenNotes } from '@/data/screenNotes'
import { IconStudent, IconParent } from '@/components/common/Icons'

interface Props {
  current: ScreenId
  onJump: (id: ScreenId) => void
}

export default function ScreenNav({ current, onJump }: Props) {
  const groups = [
    { key: 'entry', label: '入口', Icon: IconStudent, items: screenNotes.filter(n => n.role === 'entry') },
    { key: 'student', label: '学生端 · 元宝同桌', Icon: IconStudent, items: screenNotes.filter(n => n.role === 'student') },
    { key: 'parent', label: '家长端 · AI 家教', Icon: IconParent, items: screenNotes.filter(n => n.role === 'parent') },
  ]

  return (
    <aside className="w-[248px] shrink-0 hidden xl:flex flex-col gap-5 py-8 pl-8 pr-2 h-screen overflow-y-auto scroll-area">
      <div>
        <div className="text-[13px] font-bold tracking-wide text-brand-700">可交互产品原型</div>
        <h1 className="text-[19px] font-bold leading-snug mt-1">初中数理成长导师</h1>
        <p className="text-xs text-ink-500 mt-1.5 leading-relaxed">
          每个孩子都能拥有的<br />专属初中数理成长导师
        </p>
      </div>

      {groups.map(g => (
        <div key={g.key}>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink-400 uppercase tracking-wider mb-2">
            <g.Icon className="w-3.5 h-3.5" />
            {g.label}
          </div>
          <div className="space-y-1">
            {g.items.map(n => {
              const on = current === n.id
              return (
                <button
                  key={n.id}
                  onClick={() => onJump(n.id)}
                  className={`w-full text-left rounded-xl px-3 py-2 flex items-center gap-2.5 transition ${
                    on ? 'bg-brand-500 text-white shadow-[0_3px_10px_rgba(47,144,245,.3)]' : 'text-ink-700 hover:bg-white'
                  }`}
                >
                  <span
                    className={`text-[10px] font-bold tabular-nums rounded-md px-1.5 py-0.5 ${
                      on ? 'bg-white/25' : 'bg-ink-100 text-ink-500'
                    }`}
                  >
                    {n.index}
                  </span>
                  <span className="text-[13.5px] font-semibold leading-tight">{n.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div className="mt-auto pt-4 text-[11px] text-ink-400 leading-relaxed">
        本原型全部文案与流程取自
        <br />
        《产品定位说明》《核心流程说明》
      </div>
    </aside>
  )
}
