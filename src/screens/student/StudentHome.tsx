import { useEffect, useRef, useState } from 'react'
import { student, weakPoints, reviewCards, todayTasks } from '@/data/mockData'
import ClassmateAvatar, { findRole } from '@/components/common/ClassmateAvatar'
import { SketchFrame, Handwrite } from '@/components/common/SketchFrame'
import TalkButton from '@/components/common/TalkButton'
import { useSpeech, useListening, wait } from '@/hooks/useSpeech'
import {
  IconShield,
  IconClock,
  IconBook,
  IconSpark,
  IconCheck,
  IconChart,
  IconSound,
  IconSoundOff,
} from '@/components/common/Icons'

/**
 * 屏02 · 学生首页（V2：对话优先 + 界面按需生成 / Just-in-Time UI）
 *
 * 对表《产品定位说明 V2》3.0-1「第一入口：对话优先 + 界面按需生成」。
 *
 * ── 这一版为什么把输入框也拿掉了 ────────────────────────────
 * 上一版把三个按钮换成了「在本子上写」。方向对，但没走到底：
 * **输入框本身就是一块预先设计好的界面**。屏幕上只要戳着一个框等孩子填，
 * 他看到的就还是「一个要我交东西的工具」，不是同桌。
 *
 * 手机上打字对初中生是阻力：键盘占半屏、中文输入慢、思路一断就接不回来。
 * 手写/打字更适合平板（有笔、屏大）——所以打字降级成兜底，不是主路径。
 *
 * ── 现在的主路径 ──────────────────────────────────────────
 * 同桌**出声说话**（浏览器内置中文语音，真出声），本子上逐字写出她说的字；
 * **她说到什么，什么才浮现**：
 *   说到「昨天你卡在串联电路那道题」→ 黄色便利贴才长出来
 * 学生**按住说话**回答，说完松手 → 同桌想一下 → 对应的学习工具被画出来。
 * 默认屏幕上没有菜单、没有按钮货架，只有一本本子和一个麦克风。
 *
 * ── 为什么本子留着不清空 ─────────────────────────────────
 * 语音是留不住的，说完就散了。本子是这场对话的**记录**：
 * 孩子回头能看到今天学过什么、同桌说过什么。安全和留痕比炫技重要。
 *
 * ── 诚实说明 ─────────────────────────────────────────────
 * 1. 语音合成用浏览器内置能力（零依赖、不用 Key、不联网）。
 *    找不到中文语音时自动降级为静音 + 字幕，界面会显示「字幕模式」，不装作有声音。
 * 2. 语音识别（听学生说）在 Chrome 上依赖境外服务，国内常常不可用。
 *    能用就用真的；不能用则回落为模拟识别，并在本子上如实标注「（原型模拟识别）」。
 * 3. 意图解析仍是关键词规则（见 plan()），真实实现由 LLM 承担。
 *
 * 保留的既有安全设计：家长监护常驻标识、今日学习时长、只和自己比较的声明、
 * 「累」这条路通向台阶而不是催促（定位说明 3.2 体面退出）。
 */

type Widget =
  | { kind: 'cite'; chapter: string; sub: string; ctas?: { label: string; go: 'tutor' | 'photo' }[] }
  | { kind: 'review'; name: string; chapter: string; body: string }
  | { kind: 'practice'; items: typeof todayTasks }
  | { kind: 'timer'; minutes: number; note: string }
  | { kind: 'gentle'; text: string; options: string[]; picked?: string }

type Line =
  | { kind: 'ai'; text: string }
  | { kind: 'me'; text: string; via?: 'voice' | 'typed'; simulated?: boolean }
  | Widget

interface Props {
  studyMinutes: number
  roleId: string
  onPhoto: () => void
  onStartTask: () => void
}

/** 学生没说话时的模拟识别台词（真识别不可用时才用，界面会标注） */
const SEEDS = ['接着讲昨天的电路', '我想练两道题', '复习一下那节课', '今天有点累']

