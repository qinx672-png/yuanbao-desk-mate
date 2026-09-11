import { weeklyReport, student } from '@/data/mockData'
import { IconHeart, IconArrowRight, IconShield } from '@/components/common/Icons'
import type { ScreenId } from '@/types'

interface Props {
  onOpen: (id: ScreenId) => void
}

const states = [
  { key: '投入提升', desc: '主动打开学习次数增加' },
  { key: '节奏稳定', desc: '完成时长与复习频率稳定' },
  { key: '需要放慢', desc: '连续卡点时降低难度' },
]

const signals = [
  { label: '主动追问次数', value: '6 次', note: '愿意深入想问题' },
  { label: '说「我会了 / 明白了」', value: '9 次', note: '真正理解的信号' },
  { label: '主动打开学习', value: '3 次', note: '不是被催着学' },
  { label: '暂停学习', value: '0 次', note: '没有出现频繁退出' },
]

export default function EmotionReport({ onOpen }: Props) {
  return (
    <div className="flex-1 min-h-0 scroll-area bg-ink-50 px-5 py-5 space-y-4">
      {/* 学习状态结论 */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-cheer-50 text-cheer-600 flex items-center justify-center shrink-0">
            <IconHeart className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[12.5px] text-ink-400">本周学习状态</div>
            <div className="text-[20px] font-bold text-cheer-600">{weeklyReport.trendHeadline}</div>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {states.map((s, i) => (
            <div
              key={s.key}
              className={`flex-1 rounded-xl px-2 py-2.5 text-center transition ${
                i === 0 ? 'bg-cheer-500 text-white' : 'bg-ink-50 text-ink-400'
              }`}
            >
              <div className="text-[13.5px] font-bold">{s.key}</div>
              <div className="text-[10.5px] mt-1 leading-tight opacity-80">{s.desc}</div>
            </div>
          ))}
        </div>

        <p className="text-[13.5px] text-ink-700 leading-relaxed">{weeklyReport.trendBasis}</p>
      </div>

      {/* 学习兴趣指数 */}
      <div className="card p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-[15.5px] font-bold text-ink-900">学习兴趣指数</h3>
          <span className="text-[20px] font-bold text-parent-700 tabular-nums">{weeklyReport.interestIndex}</span>
        </div>
        <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-parent-500 to-cheer-500 transition-all duration-1000"
            style={{ width: `${weeklyReport.interestIndex}%` }}
          />
        </div>
        <p className="text-[12.5px] text-ink-400">
          较上周提升 6 分。该指数只反映孩子自己的变化趋势，不与其他孩子比较。
        </p>
      </div>

      {/* 判断依据 */}
      <div className="card p-5">
        <h3 className="text-[15.5px] font-bold text-ink-900 mb-1">我们是这样判断的</h3>
        <p className="text-[12.5px] text-ink-400 mb-4">来自本周对话中可量化的行为信号</p>
        <div className="grid grid-cols-2 gap-3">
          {signals.map(s => (
            <div key={s.label} className="rounded-2xl bg-ink-50 p-3.5">
              <div className="text-[17px] font-bold text-ink-900 tabular-nums">{s.value}</div>
              <div className="text-[12.5px] font-medium text-ink-700 mt-0.5">{s.label}</div>
              <div className="text-[11.5px] text-ink-400 mt-1 leading-snug">{s.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 陪伴建议 */}
      <div className="card p-5">
        <h3 className="text-[15.5px] font-bold text-ink-900 mb-3">给您的两个小建议</h3>
        <ul className="space-y-3">
          {[
            `${student.name}这周自己纠正了一道电路题的判断错误，可以当面肯定一下这件事，比夸「成绩好」更有用。`,
            '周六学习了 55 分钟，是本周最长的一次。如果孩子表示累了，允许他停下来，不必追进度。',
          ].map(t => (
            <li key={t} className="flex gap-2.5">
              <span className="mt-[8px] w-1.5 h-1.5 rounded-full bg-parent-500 shrink-0" />
              <span className="text-[13.5px] text-ink-700 leading-relaxed">{t}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl bg-cheer-50 border border-cheer-100 p-4 flex gap-2.5">
        <IconShield className="w-4 h-4 text-cheer-600 shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-cheer-700 leading-relaxed">
          我们只向您展示情绪结论与行为依据，不展示孩子与 AI 的对话原文 —— 孩子需要一个能放心说「我不会」的地方。
        </p>
      </div>

      <button
        onClick={() => onOpen('par-plan')}
        className="w-full card p-4 flex items-center gap-3 active:bg-ink-50 transition"
      >
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[15px] font-bold text-ink-900">最后一步：确认学习计划</div>
          <div className="text-[12.5px] text-ink-400 mt-0.5">点一下就好，约 30 秒</div>
        </div>
        <IconArrowRight className="w-4 h-4 text-ink-300 shrink-0" />
      </button>
    </div>
  )
}
