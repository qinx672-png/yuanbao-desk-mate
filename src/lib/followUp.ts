/**
 * 薄弱点复查状态机
 * ============================================================
 *
 * ── 为什么要单独抽成一个文件 ──────────────────────────────
 *
 * 复查这条链路横跨 3 个屏：
 *   StudentHome（触发）→ TutorFlow（执行）→ GrowthCenter / WeakPointsReport（显示）
 *
 * 规则写在任何一个屏幕里，另外两个屏就只能靠复制粘贴，迟早对不上。
 * 抽成纯函数还有两个好处：
 *   1. 不依赖 React，能在 Node 里单独跑，看「输入什么 → 输出什么」
 *      （见 scripts/check-followUp.mjs）
 *   2. 规则本身就是代码，改规则不用翻文档、也不会和文档对不上
 *
 * ── 规则从哪来 ────────────────────────────────────────────
 *
 * 《核心流程说明》节点 6 明确写了三件事：
 *   · 状态机：待复查 → 复查中 → 已巩固
 *   · 连续两轮复查通过即移出重点（闭环必须有出口，否则清单只增不减）
 *   · 复查间隔递增：3 → 7 → 21 天
 *
 * 但文档没写两件事，都是 2026-09-13 秦肖拍板的：
 *
 *   A 档 · 未通过怎么办：退回「待复查」、轮次归 0、间隔重置 3 天，并且先重讲一遍。
 *     理由：复查的目的是「确认真的会了」，不是「考学生」。
 *     没会就该回到教学，原地再考一遍只会让学生挫败，也拿不到新信息。
 *
 *   甲档 · 已巩固之后呢：加一个终态「已移出」。
 *     理由：k3 的原话是「移出重点；期中前再抽查一次」——抽查是**一次**，不是循环。
 *     第一版实现成了每 21 天无限抽查，和「移出重点」四个字直接矛盾，
 *     也会让薄弱点清单永远清不空（正是当初设「出口」要避免的事）。
 */

import type { FollowUp } from '@/types'

/** 一次复查的结果。原型里只有这两种，不设「部分掌握」这种模糊档 */
export type ReviewOutcome = '通过' | '未通过'

/**
 * 各状态对应的「下次复查间隔」（天）。
 *
 * 对应《核心流程说明》「复查间隔递增：3 → 7 → 21 天」——
 * 三个数字正好对应三个还要排期的状态，不是随便配的：
 *   待复查（还没查过）→ 3 天后
 *   复查中（查过一次）→ 再 7 天后
 *   已巩固（连过两轮）→ 移出重点，21 天后做最后一次抽查
 *
 * 注意这里的 `Exclude<..., '已移出'>`：已移出是终点，**没有下一次**。
 * 用 Exclude 而不是给「已移出」随便配个 0，是为了让「它不排期」这件事
 * 由类型系统保证，而不是靠注释提醒。
 */
export const REVIEW_INTERVAL_DAYS: Record<Exclude<FollowUp['status'], '已移出'>, number> = {
  待复查: 3,
  复查中: 7,
  已巩固: 21,
}

/** 复查轮次上限：连过两轮（0→1→2）+ 最后一次抽查（2→3） */
export const MAX_ROUND = 3

/**
 * 「通过」时的下一站。
 *
 * 写成一张表而不是 if-else 串，是为了让 TypeScript 帮我们查漏：
 * 以后再加状态，这张表少写一个键就会直接报错。
 */
const NEXT_ON_PASS: Record<FollowUp['status'], FollowUp['status']> = {
  待复查: '复查中',
  复查中: '已巩固',
  已巩固: '已移出',
  已移出: '已移出', // 已经归档了，再查通过也还是归档
}

/**
 * 推进一次复查 —— 这是整个状态机唯一的入口。
 *
 * 纯函数：不修改传入的 f，返回一个新对象。
 * （React 靠对象引用变化判断要不要重新渲染，所以不能原地改。）
 */