/** 选了台阶之后同桌怎么接（定位说明 3.2：不追问原因、不留未完成标记） */
const GENTLE_REPLIES = [
  '行，先来个热身的。一根线串两只灯，取下一只，另一只还亮吗？',
  '存好了。下次打开我直接从这一步接着问你，不用重头讲。',
  '好，今天到这儿。你已经把「电压为 0 说明元件是好的」弄明白了，这个不会丢。',
]

export default function StudentHome({ studyMinutes, roleId, onPhoto, onStartTask }: Props) {
  const role = findRole(roleId)
  const wp = weakPoints[0]

  const [lines, setLines] = useState<Line[]>([])
  const [thinking, setThinking] = useState<string | null>(null)
  const [phase, setPhase] = useState<'busy' | 'waiting'>('busy')
  const [leaving, setLeaving] = useState<string | null>(null)

  const { speak, stop, muted, setMuted, ttsReady } = useSpeech()
  const { listen } = useListening()

  const scrollRef = useRef<HTMLDivElement>(null)
  /** 打断令牌：自增即作废此前所有异步段落，避免学生插话时两段话叠在一起 */
  const runRef = useRef(0)
  const simIdx = useRef(0)
  const timers = useRef<number[]>([])
  const booted = useRef(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [lines, thinking, leaving])

  useEffect(() => {
    if (booted.current) return
    booted.current = true
    void intro()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(
    () => () => {
      runRef.current++
      stop()
      timers.current.forEach(clearTimeout)
    },
    [stop],
  )

  const alive = (id: number) => runRef.current === id

  /** 同桌说一句：先写到本子上（逐字），同时念出来，说完停一拍 */
  const say = async (text: string, id: number) => {
    if (!alive(id)) return
    setLines(l => [...l, { kind: 'ai', text }])
    await speak(text)
    if (!alive(id)) return
    await wait(300)
  }

  /** 谈到的内容浮现出来 */
  const show = async (w: Widget, id: number, pause = 620) => {
    if (!alive(id)) return
    setLines(l => [...l, w])
    await wait(pause)
  }

  /** 开场：同桌先开口，说到哪，本子上才长出哪 */
  const intro = async () => {
    const id = ++runRef.current
    setPhase('busy')
    await say(`哈喽${student.name}同学，下午好啊。`, id)
    await say(`昨天你卡在「${wp.name}」这道题上，`, id)
    await show(
      {
        kind: 'cite',
        chapter: wp.chapter,
        sub: `掌握度 ${wp.from}% → ${wp.to}% · 底子在八年级《电流和电路》`,
      },
      id,
    )
    await say(`近 30 天你错过了 ${wp.errorCount} 次，而且每次都是同一个环节。要不要接着弄明白？`, id)
    if (alive(id)) setPhase('waiting')
  }

  /**
   * 学生这一轮说了什么。
   * typed 有值＝点选/打字（学生明确表达，不算模拟）；无值＝走真语音识别。
   */
  const onSay = async (typed?: string) => {
    if (phase !== 'waiting') return
    const id = runRef.current
    setPhase('busy')

    let text: string
    let via: 'voice' | 'typed'
    let simulated = false

    if (typed !== undefined) {
      text = typed.trim()
      via = 'typed'
    } else {
      const r = await listen(SEEDS[simIdx.current++ % SEEDS.length])
      if (!alive(id)) return
      text = r.text.trim()
      via = 'voice'
      simulated = !r.real
    }

    // 真识别开着但没听清：不编，再问一遍（这是诚实，也是真实产品该有的样子）
    if (!text) {
      await say('没听清，你再说一遍？', id)
      if (alive(id)) setPhase('waiting')
      return
    }

    setLines(l => [...l, { kind: 'me', text, via, simulated }])
    const p = plan(text)
    setThinking(p.think)
    await wait(1000)
    if (!alive(id)) return
    setThinking(null)

    if (p.widget) await show(p.widget, id, 560)
    await say(p.say, id)
    if (p.after) await say(p.after, id)
    if (!alive(id)) return

    if (p.go) {
      goFrom(p.go)
      return
    }
    setPhase('waiting')
  }

  /** 便利贴里的下一步。动作长在生成物里，不是常驻按钮。 */
  const goFrom = (go: 'tutor' | 'photo') => {
    if (leaving) return
    runRef.current++
    stop()
    setLeaving(go === 'photo' ? '好，把题拍给我 —— 只拍题目就行。' : '好，那我们现在开始。')
    timers.current.push(window.setTimeout(() => (go === 'photo' ? onPhoto() : onStartTask()), 1000))
  }

  /** 「累」那条路：给台阶，不催促（定位说明 3.2 体面退出） */
  const pickGentle = async (idx: number, label: string) => {
    if (phase !== 'waiting') return
    const id = runRef.current
    setPhase('busy')
    setLines(l => l.map((x): Line => (x.kind === 'gentle' && !x.picked ? { ...x, picked: label } : x)))
    await say(GENTLE_REPLIES[idx] ?? '好，那先这样。', id)
    if (alive(id)) setPhase('waiting')
  }

  /** 本子里第一条「同学写」才标注说话人 */
  const firstAi = lines.findIndex(l => l.kind === 'ai')

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#f4f7fb]">
      {/* 顶部：家长监护常驻 + 声音开关 + 今日时长 */}
      <div className="shrink-0 bg-white px-4 pt-2 pb-1.5 flex items-center gap-2">
        <div className="chip bg-cheer-50 text-cheer-700 border border-cheer-100">
          <IconShield className="w-3.5 h-3.5" />
          家长监护已开启
        </div>
        <button
          onClick={() => setMuted(m => !m)}
          className={`tap chip ml-auto border ${
            muted ? 'bg-ink-50 text-ink-500 border-ink-100' : 'bg-brand-50 text-brand-700 border-brand-100'
          }`}
          aria-label={muted ? '打开同桌的声音' : '静音'}
        >
          {muted ? <IconSoundOff className="w-3.5 h-3.5" /> : <IconSound className="w-3.5 h-3.5" />}
          {muted ? '已静音' : ttsReady ? '同桌有声' : '字幕模式'}
        </button>
        <div className="chip bg-ink-50 text-ink-500">
          <IconClock className="w-3.5 h-3.5" />
          {studyMinutes} 分钟
        </div>
      </div>

      {/* 同桌身份条 */}
      <div className="shrink-0 bg-gradient-to-b from-white to-[#eaf2fb] px-4 pt-1.5 pb-2 border-b border-ink-100/70 flex items-center gap-2.5">
        <ClassmateAvatar mood={thinking ? 'thinking' : phase === 'busy' ? 'explaining' : 'listening'} size={38} roleId={roleId} />
        <span className="text-[14px] font-bold text-ink-900">你的同桌 · {role.name}</span>
        <span className="chip bg-brand-50 text-brand-700 text-[10.5px]">{role.style}</span>
        <span className="ml-auto text-[11.5px] text-ink-400 truncate">
          {leaving ? '收拾书包…' : thinking ? '正在想…' : phase === 'busy' ? '正在说…' : '在听你说'}
        </span>
      </div>

      {/* 共享笔记本：不是功能货架，是本子 —— 也是这场对话的记录 */}
      <div ref={scrollRef} className="flex-1 min-h-0 scroll-area px-3 py-3">
        <div className="mx-auto max-w-[360px] bg-white rounded-2xl shadow-card border border-ink-100 relative overflow-hidden">
          <div className="absolute left-7 top-0 bottom-0 w-px bg-cheer-200" />
          <div
            className="absolute inset-0 pointer-events-none opacity-50"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent, transparent 28px, #eef1f5 28px, #eef1f5 29px)',
              backgroundPosition: '0 12px',
            }}
          />

          <div className="relative pl-9 pr-4 py-3.5 space-y-3.5">
            {lines.map((l, i) => (
              <NotebookLine key={i} line={l} first={i === firstAi} onCta={goFrom} onGentle={pickGentle} />
            ))}

            {/* 同桌想了一下：把"界面为什么长成这样"的判断依据写出来 */}
            {thinking && (
              <div className="animate-fadeUp">
                <div className="flex items-center gap-1 text-[10.5px] text-warm-700 font-semibold mb-1">
                  <IconSpark className="w-3 h-3" />
                  同桌想了一下
                </div>
                <div className="text-[13px] leading-[1.85] text-ink-500 italic">{thinking}</div>
              </div>
            )}

            {leaving && (
              <div className="animate-fadeUp">
                <div className="text-[10.5px] text-brand-600 mb-1 flex items-center gap-1 font-semibold">
                  <span className="w-1 h-1 rounded-full bg-brand-500" />
                  同学写
                </div>
                <div className="text-[14.5px] leading-[1.85] text-ink-900">{leaving}</div>
              </div>
            )}

            {/* ── 麦克风：屏幕上唯一常驻的"控件"，其余都靠谈 ─────────
                说 / 点 / 写三条等价通道，演示和课堂上都不用出声 */}
            <div className="pt-3 border-t border-dashed border-ink-200/80">
              <TalkButton
                onSay={onSay}
                disabled={phase !== 'waiting' || !!leaving}
                suggestions={SEEDS}
              />
            </div>
          </div>
        </div>

        <p className="text-center text-[11.5px] text-ink-400 leading-relaxed pt-3 pb-1">
          同桌说的每一句都会写在本子上，你可以回看
          <br />
          这里只有你自己的学习记录，不会和其他同学比较
        </p>
      </div>
    </div>
  )
}

