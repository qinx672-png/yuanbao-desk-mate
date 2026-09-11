import { IconSpark, IconChart } from './Icons'

interface Props {
  active: 'home' | 'growth'
  onChange: (tab: 'home' | 'growth') => void
}

/**
 * 学生端底部导航：只有「学习」与「我的成长」两个页签。
 * 刻意不设置商城 / 会员 / 社区 / 排行榜等入口 —— 学生端零商业化、零社交。
 */
export default function TabBar({ active, onChange }: Props) {
  const items = [
    { key: 'home' as const, label: '学习', Icon: IconSpark },
    { key: 'growth' as const, label: '我的成长', Icon: IconChart },
  ]
  return (
    <div className="shrink-0 bg-white border-t border-ink-100 px-6 pt-2 pb-1 flex">
      {items.map(({ key, label, Icon }) => {
        const on = active === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`tap flex-1 flex-col gap-0.5 ${on ? 'text-brand-600' : 'text-ink-400'}`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-semibold">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
