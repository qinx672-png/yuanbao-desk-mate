import { sessionRecord, weakPoints, exitSummary } from '@/data/mockData'
import { IconCheck, IconHeart, IconChart, IconBook, IconClock } from '@/components/common/Icons'
import type { TutorSnapshot } from '@/types'

/**
 * 屏06 · 本次小结
 *
 * ── 这个屏原来有三处在说假话（2026-09-13 全流程走查查出来的）────────
 * ① **体面退出被当成扣分**。finalText 只有 mastered 一个输入，
 *    学生选了「今天先放一放」，结算页第一行就写「需二次巩固」，
 *    标题还写「明天我们再来一遍」。
 *    可「可以先停，不会算作失败」是这个产品写在退出弹窗上、写进
 *    exitSummary.forbidden 里的承诺 —— 结算页自己把它推翻了。
 *    现在三分支：走完了 / 主动停下 / 没走通。
 *
 * ② **「这道错题已记入你的错题本」** —— 全项目没有「错题本」这个屏，
 *    点不动、也去不了。改成指向真的存在的成长档案，并且**能点**。
 *
 * ③ **数不对**。「15 分钟」「3 轮」以前读的是 mockData 里的固定值：
 *    学生聊了 40 秒就退出，结算页照样写 15 分钟、5 轮。
 *    现在这两个数由 TutorFlow 实测后传进来（seconds / turns）。
 */

interface Props {
  mastered: boolean
  /** 学生是主动停下的（保存进度 / 今天先放一放），不是走完的 */
  exited: boolean
  /** 停下时的断点。有值才能在标题里说出「下次从哪一步接着来」 */
  snapshot: TutorSnapshot | null
  /** 这一场真实的秒数 / 学生真实答了几轮 / 真实走过哪几步 */
  seconds: number
  turns: number
  visited: string[]
  onGrowth: () => void
  onHome: () => void
}

/** 秒 → 「40 秒」/「12 分钟」。不足 1 分钟就说秒，别四舍五入成 0 分钟 */
function humanTime(sec: number) {
  if (sec < 60) return `${sec} 秒`
  const m = Math.round(sec / 60)
  return `${m} 分钟`
}