/* ==================================================================
 * 意图 → 生成哪种工具
 *
 * ⚠️ 原型里这是关键词规则，不是真的 NLU。真实实现由 LLM 做这一步解析。
 * 顺序有讲究：「累」必须最先判，这是安全兜底，不能被别的关键词抢走。
 * ================================================================== */
interface Plan {
  /** 同桌"想"的痕迹，写在本子上（决策可见） */
  think: string
  /** 说出来的话 */
  say: string
  /** 生成的学习工具（谈到的内容） */
  widget?: Widget
  /** 工具浮现之后再说一句 */
  after?: string
  /** 生成物里带一个去向 */
  go?: 'tutor' | 'photo'
}

function plan(text: string): Plan {
  const wp = weakPoints[0]
  const r = reviewCards[0]
  const total = todayTasks.reduce((s, t) => s + t.minutes, 0)

  // ① 状态不好：先给台阶，再谈学习（定位说明 3.2 体面退出 / 3.5 学习状态信号）
  if (/(累|不想|烦|放弃|学不进|困|没劲|难受)/.test(text)) {
    return {
      think: '今天状态一般，那就别硬撑。我把难度降下来，或者干脆先存着——你说了算。',
      say: '今天状态一般，那就别硬撑。',
      widget: {
        kind: 'gentle',
        text: '你今天已经坐下来学了 36 分钟，这本身就够了。剩下的事，挑一个：',
        options: ['换道简单的热热身', '存着，明天接着来', '今天先到这儿'],
      },
      after: '哪个都行，不选也没关系。',
    }
  }

  // ② 复习
  if (/(复习|回顾|笔记|那节课|那节)/.test(text)) {
    return {
      think: '昨天那节课你只记了一句话。先扫一眼，比重新学一遍快得多。',
      say: '昨天那节课你只记了一句话，我贴在这儿。',
      widget: { kind: 'review', name: r.name, chapter: r.chapter, body: r.content },
      after: '就这一句，扫一眼就行。想动手做题随时说。',
    }
  }

  // ③ 想练题
  if (/(练|做题|刷题|作业|题目|几道)/.test(text)) {
    return {
      think: `三题、${total} 分钟，按你现在的水平排的，不贪多。`,
      say: '行，我给你排三道。',
      widget: { kind: 'practice', items: todayTasks },
      after: `${total} 分钟，按你现在的水平排的，做不完也不算欠账。`,
    }
  }

  // ④ 想要计时
  if (/(计时|时间|几分钟|多久|专注)/.test(text)) {
    return {
      think: '给你在本子角上放个表。它不是考试倒计时，随时可以收起来。',
      say: '给你在本子角上放个表。',
      widget: { kind: 'timer', minutes: 10, note: '不想看倒计时的话，点一下就能收起来' },
      after: '它不是考试倒计时，你想收起就收起。',
    }
  }

  // ⑤ 答应了，直接开始 —— 不再生成多余的东西
  if (/(接着|继续|开始|好|行|可以|来吧|嗯|要)/.test(text)) {
    return {
      think: '学生答应了，直接进辅导。不用再摆一遍入口——那是货架的做法。',
      say: '好，那我们把题拿出来，我陪你一步步理。',
      go: 'tutor',
    }
  }

  // ⑥ 默认：本产品最高频的入口 —— 有一道题不会 / 想接着弄明白
  return {
    think: `你最近 30 天在「${wp.name}」上卡过 ${wp.errorCount} 次，而且每次都是同一个环节。先解决它，性价比最高。`,
    say: '我先把这道题的出处贴出来。',
    widget: {
      kind: 'cite',
      chapter: wp.chapter,
      sub: `近 30 天错过 ${wp.errorCount} 次 · 掌握度 ${wp.from}% → ${wp.to}%`,
      ctas: [
        { label: '拍给我看', go: 'photo' },
        { label: '没有题，直接讲', go: 'tutor' },
      ],
    },
    after: '把题拿过来就行 —— 拍给我，或者直接说。',
  }
}

