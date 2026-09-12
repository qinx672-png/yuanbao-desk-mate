import { useState } from 'react'
import type { WatchMark } from '@/types'
import { classNote, classNoteGuardrail } from '@/data/mockData'
import { IconShield, IconBook, IconCheck, IconClock, IconPencil, IconClose } from '@/components/common/Icons'

/**
 * 屏 · 课堂记录（手表端记录 → 手机端回顾）
 *
 * 对表《产品定位说明》⌚ 手表端「课堂记录」+ 架构判断说明 五 · 课堂记录红线。
 *
 * ── 这一屏为什么不做成对话 ──────────────────────────────────
 * 学生端首页和冷启动是「本子 + 麦克风」，因为那两屏的本质是**对话**。
 * 但课堂记录的本质是**一份结构化的记录** —— 知识点、例题、板书大纲，
 * 是拿来扫的，不是拿来聊的。硬套语音形态只会让人找不到东西。
 *
 * 这是今天学到的第二件事：**形态要跟着场景走，不是跟着审美走。**
 * 先学会「把界面删掉」，再学会「不是所有屏都能删」。
 *
 * ── 合规红线（这一屏的重点）────────────────────────────────
 * 1. 需老师授权 / 学校同意，**默认关闭** —— 顶部状态条如实呈现
 * 2. 只上传结构化要点，**不存原始音频** —— 界面明写
 * 3. 老师授课内容**仅用于该生课后辅导，绝不用于模型训练**
 * 4. 与教材冲突时的处理规则 —— 见下方 ConflictRule
 */

type Section = 'points' | 'examples' | 'board'

interface Props {
  /** 手表端同步过来的课堂打点。不传 = 纯手机视图，这一屏也能单独看 */
  marks?: WatchMark[]
  /** 是否已下课同步（只影响状态显示，打点一按就过来了） */
  synced?: boolean
  /** 要联动高亮的知识点下标 */
  activeIndex?: number | null
  /** 点某条打点，让它挂着的知识点再亮一次 */
  onSelectMark?: (m: WatchMark) => void
}

