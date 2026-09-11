import { useEffect, useRef, useState } from 'react'
import {
  onboardSteps,
  startProbes,
  profileV0,
  profileTimeline,
  avatarRoles,
  interestContexts,
} from '@/data/mockData'
import ClassmateAvatar from '@/components/common/ClassmateAvatar'
import { SketchFrame, Handwrite } from '@/components/common/SketchFrame'
import TalkButton from '@/components/common/TalkButton'
import { useSpeech, useListening, wait } from '@/hooks/useSpeech'
import { IconShield, IconCheck, IconSpark, IconSound, IconSoundOff } from '@/components/common/Icons'

/**
 * 屏01 · 冷启动画像：认识新同桌
 *
 * 对表《产品定位说明 V2》3.0-2「冷启动：趣味外壳 + 科学内核」：
 * - 学生感受到的是「认识一个新同学」，不是填问卷 —— 全程无量表、无进度条、无「测评」字样
 * - 系统实际采集：兴趣爱好 / 大五人格倾向 / 学习动机；学科起点靠做题看，不靠自评
 * - 大五只用于「过程支持」适配（节奏、反馈、情境），不向学生输出「你是这个人」这类人格定论
 *   （架构判断说明 五 · 能力边界）
 * - 最后一步是角色库自选（3.0-3），换外壳不换内核
 *
 * ── 这一屏为什么必须和首页用同一套形态 ──────────────────────
 * 这是学生打开产品看到的第一屏。第一屏如果是气泡+按钮的问卷，
 * 后面再怎么"对话优先"，主轴也是断的 —— 孩子第一眼就认定这是个答题工具。
 * 上一版把按钮换成了"在本子上写"，方向对但没走到底：**输入框本身就是预设界面**。
 * 所以这一版把打字也降级成兜底，主路径是**同桌出声问，孩子按住说话答**。
 *
 * ── 参照 Runway Solaris「界面世界模型」───────────────────────
 * 交互发生在界面表面本身，而不是"先摆好控件、等你来点"：
 * - 没有「请选择你的兴趣」的选项菜单。同桌问一句，你张口说一句
 * - 你说的话**当场变成一张贴纸贴在本子上**，不是被存进后台字段。
 *   画像不是从菜单里选出来的，是从你说的话里长出来的 —— 这是本屏最重要的一处
 * - 说不出来才撕纸条（纸条是纸，是页面上的物件，不是控件）
 *
 * ── 一处刻意的例外：做题那一步不给语音 ───────────────────────
 * 语音适合表达**意图**（"我想练两道题"），不适合表达**算式**（"电流 0.3 安培"）。
 * 起点诊断那几道题必须是纸面点选 —— 全语音会把能做的孩子挡在门外。
 * 这不是没做完，是判断：语音优先 ≠ 语音唯一。
 *
 * ── 诚实说明 ───────────────────────────────────────────────
 * 1. 语音合成为浏览器内置能力，找不到中文语音时降级为字幕模式（界面会标出）。
 * 2. 语音识别能用则真、不能用则模拟，模拟结果在本子上如实标注「（原型模拟识别）」。
 * 3. 「说一句话 → 长出贴纸」在原型里是关键词匹配（sceneFor / matchOption），
 *    不是真 NLU。真实实现由 LLM 承担：从学生的自然表达里抽取兴趣、动机与表达风格。
 *
 * 保留的既有安全设计：不出现分数/排名/人格标签、起点题答完不给对错、
 * 「这段闲聊不是测评」的常驻声明、形象选择不做付费分层。
 */

type Line =
  | { k: 'ai'; text: string }
  | { k: 'me'; text: string; via?: 'voice' | 'typed'; simulated?: boolean }
  | { k: 'sticker'; title: string; body: string }

interface Props {
  roleId: string
  onPickRole: (id: string) => void
  onDone: () => void
}