/** 本子角上的计时器：可一键收起（流程说明 阶段3：计时器可选，避免考试焦虑） */
function TimerWidget({ minutes, note }: { minutes: number; note: string }) {
  const [left, setLeft] = useState(minutes * 60)
  const [shown, setShown] = useState(true)

  useEffect(() => {
    if (left <= 0) return
    const t = window.setTimeout(() => setLeft(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div className="flex items-center gap-2">
      <IconClock className="w-4 h-4 text-brand-600 shrink-0" />
      {shown ? (
        <span className="text-[17px] font-bold text-brand-700 tabular-nums">
          {mm}:{ss}
        </span>
      ) : (
        <span className="text-[13px] text-brand-700/80">表收起来了，专心写</span>
      )}
      <button onClick={() => setShown(v => !v)} className="ml-auto text-[11.5px] text-brand-600 underline underline-offset-2">
        {shown ? '收起' : '展开'}
      </button>
      <span className="sr-only">{note}</span>
    </div>
  )
}

/** 本子里的一行 */
function NotebookLine({
  line,
  first,
  onCta,
  onGentle,
}: {
  line: Line
  first: boolean
  onCta: (go: 'tutor' | 'photo') => void
  onGentle: (idx: number, label: string) => void
}) {
  if (line.kind === 'me') {
    return (
      <div className="animate-fadeUp">
        <div className="text-[10.5px] text-ink-400 mb-1 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-ink-400" />
          {line.via === 'typed' ? '你写的' : '你说的'}
          {/* 模拟识别的结果如实标注，不装作真听懂了 */}
          {line.simulated && <span className="text-warm-600">（原型模拟识别）</span>}
        </div>
        <div
          className="text-[14.5px] leading-[1.85] text-ink-600 italic pl-3 border-l-2 border-ink-300"
          style={{ fontFamily: 'cursive' }}
        >
          <Handwrite text={line.text} total={900} />
        </div>
      </div>
    )
  }

  if (line.kind === 'cite') {
    return (
      <SketchFrame stroke="#e8bf32" fill="#fffbe0" rotate="-rotate-[1.1deg]">
        <div className="flex items-center gap-1.5 text-[12.5px] text-ink-700 leading-relaxed">
          <IconBook className="w-3.5 h-3.5 text-brand-600 shrink-0" />
          <span>{line.chapter}</span>
        </div>
        <div className="text-[11px] text-ink-500 mt-1.5 pl-5 leading-relaxed">{line.sub}</div>
        {line.ctas && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 pl-5">
            {line.ctas.map(c => (
              <button
                key={c.go}
                onClick={() => onCta(c.go)}
                className="tap text-[13px] font-bold text-brand-700 underline underline-offset-4 decoration-brand-300 decoration-2"
              >
                → {c.label}
              </button>
            ))}
          </div>
        )}
      </SketchFrame>
    )
  }

  if (line.kind === 'review') {
    return (
      <SketchFrame stroke="#8ecdff" fill="#f3f9ff" rotate="rotate-[.6deg]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <IconBook className="w-4 h-4 text-brand-600" />
          <span className="text-[13.5px] font-bold text-brand-700">{line.name}</span>
        </div>
        <p className="text-[13px] text-brand-700/90 leading-relaxed">{line.body}</p>
        <div className="text-[11px] text-brand-700/60 mt-1.5">{line.chapter}</div>
      </SketchFrame>
    )
  }

  if (line.kind === 'practice') {
    return (
      <SketchFrame stroke="#8ecdff" fill="#f3f9ff" rotate="-rotate-[.7deg]">
        <div className="flex items-center gap-1.5 mb-2">
          <IconChart className="w-4 h-4 text-brand-600" />
          <span className="text-[13.5px] font-bold text-brand-700">今天这三道，够了</span>
        </div>
        <div className="space-y-1.5">
          {line.items.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2 text-[13px] text-ink-700">
              <span className="w-4 h-4 rounded-full bg-white border border-brand-200 text-brand-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="truncate">{t.name}</span>
              <span className="ml-auto shrink-0 text-[11px] text-ink-400 tabular-nums">{t.minutes} 分钟</span>
            </div>
          ))}
        </div>
      </SketchFrame>
    )
  }

  if (line.kind === 'timer') {
    return (
      <SketchFrame stroke="#8ecdff" fill="#f3f9ff" rotate="rotate-[.8deg]">
        <TimerWidget minutes={line.minutes} note={line.note} />
      </SketchFrame>
    )
  }

  if (line.kind === 'gentle') {
    return (
      <SketchFrame stroke="#ffc98a" fill="#fff8ef" rotate="-rotate-[.6deg]">
        <div className="text-[13px] text-warm-700 leading-relaxed mb-2">{line.text}</div>
        {line.picked ? (
          <div className="flex items-center gap-1.5 text-[12.5px] text-warm-700 font-semibold">
            <IconCheck className="w-4 h-4" />
            选了「{line.picked}」，不着急
          </div>
        ) : (
          <div className="space-y-1.5">
            {line.options.map((o, i) => (
              <button
                key={o}
                onClick={() => onGentle(i, o)}
                className="tap w-full rounded-lg bg-white/70 border border-warm-100 px-3 py-2 text-[13px] text-warm-700 font-semibold text-left active:scale-[.98] transition"
              >
                {o}
              </button>
            ))}
          </div>
        )}
      </SketchFrame>
    )
  }

  return (
    <div className="animate-fadeUp">
      {first && (
        <div className="text-[10.5px] text-brand-600 mb-1 flex items-center gap-1 font-semibold">
          <span className="w-1 h-1 rounded-full bg-brand-500" />
          同学写
        </div>
      )}
      <div className="text-[14.5px] leading-[1.85] text-ink-900">
        <Handwrite text={line.text} />
      </div>
    </div>
  )
}
