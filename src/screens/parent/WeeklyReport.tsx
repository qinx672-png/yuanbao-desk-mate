import { weeklyReport, weakPoints } from '@/data/mockData'
import { IconCheck, IconArrowRight } from '@/components/common/Icons'
import type { ScreenId } from '@/types'

interface Props {
  onOpen: (id: ScreenId) => void
}

const days = ['一', '二', '三', '四', '五', '六', '日']
const dayMinutes = [32, 0, 45, 28, 15, 55, 25]

export default function WeeklyReport({ onOpen }: Props) {
  const maxM = Math.max(...dayMinutes)

  return (
    <div className="flex-1 min-h-0 scroll-area bg-ink-50 px-5 py-5 space-y-4">
      <div className="card p-5">
        <div className="text-[12px] font-bold text-ink-400 mb-3.5 tracking-wide">
          {weeklyReport.weekLabel}
        </div>
        <div className="grid grid-cols-2 gap-y-4">
          {[
            ['学习时长', `${Math.floor(weeklyReport.minutes / 60)} 小时 ${weeklyReport.minutes % 60} 分`],
            ['题目数量', `${weeklyReport.problemCount} 道`],
            ['知识点覆盖', `${weeklyReport.knowledgeCount} 个`],
            ['学习天数', `${weeklyReport.activeDays} 天`],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="text-[12px] text-ink-400 mb-1">{k}</div>
              <div className="text-[17px] font-bold text-ink-900">{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 每日时长分布 */}
      <div className="card p-5">
        <h3 className="text-[15.5px] font-bold text-ink-900 mb-1">每天的学习时长</h3>
        <p className="text-[12.5px] text-ink-400 mb-4">周二孩子有月考，当天没有安排学习</p>
        <div className="flex items-end justify-between gap-2 h-[110px]">
          {dayMinutes.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10.5px] text-ink-400 tabular-nums">{m || '—'}</span>
              <div
                className={`w-full rounded-lg transition-all duration-700 ${
                  m === 0 ? 'bg-ink-100' : 'bg-gradient-to-t from-parent-500 to-parent-500/60'
                }`}
                style={{ height: `${Math.max((m / maxM) * 100, 4)}%` }}
              />
              <span className="text-[11.5px] text-ink-500">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 本周亮点 */}
      <div className="card p-5">
        <h3 className="text-[15.5px] font-bold text-ink-900 mb-3">本周孩子做到了</h3>
        <ul className="space-y-3">
          {weeklyReport.highlights.map(h => (
            <li key={h} className="flex gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cheer-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                <IconCheck className="w-3 h-3" />
              </span>
              <span className="text-[13.5px] text-ink-700 leading-relaxed">{h}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 知识点覆盖 */}
      <div className="card p-5">
        <h3 className="text-[15.5px] font-bold text-ink-900 mb-3">本周涉及的知识点</h3>
        <div className="flex flex-wrap gap-2">
          {[
            ...weakPoints.map(w => w.name),
            '并联电路电流规律',
            '二次函数与一元二次方程',
            '电压表的正确使用',
            '因式分解法解方程',
          ].map(n => (
            <span key={n} className="chip bg-ink-100 text-ink-700 text-[12.5px]">
              {n}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => onOpen('par-weak')}
        className="w-full card p-4 flex items-center gap-3 active:bg-ink-50 transition"
      >
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[15px] font-bold text-ink-900">接着看：薄弱知识点分析</div>
          <div className="text-[12.5px] text-ink-400 mt-0.5">哪些地方还需要多花点时间</div>
        </div>
        <IconArrowRight className="w-4 h-4 text-ink-300 shrink-0" />
      </button>
    </div>
  )
}