/** 同桌对每个选择的反应，按选项下标取 */
const REACTIONS: Record<string, string[]> = {
  o2: [
    '行，你习惯先搭框架。那我按步骤来，每一步给你一个明确的落点，不让你悬着。',
    '明白，你更愿意把手里那件事做扎实。那我把任务切小一点，一次只给你一件。',
    '灵活型的。那我不给你排死顺序，往哪儿走你说了算。',
  ],
  o3: [
    '记住了。你卡住的时候我先不打断你，等你抬头我再说话。',
    '好。那卡太久我会主动说一句「先放着」，不用你开口。',
    '没关系，这很正常。我不拦你搜，但搜完我会问你一句：刚才是哪一步卡住的。',
  ],
  o4: [
    '那最好。我会多问你「为什么」，把原理讲透，不塞给你结论。',
    '实在。那我们把目标定清楚：考的题型优先，不绕远路，也不多留作业。',
    '懂。那说好 —— 学得怎么样我只跟你聊，不会变成打小报告的东西。',
  ],
}

/** 把学生写的一句话，接到一个具体的出题情境上（原型：关键词匹配，真跑由 LLM 做） */
function sceneFor(text: string): string | null {
  for (const k of Object.keys(interestContexts)) {
    if (text.includes(k)) return interestContexts[k]
  }
  return null
}

/**
 * 把学生说的一句话，对上他选的是哪张纸条（原型：字符重合度，真跑由 LLM 做）。
 * 对不上就落在第一张 —— 宁可保守，也不要猜错孩子说了什么。
 */
function matchOption(text: string, options: { label: string }[]): number {
  let best = 0
  let bestScore = 0
  options.forEach((o, i) => {
    let hit = 0
    for (const ch of o.label) if (text.includes(ch)) hit++
    const score = hit / Math.max(1, o.label.length)
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  })
  return bestScore >= 0.34 ? best : 0
}

