import { student, weeklyReport } from '@/data/mockData'
import { IconChart, IconBook, IconClock, IconSpark, IconArrowRight, IconShield } from '@/components/common/Icons'
import type { ScreenId } from '@/types'

interface Props {
  onOpen: (id: ScreenId) => void
  planDecided: '接受' | '暂不调整' | null
}

export default function ParentHome({ onOpen, planDecided }: Props) {
  const entries: { id: ScreenId; label: string; desc: string; Icon: typeof IconChart; tag?: string }[] = [
    { id: 'par-weekly', label: '本周学习总结', desc: '学习时长 · 题目数量 · 知识点覆盖', Icon: IconChart },
    { id: 'par-weak', label: '薄弱知识点分析', desc: '带教材章节与掌握进度', Icon: IconBook },
    { id: 'par-trend', label: '学习状态趋势', desc: '只给信号与依据，不下情绪结论', Icon: IconClock },
    { id: 'par-assistant', label: '学习助手', desc: '学情随时问 · 对话原文不外传', Icon: IconShield },
    {
      id: 'par-plan',
      label: '下一步学习计划建议',
      desc: '点一下就能参与孩子的学习安排',
      Icon: IconSpark,
      tag: planDecided ?? '待你确认',
    },
  ]

  return (
    <div className="flex-1 min-h-0 scroll-area bg-ink-50">
      {/* 本周报告卡 */}
      <div className="bg-parent-800 px-5 pt-2 pb-8">
        <div className="text-white/60 text-[12.5px] mb-1">{weeklyReport.weekLabel}</div>
        <h1 className="text-white text-[21px] font-bold leading-snug mb-1">
          {student.name}的第 12 周学情报告
        </h1>
        <p className="text-white/70 text-[13px] leading-relaxed">
          这周孩子{weeklyReport.trendHeadline}，看完大约需要 3 分钟。
        </p>
      </div>

      <div className="px-5 -mt-5 pb-6 space-y-4">
        {/* 三个核心数字 */}
        <div className="card p-4 grid grid-cols-3 divide-x divide-ink-100">
          {[
            ['学习时长', `${Math.floor(weeklyReport.minutes / 60)}h${weeklyReport.minutes % 60}m`],
            ['题目数量', `${weeklyReport.problemCount} 道`],
            ['知识点', `${weeklyReport.knowledgeCount} 个`],
          ].map(([k, v]) => (
            <div key={k} className="text-center px-1">
              <div className="text-[19px] font-bold text-parent-700 tabular-nums">{v}</div>
              <div className="text-[11.5px] text-ink-400 mt-0.5">{k}</div>
            </div>
          ))}
        </div>

        {/* 报告分区入口 */}
        <div className="card divide-y divide-ink-100">
          {entries.map(e => (
            <button
              key={e.id}
              onClick={() => onOpen(e.id)}
              className="w-full px-4 py-4 flex items-center gap-3 text-left active:bg-ink-50 transition first:rounded-t-2xl last:rounded-b-2xl"
            >
              <span className="w-10 h-10 rounded-xl bg-parent-50 text-parent-600 flex items-center justify-center shrink-0">
                <e.Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[15.5px] font-bold text-ink-900">{e.label}</div>
                <div className="text-[12.5px] text-ink-400 mt-0.5 truncate">{e.desc}</div>
              </div>
              {e.tag && (
                <span
                  className={`chip text-[11px] shrink-0 ${
                    e.tag === '待你确认' ? 'bg-warm-50 text-warm-700' : 'bg-cheer-50 text-cheer-700'
                  }`}
                >
                  {e.tag}
                </span>
              )}
              <IconArrowRight className="w-4 h-4 text-ink-300 shrink-0" />
            </button>
          ))}
        </div>

        {/* 轻量互动说明 */}
        <div className="rounded-2xl bg-white border border-ink-100 p-4">
          <div className="text-[14px] font-bold text-ink-900 mb-1.5">您这周只需要做一件事</div>
          <p className="text-[13px] text-ink-500 leading-relaxed">
            看完报告后，在「下一步学习计划建议」里选择<span className="text-parent-700 font-semibold">「接受」</span>
            或<span className="text-parent-700 font-semibold">「暂不调整」</span>。
            不需要额外操作，孩子的学习节奏会据此调整。
          </p>
        </div>

        <div className="rounded-2xl bg-cheer-50 border border-cheer-100 p-4 flex gap-2.5">
          <IconShield className="w-4 h-4 text-cheer-600 shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-cheer-700 leading-relaxed">
            报告只呈现孩子本人的学情结论，不含对话原文，也不与其他孩子做任何比较排名。
          </p>
        </div>
      </div>
    </div>
  )
}
