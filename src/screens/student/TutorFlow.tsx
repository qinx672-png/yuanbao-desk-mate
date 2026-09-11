import { useEffect, useRef, useState, useCallback } from 'react'
import type { Bubble, ScriptNode, Stage, GuideDepth, ExitOption } from '@/types'
import {
  script,
  answerChoices,
  stageMetas,
  diagnosis,
  guideDepths,
  depthRewrite,
  depthHint,
  fallbackLoop,
  exitOptions,
  interestContexts,
} from '@/data/mockData'
import ClassmateAvatar, { moodFromBubbleKind, findRole, type ClassmateMood } from '@/components/common/ClassmateAvatar'
import { IconBook, IconClock, IconMic, IconCamera, IconPencil, IconCheck, IconSpark, IconShield } from '@/components/common/Icons'

/**
 * 屏05 · 数字同桌启发式引导（阶段 2-5）
 *
 * 形态设计：
 * - 不以"聊天机器人"形态出现，而是"坐在旁边的同桌"；主区是你和他共用的笔记本
 * - 你的回答以"手写笔记"样式写进本子（与同桌笔迹区分）
 *
 * V2 新增三件事：
 * 1. 引导深度三档（定位说明 3.1）：启发式是默认值不是唯一值。
 *    随时可切 深聊 / 标准 / 快讲；快讲直接给结论＋一题验证，不再苏格拉底追问。
 * 2. 容错四步闭环（架构说明 五）：学生可随时说「你讲错了」，
 *    AI 走 发现 → 承认 → 修复 → 沉淀，不辩解、不含糊。
 * 3. 体面退出（定位说明 3.2）：允许放弃但不允许挫败。
 *    退出面板提供 换简单题 / 存断点 / 今天先放一放，不追问原因、不留未完成标记。
 *
 * 沿用的既有规则：先探测认知基础再决定从哪讲、教材溯源、答对必给正向反馈、巩固题只要思路。
 */

interface Props {
  roleId: string
  depth: GuideDepth
  onDepthChange: (d: GuideDepth) => void
  onFinish: (r: { mastered: boolean; exited?: boolean }) => void
}

type Mode = 'chat' | 'timer' | 'answer'

const TYPE_DELAY = 520