export function advance(f: FollowUp, outcome: ReviewOutcome): FollowUp {
  /*
   * ── 已移出是终点，吸收一切输入 ──────────────────────────────
   *
   * 它已经不排复查了，也就没有「这次复查通过没通过」这回事 ——
   * 这个输入在真实流程里根本产生不出来。
   *
   * 但第一版没写这一句，于是「未通过」能把一个已经归档的薄弱点
   * 一把拽回「待复查」：**终点态不是终点，闭环就白设计了**。
   * 靠「反正走不到」来保证正确性，等于没有保证 ——
   * 演示按钮立刻就按到了。
   *
   * 所以这里显式吸收：进了终点就出不来，要重开只能走
   * 「重新识别出这个薄弱点」那条路（在新的一轮里它是个新对象）。
   */
  if (f.status === '已移出') return f

  /* ── 没通过：不管现在是第几轮，一律回到起点，并且先重讲 ── */
  if (outcome === '未通过') {
    return {
      status: '待复查',
      round: 0,
      mode: '场景触发',
      needsReteach: true,
      nextTrigger: '这次没通过 —— 先把这个知识点重讲一遍，再排 3 天后的复查',
    }
  }

  /* ── 通过：往上走一级 ── */
  const status = NEXT_ON_PASS[f.status]

  return {
    status,
    round: Math.min(f.round + 1, MAX_ROUND),
    /* 新的一轮重新开始，触发方式回到「场景优先」——
       上一次可能是等不到场景才走了时间兜底，这一轮不该继承那个状态 */
    mode: '场景触发',
    needsReteach: false,
    nextTrigger: TRIGGER_TEXT[status],
  }
}

/**
 * 今天要不要顺手给它插一道复查题？（学生做到同类题时）
 *
 * 只有 待复查 / 复查中 才插。
 * 已巩固**不插** —— 它已经移出重点了，它的下一次是 21 天后的**定时抽查**，
 * 靠时间提醒，不是「下次做到这类题时顺手带一道」。
 * 混进日常做题流程，等于刚说「移出重点」转头又拿题考他。
 *
 * ⚠️ 界面里判断「要不要插复查题」必须调这个函数，
 * **不要写 `status !== '已巩固'` 这种字面量比较**——
 * 加「已移出」的时候就踩过这个坑：加新状态编译器不报错，
 * 已移出的薄弱点会继续被插复查题。规则集中在函数里，界面就不会各写各的。
 */
export function isUnderReview(f: FollowUp): boolean {
  return f.status === '待复查' || f.status === '复查中'
}

/**
 * 它还排着下一次复查吗？
 *
 * ⚠️ 这和 isUnderReview() 是**两个不同的问题**，别混用：
 *   · isUnderReview —— 「今天顺手插一道」：待复查 / 复查中
 *   · hasNextReview —— 「还排着下一次」：除已移出以外都算
 *
 * 界面问「下次怎么复查」还是「复查已完成」，用的是这个。
 * 第一版两个概念混成了一个，结果是「已巩固」在页面上既不插题、
 * 又说自己还有下一次 —— 同一件事在两处口径不一致。
 */
export function hasNextReview(f: FollowUp): boolean {
  return f.status !== '已移出'
}

/**
 * 取某个薄弱点**当前**的复查状态。
 *
 * 界面拿到的 weakPoints 来自 mockData，那是种子数据（初始值）；
 * 运行时的最新状态在 App 那一层。这个函数负责把两者接起来，
 * 免得三个屏各写一遍 `?? w.followUp`。
 */
export function followUpOf(
  current: Record<string, FollowUp>,
  w: { pointId: string; followUp?: FollowUp },
): FollowUp | undefined {
  return current[w.pointId] ?? w.followUp
}

/**
 * 把种子数据摊平成 `pointId → 复查状态` 的表，作为运行时状态的初始值。
 *
 * 注意返回的是**浅拷贝**：表是新对象，但每个 FollowUp 还是 mockData 里那个。
 * 这不影响正确性 —— advance() 是纯函数，永远返回新对象，不会原地改。
 */
export function seedFollowUps(points: { pointId: string; followUp?: FollowUp }[]): Record<string, FollowUp> {
  const map: Record<string, FollowUp> = {}
  for (const p of points) {
    if (p.followUp) map[p.pointId] = p.followUp
  }
  return map
}

/**
 * 各状态下「下一次复查」的说明文字（给学生/家长看的大白话）。
 *
 * ⚠️ 这里是通用文案。原来 mockData 里那几句是手写的、带了具体学科
 * （比如「下次遇到电路题时」）—— 通用文案做不到这一点。
 * 真做上线时应该用知识点库里的学科/题型字段拼出来，不是手写。
 */
const TRIGGER_TEXT: Record<FollowUp['status'], string> = {
  待复查: '下次遇到这个知识点的题时，先插 1 道复查题',
  复查中: '7 天内没再遇到这个知识点的题，改由时间提醒复查',
  已巩固: '已连续两轮通过，移出重点；21 天后做最后一次抽查',
  已移出: '已经彻底巩固，不再自动排复查',
}

/**
 * 取「下一次复查间隔」。
 * 已经移出的返回 null —— 调用方必须显式处理「没有下一次」，
 * 而不是拿到一个 0 或者 21 去显示。
 */
export function intervalDaysOf(f: FollowUp): number | null {
  if (f.status === '已移出') return null
  return REVIEW_INTERVAL_DAYS[f.status]
}