export default function SessionSummary({
  mastered,
  exited,
  snapshot,
  seconds,
  turns,
  visited,
  onGrowth,
  onHome,
}: Props) {
  const wp = weakPoints[0]

  /*
   * 三种收场，三套话术。注意 `exited` 优先于 `mastered` ——
   * 主动退出永远走「你说了算」那条，不会被判成没掌握。
   * （这两个值理论上不会同时为真，但判定顺序写死在这儿，别让它靠巧合成立。）
   */
  const kind: 'done' | 'stopped' | 'retry' = exited ? 'stopped' : mastered ? 'done' : 'retry'

  const stopTitle = snapshot?.title ?? '上次停下的那一步'

  const skin = {
    done: {
      grad: 'from-cheer-500 to-cheer-600',
      icon: <IconCheck className="w-8 h-8" />,
      h1: '这道题你自己想明白了',
      p: `从「不记得串联电路特点」到「能独立说出判断思路」，只用了 ${humanTime(seconds)}。`,
      final: '已掌握',
    },
    stopped: {
      grad: 'from-brand-500 to-brand-600',
      icon: <IconHeart className="w-7 h-7" />,
      h1: '今天先到这，你说了算',
      /*
       * 这句现在是真的：断点真的存在 App 里，首页真的会拿它开场。
       * 以前这句是空头支票 —— 学生端根本没存过任何东西。
       */
      p: `你停下的地方我记着了。下次打开，直接从「${stopTitle}」接着问你，前面讲过的不用再听一遍。`,
      final: '本次不判定',
    },
    retry: {
      grad: 'from-warm-500 to-warm-600',
      icon: <IconHeart className="w-7 h-7" />,
      h1: '这个知识点，我们换个讲法再来',
      /*
       * 原来这句是「我已经安排好明天的简单版本了，不着急」——
       * 没有任何东西会去排那个「简单版本」，是编的。删掉承诺，只留事实。
       */
      p: '刚才那条路没走通，不说明你不行，只说明那个讲法不适合你。下次换一条路走。',
      final: '需换讲法',
    },
  }[kind]

  /* 行也要跟着收场变：主动停下时不能出现「最终掌握情况」这种判定 */
  const rows: [string, string][] = [
    ['知识点', sessionRecord.knowledgePoint],
    ['初始掌握情况', sessionRecord.initialMastery],
    ['引导轮次', `${turns} 轮`],
    ['学习时长', humanTime(seconds)],
    ...(kind === 'stopped'
      ? ([['停下时在', stopTitle]] as [string, string][])
      : ([['最终掌握情况', skin.final]] as [string, string][])),
    ['学习状态', sessionRecord.signals.map(s => `${s.label}：${s.value}`).join(' / ')],
  ]

  /* 要突出的是倒数第二行（判定行）—— 学习状态永远压在最后 */
  const judgeRow = rows.length - 2
  const judgeTone =
    kind === 'done' ? 'text-cheer-600' : kind === 'retry' ? 'text-warm-600' : 'text-brand-600'

  return (
    <div className="flex-1 min-h-0 scroll-area bg-ink-50">
      {/* 头部 */}
      <div className={`px-5 pt-6 pb-8 text-white bg-gradient-to-b ${skin.grad}`}>
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
          {skin.icon}
        </div>
        <h1 className="text-[23px] font-bold leading-snug">{skin.h1}</h1>
        <p className="text-white/85 text-[14px] leading-relaxed mt-2">{skin.p}</p>
      </div>

      <div className="px-5 -mt-4 pb-6 space-y-4">
        {/* 本次学习数据 */}
        <div className="card p-5">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-ink-400 mb-3.5 tracking-wide">
            <IconClock className="w-3.5 h-3.5" />
            本次学习记录
          </div>
          <div className="space-y-3">
            {rows.map(([k, v], i) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <span className="text-[13.5px] text-ink-500 shrink-0">{k}</span>
                <span
                  className={`text-[14.5px] font-bold text-right ${
                    i === judgeRow ? judgeTone : 'text-ink-900'
                  }`}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/*
          主动停下时，列他**真的走过**的步骤。
          ⚠️ 这里原来是 mockData 里写死的两条断言（「弄清了电压为 0 代表元件正常」
          「知道断路点会被电压表测到电源电压」）。学生第一步就退出，
          结算页照样夸他弄明白了这两件事 —— 又是一次把假设当事实。
          现在一步没走就是空数组，整块不渲染。
        */}
        {kind === 'stopped' && visited.length > 0 && (
          <div className="card p-5">
            <div className="text-[12px] font-bold text-ink-400 mb-3.5 tracking-wide">
              这趟你走过了
            </div>
            <ul className="space-y-2">
              {visited.slice(0, 6).map(t => (
                <li key={t} className="flex gap-2 text-[13.5px] text-ink-700 leading-relaxed">
                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-cheer-400 shrink-0" />
                  {t}
                </li>
              ))}
              {/* 走的路多就截断 + 如实说还剩几条，不做「省略号一挂就当列全了」 */}
              {visited.length > 6 && (
                <li className="text-[12.5px] text-ink-400 pl-3.5">
                  还有 {visited.length - 6} 步没列出来
                </li>
              )}
            </ul>
            <p className="text-[12px] text-ink-400 leading-relaxed mt-3 pt-3 border-t border-dashed border-ink-200">
              {exitSummary.next}
            </p>
          </div>
        )}

        {/* 学生画像更新 */}
        <div className="card p-5">
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-1.5 text-[12px] font-bold text-ink-400 tracking-wide">
              <IconChart className="w-3.5 h-3.5" />
              {kind === 'stopped' ? '这次还没写进成长档案' : '你的成长档案已更新'}
            </div>
            {/* 标题上说「已更新」，就得真的能点进去看。点不动的话它只是一句装饰 */}
            <button
              onClick={onGrowth}
              className="tap shrink-0 text-[12px] font-bold text-brand-700 underline underline-offset-4 decoration-brand-300 decoration-2"
            >
              去看 →
            </button>
          </div>

          <div className="rounded-2xl bg-ink-50 p-4 mb-3">
            <div className="text-[14px] font-bold text-ink-900 mb-1">{wp.name}</div>
            <div className="text-[11.5px] text-ink-400 mb-3">{wp.chapter}</div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-ink-400 tabular-nums">{wp.from}%</span>
              <div className="flex-1 h-2.5 rounded-full bg-ink-200 overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 bg-ink-300 rounded-full" style={{ width: `${wp.from}%` }} />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-400 to-cheer-500 rounded-full transition-all duration-1000"
                  style={{ width: `${kind === 'done' ? wp.to : kind === 'retry' ? wp.from + 12 : wp.from}%` }}
                />
              </div>
              <span className="text-[14px] font-bold tabular-nums text-cheer-600">
                {kind === 'done' ? wp.to : kind === 'retry' ? wp.from + 12 : wp.from}%
              </span>
            </div>
            {kind === 'stopped' && (
              <p className="text-[11.5px] text-ink-400 leading-relaxed mt-3">
                掌握度要等你走完一次判定才会动。没走完就还是原来的 {wp.from}%，不会往下掉。
              </p>
            )}
          </div>

          {/*
            ⚠️ 原来第一条是「这道错题已记入你的错题本，标注了错误原因」。
            这个产品**没有错题本这个屏** —— 那句话点不动、也去不了，
            评审真去找会当场找不到。改成指向真的存在的成长档案。
            真要做错题本，那是一个新屏，不该混在这次打磨里偷偷加上。
          */}
          <ul className="space-y-2">
            {(kind === 'stopped'
              ? ['这道题还挂在你的成长档案里，状态没变', '你说的每一轮我都记着，下次接着往下走']
              : kind === 'done'
                ? [
                    '这道题已进你的成长档案，标了「自己推出来的」',
                    '学习兴趣指数 +3，本周你已主动学习 3 次',
                    '30 天进步曲线已更新',
                  ]
                : [
                    '这道题已进你的成长档案，标了「换讲法再来」',
                    '下次会换一条路带你走，不是把刚才那段重放一遍',
                    '30 天进步曲线已更新',
                  ]
            ).map(t => (
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
            {kind === 'stopped' ? '停之前弄明白的那句' : '这次要记住的'}
          </div>
          <p className="text-[13.5px] text-brand-700/90 leading-relaxed">
            串联电路只有一条电流路径，电流处处相等；断路时，电压表测到电源电压的那个元件，就是断掉的元件。
          </p>
          <div className="text-[11.5px] text-brand-700/70 mt-2">{wp.chapter}</div>
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
