import { student, weeklyReport } from '@/data/mockData'
import {
  IconChart,
  IconBook,
  IconClock,
  IconSpark,
  IconArrowRight,
  IconShield,
  IconCheck,
} from '@/components/common/Icons'
import type { ScreenId } from '@/types'

interface Props {
  onOpen: (id: ScreenId) => void
  planDecided: '接受' | '暂不调整' | null
  /**
   * 最近一次辅导里，孩子抓到并纠正的 AI 讲解错误数。
   *
   * ⚠️ **没有就传 0，不要为了演示效果给个假数**。
   * 这是从辅导过程算出来的真实值（TutorFlow 的 challengedAt ∩ node.error），
   * 家长端写死一个「1」，就是 mockData 里 exitSummary.gained 犯过的同一个错：
   * 把假设当事实。
   */
  caught: number
}

export default function ParentHome({ onOpen, planDecided, caught }: Props) {
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

        {/*
          ── 主动上报：孩子抓到过 AI 讲错 ────────────────────────────
          2026-09-14 加，依据见《容错机制调研与竞品分析》§5.5「回告」那一格。

          行业现状是**零家**做到「出错之后回告受影响的学生/家长」：
          Khanmigo 只有一个 👎 按钮，国内八款连入口都只是「举报违法内容」。
          这家厂商统一做到了免责，没有一家做到纠错 —— 缺口就在这一格。

          两条设计约束，都不是我拍脑袋定的：

          ① **主管者是孩子，不是 AI。** 措辞刻意从孩子的动作起头
             （「孩子指出同桌讲错」），不从 AI 的失败起头。这是学情结论，
             不是产品道歉 —— 家长端是来看孩子的。

          ② **不越 ParentHome 底部那条口径红线**（本文件末尾那句
             「报告只呈现孩子本人的学情结论，不含对话原文」）。
             所以这里只说「有 1 处被纠正」，绝不放 quote、放原句、放截图。

          没有发生就不显示（caught === 0）——不给演示凑数。
        */}
        {caught > 0 && (
          <div className="rounded-2xl bg-cheer-50 border border-cheer-100 p-4 flex gap-2.5">
            <IconCheck className="w-4 h-4 text-cheer-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              {/* 标题的主语必须是孩子。原来写的是「孩子指出同桌讲错 N 处」——
                  「同桌讲错」四个字把这条学情变成了一句产品道歉，主体从孩子滑到了 AI */}
              <div className="text-[13.5px] font-bold text-cheer-700">
                主动核对，发现 {caught} 处讲解问题
              </div>
              {/*
                ⚠️ 这张卡的措辞前后错了两次，两次的教训都留在这儿。

                ── 错法一：主语空悬（同一版内自己修的）────────────────
                写的是「同桌不保证不出错，但出错会被发现、会被改掉」。
                读起来像「产品会检测错误」。但本产品 AI 侧**没有任何检测**，
                唯一触发是学生自己点「我觉得讲错了」。把条件句写成了承诺句。

                ── 错法二：层级错配（2026-09-14 秦肖指出）──────────
                我改成了「…但被指出来的每一处，都会核对、更正，并留下记录」——
                句子本身没撒谎，但**它根本不该出现在这儿**。

                ParentHome 是**信任建立层**，不是**法务保障层**。
                家长首页写「不保证不出错」，等于餐厅在菜单上写「菜可能不新鲜」。
                容错是安全保证，不是卖点 —— 见下面这条更要命的来路：
                我是照着自己写的调研 §5.5「行业缺口是回告」去做的，
                但把「**产品应该有这个机制**」偷换成了
                「**家长首页应该宣传这个机制**」。机制该有，这话不该在这儿说。

                ── 行业实际做法（修正后的论据反而更支持这个判断）──────
                Khanmigo 的支持文档明写 "It can make factual and mathematical
                errors"，Duolingo 官网有 "What if the AI makes a mistake?" 条目 ——
                所以「没人承认会出错」是不准的。但 khanmigo.ai 营销页约 11,000 字里
                mistake / error / accuracy / hallucination **各出现 0 次**。
                **行业是分层的：协议里说，支持文档里说，营销页一个字不提。**
                这张卡要待的地方是学情层，那就只讲学情。

                ── 现在的写法：主体是孩子，一个免责词都不留 ──────────
                「讲解问题」是中性词，不替 AI 辩解也不替它遮掩；
                事实（同桌那处讲法不准确）没有瞒，但落点是**孩子的动作**。
                家长买的是孩子的验证习惯，不是 AI 的可靠性报告。
              */}
              <p className="text-[12.5px] text-cheer-700/85 leading-relaxed mt-1">
                同桌当场的讲法有一处不准确，孩子自己发现并提了出来，核对教材后已更正。
                这一处已记入易错点案例。
              </p>
            </div>
          </div>
        )}

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
