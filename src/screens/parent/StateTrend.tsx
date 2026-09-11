import { weeklyReport, stateSignals, trendGuardrail } from '@/data/mockData'
import { IconChart, IconCheck, IconClose, IconSpark, IconShield } from '@/components/common/Icons'

/**
 * 屏 · 学习状态趋势（家长端）
 *
 * 对表《产品定位说明》3.5「学习状态信号」+「家长端呈现」：
 *   **只呈现信号与趋势，不呈现情绪结论。**
 *
 * ── 这一屏跟原来那版差在哪 ──────────────────────────────────
 * 旧版叫「学习兴趣与情绪评估」，里面直接写「本周学习状态：投入提升」，
 * 还配了「主动追问 6 次 · 愿意深入想问题」这种**带解读的**文案 ——
 * 等于替家长给孩子的心情下了结论。V2 3.5 已经改口径，代码没跟上。
 *
 * 现在每一条都是「**信号 + 依据**」：
 *   作答速度 → 本周整体加快 → 依据：同类电路题平均 38 秒 → 24 秒
 * 家长自己判断，我们不替他判断。
 *
 * ── 为什么要把「不呈现什么」写在页面上 ──────────────────────
 * 一份只列"我做了什么"的产品说明，是可以随便吹的；
 * **愿意把"我不做什么"印在页面上**，才是可信的边界。
 * 而且这一条正好回应家长最真实的担心：这玩意儿是不是在偷偷分析我孩子。
 */

export default function StateTrend() {
  return (
    <div className="flex-1 min-h-0 scroll-area bg-ink-50">
      {/* ── 头：把口径直接摆在最上面 ───────────────────────── */}
      <div className="bg-parent-800 px-5 pt-2.5 pb-8">
        <h1 className="text-white text-[19px] font-bold mb-1">学习状态趋势</h1>
        <p className="text-white/70 text-[12.5px] leading-relaxed">
          这一页只说看得见的行为，不猜孩子的心情。
        </p>
      </div>

      <div className="px-5 -mt-5 pb-6 space-y-4">
        {/* ── 本周一句话：趋势 + 依据，不给结论词 ──────────── */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <IconChart className="w-4 h-4 text-parent-600" />
            <span className="text-[12px] text-ink-400">{weeklyReport.weekLabel}</span>
          </div>
          <div className="text-[17px] font-bold text-parent-700 leading-snug mb-1.5">
            {weeklyReport.trendHeadline}
          </div>
          <p className="text-[12.5px] text-ink-500 leading-relaxed">{weeklyReport.trendBasis}</p>
        </div>

        {/* ── 五条信号：每条都给依据 ───────────────────────── */}
        <div className="card p-4">
          <h2 className="text-[14.5px] font-bold text-ink-900 mb-3">本周看到的行为信号</h2>
          <div className="space-y-2.5">
            {stateSignals.map(s => (
              <div key={s.label} className="rounded-xl bg-ink-50 px-3 py-2.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-[13px] font-semibold text-ink-800 shrink-0">{s.label}</span>
                  <span className="text-[13px] text-parent-700 font-semibold">{s.value}</span>
                </div>
                <p className="text-[11.5px] text-ink-400 leading-relaxed mt-1">依据：{s.basis}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 边界：明写「不呈现什么」────────────────────── */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <IconShield className="w-4 h-4 text-cheer-600" />
            <h2 className="text-[14.5px] font-bold text-ink-900">这一页的呈现口径</h2>
          </div>

          <div className="mb-3">
            <div className="text-[12px] font-semibold text-cheer-700 mb-1.5">呈现</div>
            <div className="flex flex-wrap gap-1.5">
              {trendGuardrail.do.map(d => (
                <span key={d} className="chip bg-cheer-50 text-cheer-700 border border-cheer-100">
                  <IconCheck className="w-3 h-3" />
                  {d}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[12px] font-semibold text-warm-700 mb-1.5">不呈现</div>
            <div className="space-y-1.5">
              {trendGuardrail.dont.map(d => (
                <div key={d} className="flex items-center gap-2 text-[12.5px] text-warm-700">
                  <IconClose className="w-3.5 h-3.5 shrink-0" />
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── 家长能做什么：给动作，不给评价 ───────────────── */}
        <div className="rounded-2xl bg-brand-50 border border-brand-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <IconSpark className="w-4 h-4 text-brand-600" />
            <h2 className="text-[13.5px] font-bold text-brand-700">你可以做的</h2>
          </div>
          <p className="text-[12.5px] text-brand-700/90 leading-relaxed">
            说具体事实，不说评价。
            比如「你昨天那道电路题自己想出来了」，而不是「你终于认真了」。
            评价性的话会把学习变成向家长交差，具体的事实才会让他觉得被看见了。
          </p>
        </div>
      </div>
    </div>
  )
}