export default function ClassNote({ marks = [], synced = false, activeIndex = null, onSelectMark }: Props) {
  /** 课堂记录开关。默认关闭，需老师授权后开启 —— 这里是「已授权」的演示态 */
  const [enabled, setEnabled] = useState(true)

  const sections: { key: Section; label: string; items: string[]; Icon: typeof IconBook }[] = [
    { key: 'points', label: '知识点', items: classNote.knowledgePoints, Icon: IconBook },
    { key: 'examples', label: '例题题干', items: classNote.examples, Icon: IconPencil },
    { key: 'board', label: '板书大纲', items: classNote.board, Icon: IconClock },
  ]

  return (
    <div className="flex-1 min-h-0 scroll-area bg-ink-50 pb-6">
      {/* ── 授权状态条：默认关闭是红线，必须让学生一眼看见开关在哪 ── */}
      <div className="bg-white px-5 pt-2 pb-3 border-b border-ink-100">
        <div className="flex items-center gap-2">
          <span
            className={`chip border ${
              enabled ? 'bg-cheer-50 text-cheer-700 border-cheer-100' : 'bg-ink-100 text-ink-500 border-ink-200'
            }`}
          >
            <IconShield className="w-3.5 h-3.5" />
            {enabled ? '老师已授权 · 本节课记录中' : '课堂记录已关闭'}
          </span>
          <button
            onClick={() => setEnabled(v => !v)}
            className="tap ml-auto text-[12px] text-ink-500 underline underline-offset-2"
          >
            {enabled ? '关掉这节课的记录' : '开启记录'}
          </button>
        </div>
        <p className="text-[11.5px] text-ink-400 leading-relaxed mt-2">
          课堂记录默认关闭，需老师或学校同意后才开启。你随时可以关掉，关掉后这节课不会留下任何内容。
        </p>
      </div>

      {!enabled ? (
        <div className="px-5 pt-6">
          <div className="card p-6 text-center">
            <IconClose className="w-7 h-7 text-ink-300 mx-auto mb-2" />
            <p className="text-[14px] text-ink-500 leading-relaxed">
              这节课没有记录。
              <br />
              需要的时候再打开就行，不影响课后辅导。
            </p>
          </div>
        </div>
      ) : (
        <div className="px-5 pt-4 space-y-4">
          {/* ── 课程头 ─────────────────────────────────────── */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="chip bg-brand-50 text-brand-700 text-[11px]">{classNote.subject}</span>
              <span className="text-[12px] text-ink-400">
                {classNote.date} · {classNote.period}
              </span>
            </div>
            <h1 className="text-[17px] font-bold text-ink-900 leading-snug">{classNote.topic}</h1>
            <p className="text-[12px] text-ink-400 mt-1">授课老师：{classNote.teacher}</p>
          </div>

          {/* ── 课堂打点：手表上按的那几下，在这里落到具体知识点上 ──── */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className={`chip border ${
                  synced ? 'bg-cheer-50 text-cheer-700 border-cheer-100' : 'bg-warm-50 text-warm-700 border-warm-100'
                }`}
              >
                {synced ? <IconCheck className="w-3.5 h-3.5" /> : <IconClock className="w-3.5 h-3.5" />}
                {synced ? '已同步' : '记录中'}
              </span>
              <h2 className="text-[14.5px] font-bold text-ink-900">课堂打点</h2>
              <span className="ml-auto text-[12px] tabular-nums text-ink-400">{marks.length} 次</span>
            </div>

            {marks.length === 0 ? (
              <p className="text-[12.5px] leading-relaxed text-ink-400">
                还没打过点。上课时在手表上按一下「没听懂」，那个时刻会自动记到对应的知识点上。
              </p>
            ) : (
              <>
                <p className="mb-2.5 text-[12px] leading-relaxed text-ink-400">
                  手表上按的那一下，自动挂到了老师当时正在讲的知识点上 —— 你不需要说清自己哪里没听懂。
                </p>
                <div className="space-y-1.5">
                  {marks.map(m => (
                    <button
                      key={m.id}
                      onClick={() => onSelectMark?.(m)}
                      className={`tap w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left transition ${
                        m.index === activeIndex ? 'bg-warm-50 ring-1 ring-warm-200' : 'bg-ink-50 hover:bg-ink-100'
                      }`}
                    >
                      <span className="mt-0.5 shrink-0 text-[12px] font-semibold tabular-nums text-warm-600">
                        {m.at}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold text-ink-800">没听懂</span>
                        <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-400">
                          → 已挂到「{classNote.knowledgePoints[m.index]}」
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── 三类结构化要点 ─────────────────────────────── */}
          {sections.map(s => (
            <div key={s.key} className="card p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <s.Icon className="w-4 h-4 text-brand-600" />
                <h2 className="text-[14.5px] font-bold text-ink-900">{s.label}</h2>
              </div>
              <div className="space-y-2">
                {s.items.map((it, i) => {
                  /* 和手表联动：刚打的那个点，对应的知识点亮一下 */
                  const lit = s.key === 'points' && i === activeIndex
                  return (
                    <div
                      key={it}
                      className={`-mx-2 flex gap-2.5 rounded-xl px-2 py-1.5 transition-colors duration-500 ${
                        lit ? 'bg-warm-50' : 'bg-transparent'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5 transition-colors duration-500 ${
                          lit ? 'bg-warm-500 text-white' : 'bg-brand-50 text-brand-600'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <p className="text-[13px] text-ink-700 leading-relaxed">{it}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* ── 与课后辅导的衔接 ───────────────────────────── */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <IconCheck className="w-4 h-4 text-cheer-600" />
              <h2 className="text-[14.5px] font-bold text-ink-900">课后辅导怎么跟这节课对齐</h2>
            </div>
            <p className="text-[13px] text-ink-600 leading-relaxed">{classNote.gap}</p>
            <ConflictRule />
          </div>

          {/* ── 合规红线：把边界明写出来，不是藏在协议里 ──────── */}
          <div className="rounded-2xl bg-cheer-50 border border-cheer-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <IconShield className="w-4 h-4 text-cheer-600" />
              <h2 className="text-[13.5px] font-bold text-cheer-700">这节课的记录，边界在这里</h2>
            </div>
            <div className="space-y-1.5">
              {classNoteGuardrail.map(g => (
                <div key={g} className="flex gap-2 text-[12.5px] text-cheer-700 leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-cheer-500 shrink-0 mt-2" />
                  <span>{g}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-[11.5px] text-ink-400 leading-relaxed px-2">
            记录来源：手表端自动整理，手机与手表共用一个账号
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * 老师讲法与教材不一致时怎么办 —— 分两种情况，不能一句话糊过去。
 *
 * ⚠️ 这里修了一处文档与数据打架的地方（验收时请看）：
 *   · 产品定位说明写：「老师内容与教材冲突时，以教材为准并温和提示」
 *   · mockData 的 classNote.gap 写：「排查顺序与课本不同，课后辅导以老师版本为准」
 *   两句看着矛盾，其实是两件事：
 *     - 顺序 / 讲法不同（老师没错）→ **跟老师**，因为课堂记录的价值就是对齐真实进度
 *     - 内容与教材不一致（老师可能讲错）→ **以教材为准**，并温和提示学生
 *   拆成两条规则，红线才不含糊。
 */
function ConflictRule() {
  const rules = [
    {
      tag: '顺序、讲法不一样',
      tone: 'cheer' as const,
      text: '跟着老师走。课堂记录的意义就是对上真实教学进度，课后不另起一套。',
    },
    {
      tag: '内容跟教材对不上',
      tone: 'warm' as const,
      text: '以教材为准，并温和提示你「这里和课本第 15 章讲法不太一样，我们一起看看」。不评价老师。',
    },
  ]

  return (
    <div className="mt-3 pt-3 border-t border-dashed border-ink-200/80">
      <div className="text-[11.5px] font-semibold text-ink-500 mb-2">老师讲法和课本不一样时，听谁的</div>
      <div className="space-y-2">
        {rules.map(r => (
          <div
            key={r.tag}
            className={`rounded-xl px-3 py-2.5 border ${
              r.tone === 'cheer' ? 'bg-cheer-50/60 border-cheer-100' : 'bg-warm-50 border-warm-100'
            }`}
          >
            <div className={`text-[12.5px] font-bold mb-0.5 ${r.tone === 'cheer' ? 'text-cheer-700' : 'text-warm-700'}`}>
              {r.tag}
            </div>
            <p className={`text-[12.5px] leading-relaxed ${r.tone === 'cheer' ? 'text-cheer-700/90' : 'text-warm-700/90'}`}>
              {r.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