export default function Onboarding({ roleId, onPickRole, onDone }: Props) {
  const [lines, setLines] = useState<Line[]>([])
  /** onboardSteps 的下标：0-3 闲聊，4 起点题，5 选形象 */
  const [stepIdx, setStepIdx] = useState(0)
  const [probeIdx, setProbeIdx] = useState(0)
  const [phase, setPhase] = useState<'busy' | 'waiting'>('busy')
  const [thinking, setThinking] = useState<string | null>(null)
  const [showCore, setShowCore] = useState(true)
  const [showProfile, setShowProfile] = useState(false)

  const { speak, stop, muted, setMuted, ttsReady } = useSpeech()
  const { listen } = useListening()

  const scrollRef = useRef<HTMLDivElement>(null)
  const runRef = useRef(0)
  const simIdx = useRef(0)
  const booted = useRef(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [lines, thinking])

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
    },
    [stop],
  )

  const alive = (id: number) => runRef.current === id

  const say = async (text: string, id: number) => {
    if (!alive(id)) return
    setLines(l => [...l, { k: 'ai', text }])
    await speak(text)
    if (!alive(id)) return
    await wait(300)
  }

  /** 开场：同桌先开口 */
  const intro = async () => {
    const id = ++runRef.current
    await say('嗨，我是你的新同桌。开学第一天，这本本子还是空的 —— 以后你和我都写在这儿。', id)
    await say(onboardSteps[0].ask, id)
    if (alive(id)) setPhase('waiting')
  }

  /** 问下一步 */
  const askStep = async (i: number, id: number) => {
    setStepIdx(i)
    const s = onboardSteps[i]
    if (s) {
      await say(s.ask, id)
      if (!alive(id)) return
      setPhase('waiting')
    }
  }

  const step = onboardSteps[stepIdx]
  const isSlipStep = stepIdx >= 1 && stepIdx <= 3

  /** 第 1 问（兴趣）。说 / 点 / 写三条通道都走这里 —— 对同桌来说是一样的。 */
  const onSayInterest = async (typed?: string) => {
    if (phase !== 'waiting' || stepIdx !== 0) return
    const id = runRef.current
    setPhase('busy')

    let text: string
    let simulated = false
    if (typed !== undefined) {
      text = typed.trim()
    } else {
      const opts = onboardSteps[0].options ?? [{ label: '打篮球' }]
      const r = await listen(opts[simIdx.current++ % opts.length].label)
      if (!alive(id)) return
      text = r.text.trim()
      simulated = !r.real
    }

    if (!text) {
      await say('没听清，你再说一遍？', id)
      if (alive(id)) setPhase('waiting')
      return
    }
    await recordInterest(text, typed === undefined ? 'voice' : 'typed', simulated, id)
  }

  /** 兴趣落成一张贴纸 —— 本屏最重要的一处 */
  const recordInterest = async (
    raw: string,
    via: 'voice' | 'typed',
    simulated: boolean,
    id: number,
  ) => {
    setLines(l => [...l, { k: 'me', text: raw.trim(), via, simulated }])
    setThinking('这一条会影响以后给你出什么情境的题，我记一下。')
    await wait(1000)
    if (!alive(id)) return
    setThinking(null)

    const scene = sceneFor(raw)
    setLines(l => [
      ...l,
      {
        k: 'sticker',
        title: raw.trim(),
        body: scene ? `以后物理题我尽量拿这个给你出：${scene}。` : '以后出题我尽量往这上面靠。',
      },
    ])
    await wait(620)
    await say(scene ? `记下了。以后物理题我尽量拿这个给你出：${scene}。` : '记下了。以后出题我尽量往这上面靠。', id)
    await askStep(1, id)
  }

  /** 第 2-4 问 · 学生这一轮说了什么 → 对上一张纸条 → 同桌给反应 */
  const onSaySlip = async (typed?: string) => {
    if (phase !== 'waiting' || !isSlipStep) return
    const id = runRef.current
    setPhase('busy')

    const opts = step.options ?? []
    if (!opts.length) return

    let text: string
    let simulated = false
    if (typed !== undefined) {
      text = typed.trim()
    } else {
      const r = await listen(opts[simIdx.current++ % opts.length].label)
      if (!alive(id)) return
      text = r.text.trim()
      simulated = !r.real
    }

    if (!text) {
      await say('没听清，你再说一遍？', id)
      if (alive(id)) setPhase('waiting')
      return
    }

    // 原样点了某张纸条就直接对上；否则按字面重合度猜（真跑由 LLM 做）
    const exact = opts.findIndex(o => o.label === text)
    const i = exact >= 0 ? exact : matchOption(text, opts)
    const echo = (opts[i] as { echo?: string }).echo
    setLines(l => [
      ...l,
      { k: 'me', text: echo ?? text, via: typed === undefined ? 'voice' : 'typed', simulated },
    ])

    await say(REACTIONS[step.id]?.[i] ?? '记下了。', id)
    await askStep(stepIdx + 1, id)
  }

  /** 起点题：答完不给对错、不打分 —— 这一步只用来定起点。刻意保留纸面点选，不走语音。 */
  const pickProbe = async (i: number) => {
    if (phase !== 'waiting') return
    const id = runRef.current
    setPhase('busy')
    const p = startProbes[probeIdx]
    setLines(l => [...l, { k: 'me', text: p.choices[i] }])
    await wait(520)
    if (!alive(id)) return

    if (probeIdx < startProbes.length - 1) {
      setProbeIdx(x => x + 1)
      setPhase('waiting')
      return
    }
    await say('行，我心里有数了 —— 你从哪儿开始，我知道该往哪儿使劲了。', id)
    await askStep(5, id)
  }

  if (showProfile) return <ProfilePage roleId={roleId} onDone={onDone} />

  const firstAi = lines.findIndex(l => l.k === 'ai')

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#f4f7fb]">
      {/* 原型开关：把「趣味外壳」下面的科学内核显式露出来，产品内不存在这个开关 */}
      <div className="shrink-0 bg-white px-4 pt-2 pb-1.5 flex items-center gap-2">
        <span className="text-[12px] text-ink-400">开学第一天 · 认识新同桌</span>
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
        <button
          onClick={() => setShowCore(v => !v)}
          className={`tap chip text-[11px] ${
            showCore ? 'bg-warm-50 text-warm-700 border border-warm-200' : 'bg-ink-100 text-ink-500'
          }`}
        >
          {showCore ? '正在显示科学内核' : '只看学生视角'}
        </button>
      </div>

      {/* 同桌身份条：和首页同一套 */}
      <div className="shrink-0 bg-gradient-to-b from-white to-[#eaf2fb] px-4 pt-1.5 pb-2 border-b border-ink-100/70 flex items-center gap-2.5">
        <ClassmateAvatar mood={thinking ? 'thinking' : phase === 'busy' ? 'explaining' : 'listening'} size={38} roleId={roleId} />
        <span className="text-[14px] font-bold text-ink-900">你的同桌</span>
        <span className="chip bg-brand-50 text-brand-700 text-[10.5px]">
          {avatarRoles.find(r => r.id === roleId)?.name}
        </span>
        <span className="ml-auto text-[11.5px] text-ink-400 truncate">
          {thinking ? '正在记…' : phase === 'busy' ? '正在说…' : '第一次见面'}
        </span>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 scroll-area px-3 py-3">
        <div className="mx-auto max-w-[360px] bg-white rounded-2xl shadow-card border border-ink-100 relative overflow-hidden">
          {/* 左红线 + 横线：和首页、辅导页同一本本子 */}
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
              <PageLine key={i} line={l} first={i === firstAi} />
            ))}

            {thinking && (
              <div className="animate-fadeUp">
                <div className="flex items-center gap-1 text-[10.5px] text-warm-700 font-semibold mb-1">
                  <IconSpark className="w-3 h-3" />
                  同桌想了一下
                </div>
                <div className="text-[13px] leading-[1.85] text-ink-500 italic">{thinking}</div>
              </div>
            )}

            {/* 科学内核标注：原型可视化，产品内不展示 */}
            {showCore && step?.measures && phase === 'waiting' && <CoreNote text={step.measures} />}

            {/* ── 第 1-4 问：说 / 点 / 写三条等价通道 ─────────────
                纸条收进面板里了：默认屏幕上只有一个麦克风，"谈到什么才出现什么"没破 */}
            {stepIdx <= 3 && (
              <div className="pt-3 border-t border-dashed border-ink-200/80">
                <TalkButton
                  onSay={stepIdx === 0 ? onSayInterest : onSaySlip}
                  disabled={phase !== 'waiting'}
                  suggestions={
                    stepIdx === 0
                      ? (onboardSteps[0].options ?? []).map(o => o.label)
                      : (step.options ?? []).map(o => o.label)
                  }
                />
              </div>
            )}

            {/* ── 起点题：题目写在本子上，答完不给对错 ───────────
                这一步刻意不用语音：语音适合表达意图，不适合表达算式。 */}
            {stepIdx === 4 && (
              <div className="pt-1">
                <SketchFrame stroke="#8ecdff" fill="#f7fbff" rotate="-rotate-[.6deg]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="chip bg-white text-brand-700 text-[11px] border border-brand-100">
                      {startProbes[probeIdx].subject}
                    </span>
                    <span className="text-[11.5px] text-ink-400">
                      第 {probeIdx + 1} / {startProbes.length} 道
                    </span>
                  </div>
                  <p className="text-[14px] text-ink-900 leading-[1.85]">{startProbes[probeIdx].question}</p>
                </SketchFrame>
                {phase === 'waiting' && (
                  <>
                    <Slips
                      items={startProbes[probeIdx].choices.map(c => ({ label: c }))}
                      onPick={(_l, _e, i) => pickProbe(i)}
                      hint="这道题点一下就行，不用念出来 ——"
                    />
                    <p className="text-[11.5px] text-ink-400 mt-1.5">
                      答完不给对错、不打分 —— 这一步只用来定起点。
                    </p>
                  </>
                )}
              </div>
            )}

            {/* ── 选形象：8 张贴纸，换外壳不换内核 ─────────────── */}
            {stepIdx === 5 && (
              <div className="pt-1">
                <div className="grid grid-cols-4 gap-2">
                  {avatarRoles.map(r => (
                    <button
                      key={r.id}
                      onClick={() => onPickRole(r.id)}
                      className={`tap flex-col gap-1 rounded-2xl border-2 py-2 transition ${
                        roleId === r.id ? 'border-brand-500 bg-brand-50' : 'border-ink-100 bg-white'
                      }`}
                    >
                      <ClassmateAvatar mood="listening" size={40} roleId={r.id} />
                      <span className="text-[11.5px] font-semibold text-ink-800">{r.name}</span>
                      <span className="text-[10px] text-ink-400 leading-tight">{r.style}</span>
                    </button>
                  ))}
                </div>
                <div className="rounded-xl bg-brand-50 border border-brand-100 px-3 py-2 mt-2.5">
                  <p className="text-[11.5px] text-brand-700 leading-relaxed">
                    换形象只换外壳。8 个形象背后是同一套引导逻辑、同一份学情数据，随时能换回来。
                  </p>
                </div>
                <button onClick={() => setShowProfile(true)} className="btn-primary w-full h-12 text-[15px] mt-3">
                  就是你了，走吧
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-[360px] pt-2.5">
          <div className="rounded-xl bg-cheer-50 border border-cheer-100 px-3 py-2 flex gap-2">
            <IconShield className="w-3.5 h-3.5 text-cheer-600 shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-cheer-700 leading-relaxed">
              这段闲聊不是测评，没有分数，也不会给你贴任何性格标签。你随时可以跳过任何一句。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 同桌推过来的纸条：纸上的选项，不是控件。选一张，纸就变成「你说的」那行字。 */
function Slips({
  items,
  onPick,
  hint,
}: {
  items: { label: string; echo?: string }[]
  onPick: (label: string, echo: string | undefined, i: number) => void
  hint: string
}) {
  return (
    <div className="pt-2.5">
      {hint && <div className="text-[11px] text-ink-400 mb-1.5">{hint}</div>}
      <div className="flex flex-wrap gap-1.5">
        {items.map((o, i) => (
          <button
            key={o.label}
            onClick={() => onPick(o.label, o.echo, i)}
            className={`tap rounded-lg border border-dashed border-ink-200 bg-[#fffdf5] px-3 text-[13px] text-ink-700 hover:border-brand-300 hover:text-brand-700 transition ${
              i % 2 ? 'rotate-[.7deg]' : '-rotate-[.9deg]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** 本子里的一行 */
function PageLine({ line, first }: { line: Line; first: boolean }) {
  if (line.k === 'me') {
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

  if (line.k === 'sticker') {
    return (
      <SketchFrame stroke="#e8bf32" fill="#fffbe0" rotate="-rotate-[1.1deg]">
        <div className="text-[10px] font-bold text-warm-700 mb-1">同桌贴上来的一张</div>
        <div className="text-[14.5px] font-bold text-ink-900">{line.title}</div>
        <p className="text-[12.5px] text-ink-600 leading-relaxed mt-1">{line.body}</p>
      </SketchFrame>
    )
  }

  return (
    <div className="animate-fadeUp">
      {/* 只在第一次标注说话人 */}
      {first && (
        <div className="text-[10.5px] text-brand-600 mb-1 flex items-center gap-1 font-semibold">
          <span className="w-1 h-1 rounded-full bg-brand-500" />
          同学说
        </div>
      )}
      <div className="text-[14.5px] leading-[1.85] text-ink-900">
        <Handwrite text={line.text} />
      </div>
    </div>
  )
}

/** 科学内核标注：原型可视化用，产品内不展示 */
function CoreNote({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-warm-50 border border-dashed border-warm-200 px-3 py-2">
      <div className="text-[10.5px] font-bold text-warm-700 mb-0.5">科学内核（学生看不到）</div>
      <p className="text-[11.5px] text-warm-700/90 leading-relaxed">{text}</p>
    </div>
  )
}

/**
 * 本子背面 · 画像 V0
 *
 * 明确标注为「原型可视化」：产品里学生看不到这一页，
 * 它的作用是把「趣味外壳下面的科学内核」摊给评审看。全部内容沿用原稿，未删改。
 */
function ProfilePage({ roleId, onDone }: { roleId: string; onDone: () => void }) {
  const role = avatarRoles.find(r => r.id === roleId)
  return (
    <div className="flex-1 min-h-0 scroll-area bg-ink-50 px-4 py-4 space-y-3.5">
      <div className="rounded-2xl bg-warm-50 border border-dashed border-warm-200 px-3.5 py-2.5">
        <div className="text-[11px] font-bold text-warm-700">本子背面 · 原型可视化</div>
        <p className="text-[11.5px] text-warm-700/90 leading-relaxed mt-0.5">
          这一页学生在产品里看不到。它是把冷启动这一分钟「实际采集到了什么」摊开给评审看的。
        </p>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <ClassmateAvatar mood="happy" size={56} roleId={roleId} className="shrink-0" />
        <div className="min-w-0">
          <div className="text-[16px] font-bold text-ink-900">认识完了，我是{role?.name}</div>
          <p className="text-[12.5px] text-ink-500 leading-relaxed mt-0.5">
            以后你的数学和物理，我陪你一起弄。
          </p>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <IconSpark className="w-4 h-4 text-brand-600" />
          <h3 className="text-[15px] font-bold text-ink-900">画像 V0（系统侧，学生不可见）</h3>
        </div>

        <div className="space-y-2 mb-3">
          {profileV0.traits.map(t => (
            <div key={t.name} className="rounded-xl bg-ink-50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-ink-800">{t.name}</span>
                <span className="chip bg-white text-ink-500 text-[11px]">{t.level}</span>
              </div>
              <p className="text-[12px] text-ink-500 leading-relaxed mt-1">用于：{t.usedFor}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-brand-50 px-3 py-2.5 mb-2">
          <div className="text-[12.5px] font-bold text-brand-700 mb-0.5">学习动机</div>
          <p className="text-[12px] text-brand-700/90 leading-relaxed">{profileV0.motivation}</p>
        </div>

        <div className="rounded-xl bg-warm-50 px-3 py-2.5 mb-2">
          <div className="text-[12.5px] font-bold text-warm-700 mb-1">兴趣爱好 → 出题情境素材库</div>
          <div className="flex gap-1.5 flex-wrap">
            {profileV0.interests.map(i => (
              <span key={i} className="chip bg-white text-warm-700 text-[11.5px]">
                {i}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          {profileV0.startPoint.map(s => (
            <div key={s.subject} className="rounded-xl bg-ink-50 px-3 py-2">
              <div className="text-[12.5px] text-ink-800">
                <span className="font-semibold">{s.subject}</span> · {s.level}
              </div>
              <p className="text-[11.5px] text-ink-400 mt-0.5">依据：{s.basis}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-[15px] font-bold text-ink-900 mb-2.5">画像不是一次问出来的</h3>
        <div className="space-y-2">
          {profileTimeline.map(t => (
            <div key={t.when} className="flex gap-2.5">
              <span className="chip bg-brand-50 text-brand-700 text-[11px] shrink-0 h-fit">{t.when}</span>
              <p className="text-[12.5px] text-ink-600 leading-relaxed">{t.what}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-cheer-50 border border-cheer-100 p-4 flex gap-2.5">
        <IconCheck className="w-4 h-4 text-cheer-600 shrink-0 mt-0.5" />
        <p className="text-[12.5px] text-cheer-700 leading-relaxed">
          大五人格只用来适配「怎么陪你学」（节奏、反馈密度、题目情境），不会以「你是什么样的人」形式输出给你或家长。
        </p>
      </div>

      <button onClick={onDone} className="btn-primary w-full h-12 text-[15px]">
        进教室，开始学
      </button>
    </div>
  )
}