export default function TutorFlow({ roleId, depth, onDepthChange, onFinish }: Props) {
  const role = findRole(roleId)
  const [history, setHistory] = useState<Bubble[]>([])
  const [queue, setQueue] = useState<Bubble[]>([])
  const [node, setNode] = useState<ScriptNode>(script['p2-probe'])
  const [mode, setMode] = useState<Mode>('chat')
  const [draft, setDraft] = useState('')
  const [seconds, setSeconds] = useState(180)
  const [showTimer, setShowTimer] = useState(true)
  const [entered, setEntered] = useState(false)
  const [mood, setMood] = useState<ClassmateMood>('listening')
  const [studentSays, setStudentSays] = useState('')
  const [showDepth, setShowDepth] = useState(false)
  const [showExit, setShowExit] = useState(false)
  const [challenged, setChallenged] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  /** 档位改写：同一份内容换讲法（快讲 → 跳过苏格拉底链，直接结论＋验证题） */
  const resolveId = useCallback((id: string, d: GuideDepth) => depthRewrite[d][id] ?? id, [])

  const enter = useCallback(
    (id: string, d: GuideDepth = depth) => {
      const n = script[resolveId(id, d)]
      setNode(n)
      const bubbles: Bubble[] = n.sensing ? [{ kind: 'sensing', text: n.sensing }, ...n.bubbles] : [...n.bubbles]
      setQueue(bubbles)
    },
    [depth, resolveId],
  )

  useEffect(() => {
    if (entered) return
    setEntered(true)
    enter('p2-probe')
  }, [entered, enter])

  /* 数字同学在说话中 */
  useEffect(() => {
    if (queue.length === 0) {
      setMood('listening')
      return
    }
    setMood(moodFromBubbleKind(queue[0].kind))
    const t = setTimeout(() => {
      const cur = queue[0]
      setHistory(h => [...h, cur])
      setQueue(q => q.slice(1))
    }, TYPE_DELAY)
    return () => clearTimeout(t)
  }, [queue])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [history, mode, queue.length])

  useEffect(() => {
    if (mode !== 'timer' || seconds <= 0) return
    const t = setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [mode, seconds])

  /* 学生的回答以"手写笔记"形式写进笔记本 */
  const writeStudent = (text: string) => {
    setHistory(h => [...h, { kind: 'student', text }])
    setStudentSays(text)
    setTimeout(() => setStudentSays(''), 1400)
  }

  const pick = (label: string, next: string, echo?: string) => {
    writeStudent(echo ?? label)
    setMood('thinking')
    if (next === 'timer') {
      setMode('timer')
      return
    }
    enter(next)
  }

  const submitInput = () => {
    if (!node.input) return
    const text = draft.trim() || node.input.quickFill
    writeStudent(text)
    setDraft('')
    setMood('thinking')
    enter(node.input.next)
  }

  const submitAnswer = (label: string, next: string) => {
    setMode('chat')
    writeStudent(label)
    setMood('thinking')
    enter(next)
  }

  /** 切换引导深度：立刻用新档位重讲当前这一步，不用回退重来 */
  const switchDepth = (d: GuideDepth) => {
    setShowDepth(false)
    if (d === depth) return
    onDepthChange(d)
    setHistory(h => [...h, { kind: 'system', text: `已切换到【${d}】· ${guideDepths.find(g => g.key === d)?.desc}` }])
    enter(node.id, d)
  }

  /** 容错四步闭环：学生指出讲错了 → 发现 / 承认 / 修复 / 沉淀 */
  const challenge = () => {
    if (challenged) return
    setChallenged(true)
    setMood('thinking')
    setQueue(q => [
      ...q,
      ...fallbackLoop.map(f => ({
        kind: (f.who === '学生' ? 'student' : f.step === '沉淀' ? 'system' : 'ai') as Bubble['kind'],
        text: f.step === '发现' ? f.text : `【${f.step}】${f.text}`,
      })),
    ])
  }

  /** 体面退出：不追问原因，不留「未完成」标记 */
  const doExit = (o: ExitOption) => {
    setShowExit(false)
    if (o.key === 'easier') {
      setHistory(h => [...h, { kind: 'student', text: o.label }])
      setQueue(q => [...q, { kind: 'ai', text: o.reply }])
      return
    }
    setHistory(h => [...h, { kind: 'student', text: o.label }, { kind: 'ai', text: o.reply }])
    setTimeout(() => onFinish({ mastered: false, exited: true }), 700)
  }

  const waiting = queue.length > 0
  const currentStage: Stage = mode === 'timer' || mode === 'answer' ? 3 : node.stage
  const currentInterest = node.interestContext ? interestContexts[node.interestContext] : null
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="relative flex-1 min-h-0 flex flex-col bg-[#f4f7fb]">
      {/* 顶部：阶段进度 + 数字同学 */}
      <div className="shrink-0 bg-white px-4 pt-2.5 pb-3 border-b border-ink-100">
        <div className="flex items-center gap-1.5 mb-2">
          {stageMetas.map(s => {
            const done = s.stage < currentStage
            const on = s.stage === currentStage
            return (
              <div
                key={s.stage}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  done ? 'bg-cheer-500' : on ? 'bg-brand-500' : 'bg-ink-100'
                }`}
              />
            )
          })}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-[13.5px] font-bold text-ink-900">
            阶段{currentStage} · {stageMetas[currentStage - 1].title}
          </div>
          <div className="text-[11.5px] text-ink-400">📚 {diagnosis.knowledgePoint}</div>
        </div>
      </div>

      {/* 数字同桌形象区（常驻，不是聊天头像）+ 引导深度切换 */}
      <div className="shrink-0 bg-gradient-to-b from-white to-[#eaf2fb] px-4 pt-3 pb-2.5 border-b border-ink-100/70">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ClassmateAvatar mood={mood} size={64} roleId={roleId} />
            {waiting && (
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-cheer-500 rounded-full border-2 border-white">
                <span className="absolute inset-0 animate-ping rounded-full bg-cheer-400 opacity-60" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-bold text-ink-900">你的同桌 · {role.name}</span>
              <span className="chip bg-brand-50 text-brand-700 text-[10.5px]">{role.style}</span>
            </div>
            <div className="text-[12px] text-ink-500 mt-0.5 truncate">
              {waiting
                ? '正在写笔记给你看…'
                : studentSays
                  ? `我在看你写的「${studentSays}」`
                  : '把你不会的题拿过来，我们一起想明白'}
            </div>
          </div>
          <button
            onClick={() => setShowDepth(true)}
            className="tap shrink-0 rounded-xl bg-white border border-brand-200 px-2.5 text-[12px] font-bold text-brand-700"
          >
            {depth}档
          </button>
        </div>

        {/* AI 主动建议切档（不强制，可忽略）—— 定位说明 3.1 */}
        {depth !== '快讲' && (
          <button
            onClick={() => switchDepth('快讲')}
            className="tap w-full mt-2 rounded-xl bg-warm-50 border border-warm-200 px-3 py-1.5 text-left"
          >
            <span className="text-[11.5px] text-warm-700 leading-relaxed">{depthHint['快讲']}</span>
            <span className="text-[11.5px] font-bold text-warm-700 ml-1 underline underline-offset-2">切快讲</span>
          </button>
        )}
      </div>

      {/* 共享笔记本：不是聊天气泡 */}
      <div ref={scrollRef} className="flex-1 min-h-0 scroll-area px-3 py-3">
        <div className="mx-auto max-w-[360px] bg-white rounded-2xl shadow-card border border-ink-100 relative overflow-hidden">
          {/* 笔记本左红线 + 横线（让你一眼看出这是"本子"不是"聊天"） */}
          <div className="absolute left-7 top-0 bottom-0 w-px bg-cheer-200" />
          <div
            className="absolute inset-0 pointer-events-none opacity-50"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent, transparent 28px, #eef1f5 28px, #eef1f5 29px)',
              backgroundPosition: '0 12px',
            }}
          />

          <div className="relative pl-9 pr-4 py-3 space-y-3.5">
            {history.map((b, i) => (
              <NotebookLine key={i} bubble={b} />
            ))}
            {waiting && (
              <div className="flex items-center gap-1 py-1.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-typing"
                    style={{ animationDelay: `${i * 0.18}s` }}
                  />
                ))}
                <span className="ml-1 text-[11.5px] text-ink-400">同学正在写…</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 交互区 */}
      <div className="shrink-0 bg-white border-t border-ink-100 px-4 py-3.5">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setShowDepth(true)}
            className="tap flex-1 rounded-xl bg-brand-50 text-brand-700 px-2 py-2 text-[12px] font-bold"
          >
            换讲法
          </button>
          <button
            onClick={challenge}
            disabled={challenged}
            className="tap flex-1 rounded-xl bg-cheer-50 text-cheer-700 px-2 py-2 text-[12px] font-bold disabled:opacity-45"
          >
            我觉得讲错了
          </button>
          <button
            onClick={() => setShowExit(true)}
            className="tap flex-1 rounded-xl bg-ink-100 text-ink-600 px-2 py-2 text-[12px] font-bold"
          >
            先停一下
          </button>
        </div>

        {/* 阶段3：独立计算 */}
        {mode === 'timer' && (
          <div className="animate-fadeUp">
            <div className="rounded-2xl bg-brand-50 border border-brand-100 p-4 mb-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-brand-700 font-bold text-[14px]">
                  <IconClock className="w-4 h-4" />
                  思路清楚了，现在你来算
                </div>
                {showTimer ? (
                  <span className="text-[19px] font-bold text-brand-700 tabular-nums">
                    {mm}:{ss}
                  </span>
                ) : (
                  <span className="text-[12px] text-brand-700/70">专心算，不着急</span>
                )}
              </div>
              <button
                onClick={() => setShowTimer(v => !v)}
                className="text-[12px] text-brand-600 underline underline-offset-2 mt-1"
              >
                {showTimer ? '不想看倒计时，隐藏它' : '显示倒计时'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mb-3">
              {[
                { Icon: IconPencil, label: '打字写答案' },
                { Icon: IconMic, label: '语音说' },
                { Icon: IconCamera, label: '拍照上传' },
              ].map(({ Icon, label }) => (
                <button
                  key={label}
                  onClick={() => setMode('answer')}
                  className="tap flex-col gap-1 rounded-2xl border-2 border-ink-100 py-3 text-ink-700 active:scale-[.98] transition"
                >
                  <Icon className="w-5 h-5 text-brand-600" />
                  <span className="text-[12.5px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
            <button className="btn-primary py-3" onClick={() => setMode('answer')}>
              我算好了
            </button>
          </div>
        )}

        {/* 阶段3→4：提交答案 */}
        {mode === 'answer' && (
          <div className="animate-fadeUp">
            <div className="text-[12.5px] text-ink-400 mb-2.5">把答案写在笔记本里给同学看：</div>
            <div className="space-y-2.5">
              {answerChoices.map(a => (
                <button
                  key={a.label}
                  onClick={() => submitAnswer(a.label, a.next)}
                  className="btn-ghost py-3 text-[15px] justify-start px-4 text-left"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 同学翻开的"下一页"：以选项按钮形式呈现，但文案是同学给你翻的一页 */}
        {mode === 'chat' && !waiting && node.options && (
          <div className="space-y-2.5 animate-fadeUp">
            {currentInterest && (
              <div className="rounded-xl bg-warm-50 border border-warm-100 px-3 py-2 text-[12px] text-warm-700 leading-relaxed">
                这道变式题用了你的兴趣情境：{currentInterest}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[12px] text-ink-400 mb-1">
              <IconSpark className="w-3.5 h-3.5" />
              同学把下一页翻过来，看你怎么想：
            </div>
            {node.options.map(o => (
              <button
                key={o.label}
                onClick={() => pick(o.label, o.next, o.echo)}
                className="btn-ghost py-3 text-[15px] justify-start px-4 text-left leading-snug"
              >
                {o.label}
              </button>
            ))}
          </div>
        )}

        {/* 复述输入 */}
        {mode === 'chat' && !waiting && node.input && (
          <div className="animate-fadeUp">
            <div className="text-[12.5px] text-ink-400 mb-2">自己写一遍给同学看：</div>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={node.input.placeholder}
              rows={2}
              className="w-full rounded-2xl border-2 border-ink-100 px-4 py-3 text-[15px] leading-relaxed resize-none focus:border-brand-300 outline-none font-[cursive]"
            />
            <div className="flex gap-2.5 mt-2.5">
              <button
                onClick={() => setDraft(node.input!.quickFill)}
                className="tap px-3 rounded-xl bg-ink-100 text-ink-700 text-[13px] font-semibold shrink-0"
              >
                照着说一遍
              </button>
              <button className="btn-primary py-3 flex-1" onClick={submitInput}>
                写完了
              </button>
            </div>
          </div>
        )}

        {/* 结束 */}
        {mode === 'chat' && !waiting && node.finish && (
          <button
            className="btn-primary py-3.5 text-[16px] animate-fadeUp"
            onClick={() => onFinish({ mastered: node.id === 'p5-mastered' })}
          >
            看看这次学到了什么
          </button>
        )}
      </div>

      {showDepth && (
        <div className="absolute inset-0 z-20 bg-ink-900/35 flex items-end p-4" onClick={() => setShowDepth(false)}>
          <div className="w-full rounded-3xl bg-white p-4 shadow-card animate-fadeUp" onClick={e => e.stopPropagation()}>
            <div className="text-[16px] font-bold text-ink-900 mb-1">选择这次怎么讲</div>
            <p className="text-[12.5px] text-ink-400 mb-3">启发式是默认值，不是唯一值；切档不会重置你的进度。</p>
            <div className="space-y-2.5">
              {guideDepths.map(g => (
                <button
                  key={g.key}
                  onClick={() => switchDepth(g.key)}
                  className={`w-full rounded-2xl border-2 px-4 py-3 text-left transition ${
                    depth === g.key ? 'border-brand-400 bg-brand-50' : 'border-ink-100 bg-white active:bg-ink-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-bold text-ink-900">{g.label}</span>
                    {depth === g.key && <span className="chip bg-brand-500 text-white text-[10.5px]">当前</span>}
                  </div>
                  <p className="text-[12.5px] text-ink-500 leading-relaxed mt-1">{g.desc}</p>
                  <p className="text-[11.5px] text-ink-400 leading-relaxed mt-1">适合：{g.scene}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showExit && (
        <div className="absolute inset-0 z-20 bg-ink-900/35 flex items-end p-4" onClick={() => setShowExit(false)}>
          <div className="w-full rounded-3xl bg-white p-4 shadow-card animate-fadeUp" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-2.5 mb-3">
              <span className="w-9 h-9 rounded-2xl bg-cheer-50 text-cheer-600 flex items-center justify-center shrink-0">
                <IconShield className="w-5 h-5" />
              </span>
              <div>
                <div className="text-[16px] font-bold text-ink-900">可以先停，不会算作失败</div>
                <p className="text-[12.5px] text-ink-400 leading-relaxed mt-0.5">我只记录你已经学会的部分，不追问原因。</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {exitOptions.map(o => (
                <button
                  key={o.key}
                  onClick={() => doExit(o)}
                  className="w-full rounded-2xl border border-ink-100 bg-white px-4 py-3 text-left active:bg-ink-50 transition"
                >
                  <div className="text-[14.5px] font-bold text-ink-900">{o.label}</div>
                  <p className="text-[12.5px] text-ink-400 leading-relaxed mt-0.5">{o.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 共享笔记本里的一行
 * - 同学写的：圆珠笔风格（小蓝点 + 行楷感）
 * - 教材出处：黄色便利贴
 * - 鼓励：金底高亮
 * - 学生写的：铅笔灰、稍斜，区别于同学的笔迹
 */
function NotebookLine({ bubble }: { bubble: Bubble }) {
  if (bubble.kind === 'student') {
    return (
      <div className="animate-popIn">
        <div className="text-[10.5px] text-ink-400 mb-1 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-ink-400" />
          你写的
        </div>
        <div
          className="text-[14.5px] leading-[1.85] text-ink-600 italic pl-3 border-l-2 border-ink-300"
          style={{ fontFamily: 'cursive' }}
        >
          {bubble.text}
        </div>
      </div>
    )
  }

  if (bubble.kind === 'sensing') {
    return (
      <div className="animate-popIn flex justify-center">
        <span className="chip bg-ink-50 text-ink-500 text-[11px] border border-dashed border-ink-200">
          同学的小心思 · {bubble.text}
        </span>
      </div>
    )
  }

  if (bubble.kind === 'cite') {
    return (
      <div className="animate-popIn">
        {/* 倾斜放在内层：popIn 关键帧会写 transform，同层会把 rotate 覆盖掉 */}
        <div className="inline-block max-w-full -rotate-[1.2deg] bg-[#fff7c2] border border-[#f4d34a] px-3 py-2 rounded-md shadow-sm relative">
          <span className="absolute -top-2 left-3 w-3 h-3 bg-cheer-300 rounded-full opacity-60" />
          <div className="flex items-center gap-1.5 text-[12.5px] text-ink-700 leading-relaxed">
            <IconBook className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span>{bubble.text}</span>
          </div>
        </div>
      </div>
    )
  }

  if (bubble.kind === 'praise') {
    return (
      <div className="animate-popIn">
        <div className="inline-flex items-center gap-2 rounded-xl bg-cheer-50 border border-cheer-200 px-3 py-2 animate-cheerPulse">
          <span className="w-5 h-5 rounded-full bg-cheer-500 text-white flex items-center justify-center shrink-0">
            <IconCheck className="w-3 h-3" />
          </span>
          <span className="text-[14.5px] font-bold text-cheer-700 leading-snug">{bubble.text}</span>
        </div>
      </div>
    )
  }

  if (bubble.kind === 'system') {
    return (
      <div className="animate-popIn flex justify-center">
        <span className="chip bg-ink-100 text-ink-600 text-[12px]">{bubble.text}</span>
      </div>
    )
  }

  return (
    <div className="animate-popIn">
      <div className="text-[10.5px] text-brand-600 mb-1 flex items-center gap-1 font-semibold">
        <span className="w-1 h-1 rounded-full bg-brand-500" />
        同学写
      </div>
      <div className="text-[14.5px] leading-[1.85] text-ink-900">
        {bubble.text}
      </div>
    </div>
  )
}