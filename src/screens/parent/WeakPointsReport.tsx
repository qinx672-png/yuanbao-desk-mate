import { weakPoints } from '@/data/mockData'
import { IconArrowRight, IconBook, IconCheck } from '@/components/common/Icons'
import type { ScreenId, FollowUp } from '@/types'
import { followUpOf, hasNextReview } from '@/lib/followUp'

interface Props {
  onOpen: (id: ScreenId) => void
  /** pointId → 当前复查状态。和家长端看到的必须是同一份 —— 否则家长和学生看到两条时间线 */
  followUps: Record<string, FollowUp>
}

const mastered = ['并联电路电流规律', '二次函数与一元二次方程', '因式分解法解方程', '电压表的正确使用']

export default function WeakPointsReport({ onOpen, followUps }: Props) {
  /* 学生端的复查进度，家长这边读的是同一份状态 */
  const list = weakPoints.map(w => ({ w, f: followUpOf(followUps, w) }))

  return (
    <div className="flex-1 min-h-0 scroll-area bg-ink-50 px-5 py-5 space-y-4">
      <div className="rounded-2xl bg-white border border-ink-100 p-4">
        <p className="text-[13.5px] text-ink-700 leading-relaxed">
          以下知识点是孩子近 30 天出错较多的地方。每一项都标注了对应的教材章节，您可以对照孩子的课本一起看。
        </p>
      </div>

      {list.map(({ w, f }) => (
        <div key={w.id} className="card p-5">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`chip text-[11px] ${
                w.subject === '物理' ? 'bg-parent-50 text-parent-600' : 'bg-cheer-50 text-cheer-700'
              }`}
            >
              {w.subject}
            </span>
            <span className="text-[16px] font-bold text-ink-900">{w.name}</span>
          </div>

          <div className="flex items-start gap-1.5 text-[12.5px] text-ink-500 mb-4">
            <IconBook className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{w.chapter}</span>
          </div>

          {/* 掌握进度 30% → 70% */}
          <div className="rounded-2xl bg-ink-50 p-4">
            <div className="flex items-baseline justify-between mb-2.5">
              <span className="text-[12.5px] text-ink-500">掌握进度</span>
              <span className="text-[13.5px] font-bold text-ink-900 tabular-nums">
                {w.from}% <span className="text-ink-300 mx-0.5">→</span>{' '}
                <span className="text-cheer-600">{w.to}%</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-ink-200 overflow-hidden relative">
              <div className="absolute inset-y-0 left-0 bg-ink-300 rounded-full" style={{ width: `${w.from}%` }} />
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-parent-500 to-cheer-500 rounded-full transition-all duration-1000"
                style={{ width: `${w.to}%` }}
              />
            </div>
            {/*
              这里原来写的是「本周针对性练习 N 次」——但 errorCount 存的是
              「近 30 天出错次数」（见 GrowthCenter / StudentHome 的同一字段）。
              一个数字在两个口径之间来回换，是数据里最不该有的东西：
              家长会照着「本周练了 4 次」去判断孩子这周用没用功。
              现在按它本来的含义写，也不替家长下「练了就有效」的结论。
            */}
            <div className="text-[12px] text-ink-400 mt-2.5">
              近 30 天在这个知识点上出错 {w.errorCount} 次 · 掌握度 {w.from}% → {w.to}%
            </div>
          </div>

          {w.traceBack && (
            <div className="mt-3 rounded-2xl bg-warm-50 border border-warm-100 p-4">
              <div className="text-[13.5px] font-bold text-warm-700 mb-1">检测到需要查漏补缺</div>
              <p className="text-[13px] text-warm-700/90 leading-relaxed">
                孩子在这个知识点上反复出错，系统判断根源在 {w.traceBack} 没有打牢。已安排先回到基础再往上学，
                这样比反复刷同类题更有效。
              </p>
            </div>
          )}

          {/*
            家长看完「哪里弱」，下一个问题一定是「那你们打算怎么办」。
            这一块回答它——也是题目背景里「持续跟进」四个字落到家长眼里的样子。
          */}
          {f && (
            <div className="mt-3 rounded-2xl bg-parent-50 border border-parent-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[13.5px] font-bold text-parent-700">
                  {/* 还排着下一次才是「接下来」，没有了就该有个交代，不能一直吊着家长 */}
                  {hasNextReview(f) ? '接下来怎么跟进' : '这个知识点已经巩固'}
                </span>
                <span className="chip bg-white text-parent-600 text-[11px] border border-parent-100 ml-auto shrink-0">
                  {f.status}
                </span>
              </div>
              <p className="text-[13px] text-parent-700/90 leading-relaxed">
                {f.nextTrigger}
                {/* 触发方式那句只对「还有下一次」的状态成立 */}
                {hasNextReview(f) &&
                  (f.mode === '场景触发'
                    ? ' —— 不额外占用孩子的时间，复习在他本来就要做的那道题里完成。'
                    : ' —— 没等到合适时机的题，系统会主动提醒，不需要您盯着。')}
              </p>
            </div>
          )}
        </div>
      ))}

      {/* 已掌握，避免只见问题 */}
      <div className="card p-5">
        <h3 className="text-[15.5px] font-bold text-ink-900 mb-3">这些孩子已经掌握了</h3>
        <div className="space-y-2.5">
          {mastered.map(m => (
            <div key={m} className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-cheer-500 text-white flex items-center justify-center shrink-0">
                <IconCheck className="w-3 h-3" />
              </span>
              <span className="text-[13.5px] text-ink-700">{m}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onOpen('par-trend')}
        className="w-full card p-4 flex items-center gap-3 active:bg-ink-50 transition"
      >
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[15px] font-bold text-ink-900">接着看：学习状态趋势</div>
          <div className="text-[12.5px] text-ink-400 mt-0.5">只看行为信号，不替孩子的心情下结论</div>
        </div>
        <IconArrowRight className="w-4 h-4 text-ink-300 shrink-0" />
      </button>
    </div>
  )
}
