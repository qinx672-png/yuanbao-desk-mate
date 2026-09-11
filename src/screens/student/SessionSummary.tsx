import { sessionRecord, weakPoints } from '@/data/mockData'
import { IconCheck, IconHeart, IconChart, IconBook } from '@/components/common/Icons'

interface Props {
  mastered: boolean
  onGrowth: () => void
  onHome: () => void
}

export default function SessionSummary({ mastered, onGrowth, onHome }: Props) {
  const wp = weakPoints[0]
  const finalText = mastered ? '已掌握' : '需二次巩固'

  return (
    <div className="flex-1 min-h-0 scroll-area bg-ink-50">
      {/* 头部 */}
      <div
        className={`px-5 pt-6 pb-8 text-white ${
          mastered ? 'bg-gradient-to-b from-cheer-500 to-cheer-600' : 'bg-gradient-to-b from-warm-500 to-warm-600'
        }`}
      >
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
          {mastered ? <IconCheck className="w-8 h-8" /> : <IconHeart className="w-7 h-7" />}
        </div>
        <h1 className="text-[23px] font-bold leading-snug">
          {mastered ? '这道题你自己想明白了' : '今天先到这，明天我们再来一遍'}
        </h1>
        <p className="text-white/85 text-[14px] leading-relaxed mt-2">
          {mastered
            ? '从「不记得串联电路特点」到「能独立说出判断思路」，只用了 15 分钟。'
            : '这个知识点值得再花点时间，我已经安排好明天的简单版本了，不着急。'}
        </p>
      </div>

      <div className="px-5 -mt-4 pb-6 space-y-4">
        {/* 本次学习数据 */}
        <div className="card p-5">
          <div className="text-[12px] font-bold text-ink-400 mb-3.5 tracking-wide">本次学习记录</div>
          <div className="space-y-3">
            {[
              ['知识点', sessionRecord.knowledgePoint],
              ['初始掌握情况', sessionRecord.initialMastery],
              ['引导轮次', `${sessionRecord.guideRounds} 轮`],
              ['最终掌握情况', finalText],
              ['学习时长', `${sessionRecord.minutes} 分钟`],
              ['学习状态', sessionRecord.signals.map(s => `${s.label}：${s.value}`).join(' / ')],
            ].map(([k, v], i) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-[13.5px] text-ink-500">{k}</span>
                <span
                  className={`text-[14.5px] font-bold ${
                    i === 3 ? (mastered ? 'text-cheer-600' : 'text-warm-600') : 'text-ink-900'
                  }`}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 学生画像更新 */}
        <div className="card p-5">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-ink-400 mb-3.5 tracking-wide">
            <IconChart className="w-3.5 h-3.5" />
            你的成长档案已更新
          </div>

          <div className="rounded-2xl bg-ink-50 p-4 mb-3">
            <div className="text-[14px] font-bold text-ink-900 mb-1">{wp.name}</div>
            <div className="text-[11.5px] text-ink-400 mb-3">📚 {wp.chapter}</div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-ink-400 tabular-nums">{wp.from}%</span>
              <div className="flex-1 h-2.5 rounded-full bg-ink-200 overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 bg-ink-300 rounded-full" style={{ width: `${wp.from}%` }} />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-400 to-cheer-500 rounded-full transition-all duration-1000"
                  style={{ width: `${mastered ? wp.to : wp.from + 12}%` }}
                />
              </div>
              <span className="text-[14px] font-bold text-cheer-600 tabular-nums">
                {mastered ? wp.to : wp.from + 12}%
              </span>
            </div>
          </div>

          <ul className="space-y-2">
            {[
              '这道错题已记入你的错题本，标注了错误原因',
              mastered ? '学习兴趣指数 +3，本周你已主动学习 3 次' : '明天会推送一道更简单的同类题带你重走一遍',
              '30 天进步曲线已更新',
            ].map(t => (
              <li key={t} className="flex gap-2 text-[13px] text-ink-700 leading-relaxed">
                <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* 知识点回顾卡 */}
        <div className="rounded-2xl bg-brand-50 border border-brand-100 p-4">
          <div className="flex items-center gap-1.5 text-brand-700 font-bold text-[13.5px] mb-2">
            <IconBook className="w-4 h-4" />
            这次要记住的
          </div>
          <p className="text-[13.5px] text-brand-700/90 leading-relaxed">
            串联电路只有一条电流路径，电流处处相等；断路时，电压表测到电源电压的那个元件，就是断掉的元件。
          </p>
          <div className="text-[11.5px] text-brand-700/70 mt-2">📚 {wp.chapter}</div>
        </div>

        <div className="space-y-3 pt-1">
          <button className="btn-primary py-3.5 text-[16px]" onClick={onGrowth}>
            看看我的成长
          </button>
          <button className="btn-ghost py-3.5 text-[16px] border-ink-200 text-ink-700" onClick={onHome}>
            回到首页
          </button>
        </div>

        <p className="text-center text-[11.5px] text-ink-400 leading-relaxed">
          本次记录会汇总进每周家长报告，你的对话原文不会展示给家长
        </p>
      </div>
    </div>
  )
}
