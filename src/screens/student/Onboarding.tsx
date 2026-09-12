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
import {
  IconShield,
  IconCheck,
  IconSpark,
  IconSound,
  IconSoundOff,
  IconBook,
} from '@/components/common/Icons'

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
 * 所以主路径是**同桌出声说，孩子按住说话答**，打字只是兜底。
 *
 * ── 这一版的三件事：把「它在记住我」变成看得见的东西 ─────────
 *
 * ① 同桌先猜，你来纠正（GUESSES 表）
 *    第一句不是提问，是同桌瞎猜一个 —— 学生纠正它。从第二句起，
 *    每一次猜测都先说出依据：「因为你刚才说「打篮球」，那我往下猜：…」。
 *    依据是真的（memRef 里存着学生说过的原话），所以猜测会明显变准。
 *    猜中/猜偏都摊开说，还写在小本子上 —— 偏了不藏，这是「容错」那一套的前身。
 *    ⚠️ 这里有一条底线：猜的是**行为和偏好**，不是「你是什么样的人」。
 *    学生随时可以纠正，纠正永远有效。
 *
 * ② 你说的话，当场变成一道题（SPOT_QUESTIONS + askSpot / pickSpot）
 *    学生说出兴趣 → 同桌立刻把这个兴趣织进一道初中物理题，写在本子上问出来。
 *    第一次体验是「我说的话直接变成了一道题」，而不是「填了个兴趣标签」。
 *    情境句取自 interestContexts（和辅导页的变式题、画像页的素材库同一份），
 *    起点诊断的物理那一半就藏在这道题里 —— 顺手看出来的，不是另外考的。
 *    答完给反馈，但不打分、不盖对错的章：说对了确认他想得对，想偏了换个角度带一遍。
 *
 * ③ 旁边有个小本子，一条条累积（notes）
 *    同桌观察到的每一件事都落到本子上，学生全程看得见它长出来。
 *    冷启动结束时，这一页就是首页那本本子的**前一页** —— 不是两份数据，
 *    是同一本本子翻过去：明天打开首页，接着这一页往下写。
 *
 * ── 一处刻意的例外：做题那两步不给语音 ───────────────────────
 * 语音适合表达**意图**（"我想练两道题"），不适合表达**判断**（"读数等于电源电压的那只"）。
 * 起点诊断和当场出的那道题都是纸面点选 —— 全语音会把能做的孩子挡在门外。
 * 这不是没做完，是判断：语音优先 ≠ 语音唯一。
 *
 * ── 诚实说明 ───────────────────────────────────────────────
 * 1. 语音合成为浏览器内置能力，找不到中文语音时降级为字幕模式（界面会标出）。
 * 2. 语音识别能用则真、不能用则模拟，模拟结果在本子上如实标注「（原型模拟识别）」。
 * 3. 「说一句话 → 长出贴纸/变成一道题」在原型里是关键词匹配（resolveInterest / matchOption），
 *    不是真 NLU。猜测也是查表（GUESSES），不是模型推的。
 *    真实实现由 LLM 承担：从学生的自然表达里抽取兴趣、动机、表达风格，并现场生成猜测与题目。
 *
 * 保留的既有安全设计：不出现分数/排名/人格标签、起点题答完不给对错、
 * 「这段闲聊不是测评」的常驻声明、形象选择不做付费分层。
 */

type Line =
  | { k: 'ai'; text: string }
  | { k: 'me'; text: string; via?: 'voice' | 'typed'; simulated?: boolean }
  /** 学生说的那句话，当场变成的一道题 —— 写在本子上，纸面点选（见本文件顶部 ②） */
  | { k: 'spot'; q: SpotQuestion; picked: number | null }

/** 同桌记住的一件事。学生说过的原话存这儿，「因为你刚才说…」就是从这儿拼出来的 */
interface Memory {
  /** 本子上的简写（打篮球），用来拼依据那句话 */
  short: string
  /** 学生说的原话（我周末打篮球） */
  text: string
  /** 落在哪个兴趣上（篮球/游戏/动漫/休息），没对上就是 null */
  tag: string | null
}

/** 小本子上的一行 */
interface Note {
  /** 猜＝同桌的猜测；题＝当场出的那道题；观察＝学生这一句里看见的事 */
  kind: '猜' | '题' | '观察'
  text: string
  /** 只对「猜」有意义：这一猜中没中 —— 这是**同桌自己的成绩**，不是学生的分 */
  hit?: boolean
}

/** 当场出的那道题（原型：四个兴趣各一道，写死在下面；真跑由 LLM 现场生成） */
interface SpotQuestion {
  id: string
  tag: string
  /** 情境句，直接取自 interestContexts —— 和辅导页、画像页共用一份素材 */
  scene: string
  question: string
  choices: string[]
  answerIndex: number
  /** 答到点子上怎么接（确认他想得对，不盖章、不给分） */
  right: string
  /** 想偏了怎么递台阶（也不判错，换个角度再走一遍） */
  off: string
  /** 小本子上记的那一行 */
  noteHit: string
  noteOff: string
}

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

/**
 * 同桌的猜测表 —— 这一屏最要紧的一张表（见本文件顶部 ①）。
 *
 * pick  = 猜学生选第几个。**下标必须和 mockData 里那一步 options 的顺序对上**，改一边要改两边。
 * short = 写在小本子上的简写；嘴上说的是 mockData 里的 ask，两者讲的是同一个猜测。
 * why   = 猜之前先摆依据。第一步没有依据（老实说「硬猜」），
 *         从第二步起依据就是学生上一句的原话 —— 「它在记住我」是这么被看见的。
 *
 * 「越猜越准」是怎么做出来的：
 * 第 1 猜是 4 选 1 的硬猜；后面三猜都押在多数人会选的那一项上（自己那份 / 先跳过 / 考试要考），
 * 同时把依据一句一句摆出来。所以命中率确实比第一句高，学生也看得见为什么高。
 * 这不是把学生往框里塞 —— 猜错了当场认账，纠正永远有效，本子上还留着「猜偏」两个字。
 *
 * 原型里这张表是写死的。真跑由 LLM 依据已有画像和这段对话现场生成猜测，
 * 依据也由它组织成话 —— 但「先说依据再猜」这个形式不能省，省了就退化成查户口。
 */
const GUESSES: Record<string, { pick: number; short: string; why: (m: Memory[]) => string }> = {
  o1: {
    pick: 3,
    short: '你在家躺着刷手机',
    why: () => '先不问你，我先猜 —— 我手上一条线索都没有，硬猜一个：',
  },
  o2: {
    pick: 1,
    short: '你做自己那份就行',
    // 第一句引用学生**原话**（听起来最像「我在听你说话」），后面几句用简写，不然一句话拖太长
    why: m => `因为你刚才说「${m[0]?.text ?? '你周末有事干'}」，那我往下猜：`,
  },
  o3: {
    pick: 1,
    short: '你先跳过、回头再看',
    why: m =>
      `你说你「${m[0]?.short ?? '有事干'}」，又是「${m[1]?.short ?? '自己做自己那份'}」的那种 —— 两句放一起，我猜：`,
  },
  o4: {
    pick: 1,
    short: '你为了考试才学',
    why: m => `「${m.map(x => x.short).join('」「')}」—— 三句我都记着，这次我押一个：`,
  },
}

/** 每一步在小本子上落成哪一行观察 */
const NOTE_LABEL: Record<string, string> = {
  o1: '周末',
  o2: '小组作业',
  o3: '卡住十分钟',
  o4: '学数理',
}

/** 猜中 / 猜偏怎么交代。第一句是瞎猜的，后面几句是按学生说过的话推的，说法要分开 */
const VERDICT_HIT_FIRST = '哟，头一句就蒙对了 —— 不过这回是运气，我手上一点线索都没有。'
const VERDICT_MISS_FIRST = '猜偏了，正常，我手上一条线索都没有。你纠正我这一句，比我自己猜十次都管用。'
const VERDICT_HIT = '猜中了。你发现没有 —— 我这几句比第一句准了，因为你把该说的都说了。'
const VERDICT_MISS = '又偏了。没事，你纠正一句，我就少猜一次。'

/** 兴趣关键词兜底：学生说「在家躺着」时，也要能落到「休息」这个情境上 */
const INTEREST_WORDS: { tag: string; words: string[] }[] = [
  { tag: '篮球', words: ['篮球', '打球', '球场'] },
  { tag: '游戏', words: ['游戏', '开黑', '手游'] },
  { tag: '动漫', words: ['动漫', '动画', '漫画', '画画'] },
  { tag: '休息', words: ['休息', '躺着', '睡觉', '宅', '刷手机', '发呆'] },
]

/**
 * 当场出的那几道题（见本文件顶部 ②）。
 *
 * 四道题考的是同一个知识点的四个侧面，不是同一道题换四个壳：
 * 篮球 → 判断故障类型；游戏 → 用电压表找断点；动漫 → 开关装在哪儿；
 * 休息 → 多串一个用电器会怎样。
 * 难度都压在「串联只有一条路」这一条上 —— 这是产品主线（串联电路故障分析）的起点，
 * 也是后面起点题、辅导页的入口。
 */
const SPOT_QUESTIONS: Record<string, Omit<SpotQuestion, 'id' | 'tag' | 'scene'>> = {
  篮球: {
    question: '那排灯是一根线串起来的。校队打到一半，整排灯忽然全灭了 —— 你觉得最可能是怎么回事？',
    choices: ['线路上有一处断开了', '其中一只灯泡烧了，其他几只还会亮', '灯用久了，会一起慢慢变暗'],
    answerIndex: 0,
    right: '对 —— 只有一条路，任何一处断，整排都不通。这句是你自己想出来的，我只帮你确认了一下。',
    off: '这个想法很常见。不过你再看一眼：它们只有一条路可走 —— 一只坏了，那条路就断了，所以整排一起灭。这就是串联。',
    noteHit: '记分牌那道：他一口说出「线路上有一处断了」',
    noteOff: '记分牌那道：他先想到「灯泡烧了」——下次从「只有一条路」讲起',
  },
  游戏: {
    question: '那排指示灯也是一根线串起来的。整排都不亮了，你手上只有一个电压表 —— 测到哪一只的时候，读数会等于电源电压？',
    choices: ['断开的那一只', '完好的那一只', '电阻最大的那一只'],
    answerIndex: 0,
    right: '对，就是断掉的那只 —— 电压表「隔着」它，量到的其实是电源两端的电压。这一招用来找断点特别好使。',
    off: '换个角度记：完好的那只，电流顺顺当当通过了，它两端几乎没有电压差；断掉的地方，电压才全落在它身上。所以读数等于电源电压的那只，才是断的。',
    noteHit: '手柄灯那题：他说读数在断开的那只上',
    noteOff: '手柄灯那题：电压表和断点的关系，我换了个角度讲了一遍',
  },
  动漫: {
    question: '这串装饰灯的开关，装在整串灯的最末端（离电源最远的那一头）。它还能一次关掉整串灯吗？',
    choices: ['能，开关装在哪儿都一样', '不能，必须装在电源正极那一头', '只能关掉它后面那几盏'],
    answerIndex: 0,
    right: '对。串联只有一条路，开关掐在哪一段，掐的都是同一条路 —— 装在哪儿都一样。',
    off: '跟着那条路走一遍：电流从电源出来，一盏一盏经过，再回到电源。开关装在末端，掐的还是同一条路 —— 所以整串一起灭。',
    noteHit: '手办柜灯串：他说开关装哪儿都能关整串',
    noteOff: '手办柜灯串：开关位置那道，我们沿着同一条路走了一遍',
  },
  休息: {
    question: '这串小夜灯是串联的，你想再串一盏进去，凑够五盏 —— 串进去之后，原来那几盏会怎样？',
    choices: ['比原来暗一点', '比原来亮一点', '一点不变'],
    answerIndex: 0,
    right: '对。多了一盏要分电压，每盏分到的就少了，所以暗一点 —— 串联里谁也别想多占。',
    off: '多串一盏，等于这条路上又多了一个分电压的 —— 每盏分到的少了，自然暗一点。要是各走各的路（并联），那才会互不影响。',
    noteHit: '小夜灯那道：他说再串一盏会「暗一点」',
    noteOff: '小夜灯那道：串联里多一个用电器会怎样，我们捋了一遍',
  },
}

/**
 * 字面重合度：原型里用这个判断学生说的是哪一句（真跑由 LLM 做）。
 * 返回命中的下标和分数，分数交给调用方决定「算不算对上」。
 */
function matchBest(text: string, options: { label: string }[]): { i: number; score: number } {
  let bi = 0
  let bs = 0
  options.forEach((o, i) => {
    let hit = 0
    for (const ch of o.label) if (text.includes(ch)) hit++
    const score = hit / Math.max(1, o.label.length)
    if (score > bs) {
      bs = score
      bi = i
    }
  })
  return { i: bi, score: bs }
}

/**
 * 把学生说的一句话，对上他说的是哪一张纸条。
 * 对不上就落在第一张 —— 宁可保守，也不要猜错孩子说了什么。
 */
function matchOption(text: string, options: { label: string }[]): number {
  const r = matchBest(text, options)
  return r.score >= 0.34 ? r.i : 0
}

/**
 * 学生那句话，落在哪个兴趣上（原型：先对纸条，再兜底关键词，真跑由 LLM 做）。
 * echo 是写给本子的那句话 —— 纠正的话（「猜错了，我打球」）不进本子，
 * 本子上只留他真正的意思（「我周末打篮球」）。
 */
function resolveInterest(
  text: string,
  options: { label: string; echo?: string; tag?: string }[],
): { i: number | null; tag: string | null; echo: string } {
  const r = matchBest(text, options)
  if (r.score >= 0.34) {
    return { i: r.i, tag: options[r.i].tag ?? null, echo: options[r.i].echo ?? text.trim() }
  }
  for (const k of Object.keys(interestContexts)) {
    if (text.includes(k)) return { i: null, tag: k, echo: text.trim() }
  }
  for (const g of INTEREST_WORDS) {
    if (g.words.some(w => text.includes(w))) return { i: null, tag: g.tag, echo: text.trim() }
  }
  return { i: null, tag: null, echo: text.trim() }
}

/** 情境句：学生说一句话 → 接到一个具体的出题情境上（和辅导页共用 interestContexts） */
function sceneFor(tag: string | null): string | null {
  return tag ? (interestContexts[tag] ?? null) : null
}

/** 拼出当场要出的那道题；这个兴趣没有现成的题就返回 null（不硬编一道来凑） */
function spotFor(tag: string | null): SpotQuestion | null {
  const scene = sceneFor(tag)
  const q = tag ? SPOT_QUESTIONS[tag] : undefined
  if (!tag || !scene || !q) return null
  return { id: tag, tag, scene, ...q }
}

/**
 * 本子上记的简写：把「我周末打篮球」缩成「打篮球」。
 * 原型里就这一条去掉句首「我…」的土办法，真跑由 LLM 归纳。
 */
function shortOf(text: string, max = 12): string {
  const t = text.replace(/^我(周末|平时|一般)?/, '').replace(/^[，,、\s]+/, '')
  return t.length > max ? `${t.slice(0, max)}…` : t
}

export default function Onboarding({ roleId, onPickRole, onDone }: Props) {
  const [lines, setLines] = useState<Line[]>([])
  /** onboardSteps 的下标：0-3 同桌先猜，4 起点题，5 选形象 */
  const [stepIdx, setStepIdx] = useState(0)
  const [probeIdx, setProbeIdx] = useState(0)
  const [phase, setPhase] = useState<'busy' | 'waiting'>('busy')
  const [thinking, setThinking] = useState<string | null>(null)
  const [showCore, setShowCore] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  /** 小本子上已经落下的行 —— 冷启动结束时，它就是首页那本的前一页 */
  const [notes, setNotes] = useState<Note[]>([])
  const [noteOpen, setNoteOpen] = useState(false)

  const { speak, stop, muted, setMuted, ttsReady } = useSpeech()
  const { listen } = useListening()

  const scrollRef = useRef<HTMLDivElement>(null)
  const runRef = useRef(0)
  const simIdx = useRef(0)
  const booted = useRef(false)
  /**
   * 同桌记住的东西（学生说过的原话）。用 ref 不用 state：
   * 「因为你刚才说…」是在异步流程里拼的，state 会读到旧值。
   */
  const memRef = useRef<Memory[]>([])
  /** 这一步猜的是第几个选项；同样要在异步里读，所以用 ref */
  const guessRef = useRef<number | null>(null)
  /** 猜中了几次 —— 收尾时如实说出来，不吹 */
  const hitRef = useRef(0)

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

  /** 本子上落一行 */
  const addNote = (n: Note) => setNotes(l => [...l, n])

  /** 开场：同桌先开口，然后直接抛第一个猜测（不是第一个问题） */
  const intro = async () => {
    const id = ++runRef.current
    await say('嗨，我是你的新同桌。开学第一天，这本本子还是空的 —— 以后你和我都写在这儿。', id)
    await askGuess(0, id)
  }

  /**
   * ① 同桌先猜：先摆依据，再说猜测，然后等学生纠正。
   * 第 1~4 步都走这儿；第 5 步（起点题）和第 6 步（选形象）才是真在问。
   */
  const askGuess = async (i: number, id: number) => {
    const s = onboardSteps[i]
    const g = s ? GUESSES[s.id] : undefined
    if (!s || !g) return
    setStepIdx(i)
    guessRef.current = g.pick
    await say(`${g.why(memRef.current)}${s.ask}`, id)
    if (!alive(id)) return
    setPhase('waiting')
  }

  /** 问下一步（起点题 / 选形象这两步用） */
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

  /** 第 1 猜（兴趣）：学生纠正 → 本子记两行 → 这句话当场变成一道题（②） */
  const onSayInterest = async (typed?: string) => {
    if (phase !== 'waiting' || stepIdx !== 0) return
    const id = runRef.current
    setPhase('busy')

    let text: string
    let simulated = false
    if (typed !== undefined) {
      text = typed.trim()
    } else {
      const opts = onboardSteps[0].options ?? [{ label: '猜错了，我打球' }]
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

    const opts = onboardSteps[0].options ?? []
    const res = resolveInterest(text, opts)
    const said = res.echo
    setLines(l => [
      ...l,
      { k: 'me', text: said, via: typed === undefined ? 'voice' : 'typed', simulated },
    ])

    // 本子上先记同桌这一猜中没中 —— 偏了也照写，不藏
    const hit = res.i !== null && res.i === guessRef.current
    if (hit) hitRef.current++
    addNote({ kind: '猜', text: `猜「${GUESSES.o1.short}」`, hit })
    addNote({ kind: '观察', text: `周末：${shortOf(said)}` })
    memRef.current = [...memRef.current, { short: shortOf(said), text: said, tag: res.tag }]

    setThinking('这一句正好能出一道题 —— 我先把情境记下来。')
    await wait(900)
    if (!alive(id)) return
    setThinking(null)

    await say(hit ? VERDICT_HIT_FIRST : VERDICT_MISS_FIRST, id)

    // ② 你说的话，当场变成一道题
    const q = spotFor(res.tag)
    if (!q) {
      await say('这句我先记下了 —— 手上还没有现成的题能拿它出，等有了，我第一个拿它给你出。', id)
      await askGuess(1, id)
      return
    }
    await say('那我现在就用你这句话出一道题 —— 就写在你旁边这本本子上。', id)
    if (!alive(id)) return
    setLines(l => [...l, { k: 'spot', q, picked: null }])
    if (alive(id)) setPhase('waiting')
  }

  /** ② 学生答这道当场出的题：给反馈，但不打分、不盖对错的章 */
  const pickSpot = async (q: SpotQuestion, i: number) => {
    if (phase !== 'waiting') return
    const id = runRef.current
    setPhase('busy')
    setLines(l => l.map((x): Line => (x.k === 'spot' && x.q.id === q.id ? { ...x, picked: i } : x)))
    setLines(l => [...l, { k: 'me', text: q.choices[i] }])
    await wait(420)
    if (!alive(id)) return

    const ok = i === q.answerIndex
    addNote({ kind: '题', text: ok ? q.noteHit : q.noteOff })
    await say(ok ? q.right : q.off, id)
    await askGuess(1, id)
  }

  /** 第 2-4 猜：学生纠正 → 同桌认账 → 本子记两行 → 下一步 */
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
    const said = echo ?? text
    setLines(l => [
      ...l,
      { k: 'me', text: said, via: typed === undefined ? 'voice' : 'typed', simulated },
    ])

    // 猜中没中照样摊开说；本子上再记一行「这一句里看见了什么」
    const g = GUESSES[step.id]
    const hit = i === guessRef.current
    if (hit) hitRef.current++
    addNote({ kind: '猜', text: `猜「${g.short}」`, hit })
    const label = NOTE_LABEL[step.id] ?? '这一句'
    const short = shortOf(said)
    // 学生那句话本身就带上了类别（「小组作业我来安排」）就别再加前缀，省得本子上读起来像复读
    addNote({ kind: '观察', text: short.startsWith(label) ? short : `${label}：${short}` })
    memRef.current = [...memRef.current, { short: shortOf(said), text: said, tag: null }]

    await say(hit ? (stepIdx === 1 ? VERDICT_HIT_FIRST : VERDICT_HIT) : stepIdx === 1 ? VERDICT_MISS_FIRST : VERDICT_MISS, id)
    await say(REACTIONS[step.id]?.[i] ?? '记下了。', id)

    // 四句猜完，把「它越猜越准」这件事用事实说出来 —— 不是夸，是把机制摊给学生看
    if (stepIdx === 3) {
      await say(
        hitRef.current >= 2
          ? `刚才我猜了 4 次，中了 ${hitRef.current} 次。头一句是硬猜的，后面几句是拿你说过的话推的 —— 这本子越厚，我猜得越准。`
          : `刚才我猜了 4 次，只中了 ${hitRef.current} 次。不过你每纠正我一句，这本子就多一行 —— 下一句我就能少猜一次。`,
        id,
      )
    }

    const next = stepIdx + 1
    if (next <= 3) await askGuess(next, id)
    else await askStep(next, id)
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
    addNote({ kind: '观察', text: '两道起点题做完了 —— 我没记对错' })
    await say('行，我心里有数了 —— 你从哪儿开始，我知道该往哪儿使劲了。', id)
    await askStep(5, id)
  }

  if (showProfile) return <ProfilePage roleId={roleId} notes={notes} onDone={onDone} />

  const firstAi = lines.findIndex(l => l.k === 'ai')
  /** 当场出的题还等着答：这时候麦克风先收起来，让学生在本子上点 */
  const spotPending = lines.some(l => l.k === 'spot' && l.picked === null)

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

      {/* ③ 同桌的小本子：一条条累积，学生全程看得见它长出来。
          冷启动结束时，这一页就是首页那本本子的前一页（见 ProfilePage 里的那一页） */}
      <LittleNotebook notes={notes} open={noteOpen} onToggle={() => setNoteOpen(v => !v)} />

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
              <PageLine
                key={i}
                line={l}
                first={i === firstAi}
                pickable={phase === 'waiting'}
                onPickSpot={pickSpot}
              />
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

            {/* ── 第 1-4 猜：说 / 点 / 写三条等价通道 ─────────────
                纸条收进面板里了：默认屏幕上只有一个麦克风，"谈到什么才出现什么"没破。
                当场出的那道题等着答的时候，麦克风先收起来 —— 那一步在本子上点。 */}
            {stepIdx <= 3 && (
              <div className="pt-3 border-t border-dashed border-ink-200/80">
                <TalkButton
                  onSay={stepIdx === 0 ? onSayInterest : onSaySlip}
                  disabled={phase !== 'waiting' || spotPending}
                  hint={spotPending ? '这道题在本子上点一下就行' : '按住说话'}
                  suggestions={
                    stepIdx === 0
                      ? (onboardSteps[0].options ?? []).map(o => o.label)
                      : (step.options ?? []).map(o => o.label)
                  }
                />
              </div>
            )}

            {/* ── 起点题：题目写在本子上，答完不给对错 ───────────
                这一步刻意不用语音：语音适合表达意图，不适合表达判断。 */}
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
                      onClick={() => {
                        onPickRole(r.id)
                        addNote({ kind: '观察', text: `形象挑了「${r.name}」` })
                      }}
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

/**
 * 同桌的小本子（见本文件顶部 ③）
 *
 * 它一直挂在本子上面，一行一行往上长：同桌观察到的每一件事都写在这儿，
 * 学生不用等总结，当场就能看见「它记住了什么」。
 * 折起来只露最后一行（写满一页的感觉还在），点一下摊开看全部。
 * 「写了 N 行」数的是本子，不是学生的成绩 —— 这里没有进度、没有评分。
 */
function LittleNotebook({
  notes,
  open,
  onToggle,
}: {
  notes: Note[]
  open: boolean
  onToggle: () => void
}) {
  /* 折起来露最后两行（一步落两行，刚好看得见「猜中/猜偏」和它看见的那件事）；
     下标一起带着当 key 用 —— 同一句话可能出现两次 */
  const shown = open
    ? notes.map((n, i) => ({ n, i }))
    : notes.slice(-2).map((n, i) => ({ n, i: notes.length - 2 + i }))

  return (
    <div className="shrink-0 px-3 pt-2">
      <div className="mx-auto max-w-[360px] bg-white rounded-2xl shadow-card border border-ink-100 relative overflow-hidden">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-cheer-200" />
        <button onClick={onToggle} className="relative w-full flex items-center gap-2 pl-8 pr-3 py-2">
          <IconBook className="w-3.5 h-3.5 text-brand-600 shrink-0" />
          <span className="text-[12px] font-bold text-ink-800">同桌的小本子</span>
          <span className="text-[10.5px] text-ink-400">
            {notes.length === 0 ? '还空着' : `写了 ${notes.length} 行`}
          </span>
          <span className="ml-auto text-[11px] text-brand-600 underline underline-offset-2">
            {open ? '收起' : '展开'}
          </span>
        </button>

        {shown.length > 0 && (
          <div
            className={`relative pl-8 pr-3 pb-2 space-y-1 ${open ? 'max-h-[168px] overflow-y-auto scroll-area' : ''}`}
          >
            {shown.map(({ n, i }) => (
              <NoteLine key={i} n={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** 小本子上的一行：一行一件事，短的，不评价 */
function NoteLine({ n }: { n: Note }) {
  const tagClass =
    n.kind === '猜'
      ? 'bg-brand-50 text-brand-700'
      : n.kind === '题'
        ? 'bg-warm-50 text-warm-700'
        : 'bg-ink-100 text-ink-500'
  return (
    <div className="animate-fadeUp flex items-start gap-1.5">
      <span className={`chip shrink-0 !text-[10px] !px-1.5 !py-0.5 ${tagClass}`}>{n.kind}</span>
      <span className="text-[12px] leading-[1.7] text-ink-700">
        <Handwrite text={n.text} total={520} />
      </span>
      {/* 猜中/猜偏标的是**同桌**的成绩，学生随时能纠正它 */}
      {n.kind === '猜' && (
        <span
          className={`shrink-0 text-[10.5px] font-semibold ${n.hit ? 'text-cheer-600' : 'text-warm-600'}`}
        >
          {n.hit ? '猜中' : '猜偏'}
        </span>
      )}
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
function PageLine({
  line,
  first,
  pickable,
  onPickSpot,
}: {
  line: Line
  first: boolean
  /** 现在能不能点（同桌正在说话的时候不能点） */
  pickable: boolean
  onPickSpot: (q: SpotQuestion, i: number) => void
}) {
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

  /* ② 你说的那句话，变成的一道题：情境句 + 题干 + 纸条选项 */
  if (line.k === 'spot') {
    const q = line.q
    return (
      <div className="pt-1">
        <SketchFrame stroke="#8ecdff" fill="#f7fbff" rotate="-rotate-[.6deg]">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="chip bg-white text-brand-700 text-[10.5px] border border-brand-100">
              从你说的「{q.tag}」出的
            </span>
            <span className="text-[11.5px] text-ink-400">物理</span>
          </div>
          {/* 情境句用的是 interestContexts 里那一句 —— 和辅导页、画像页同一份素材 */}
          <div className="text-[12.5px] text-ink-500 leading-relaxed">{q.scene}。</div>
          <p className="text-[14px] text-ink-900 leading-[1.85] mt-1">{q.question}</p>
          <div className="text-[11px] text-ink-400 mt-2 pt-2 border-t border-dashed border-ink-200/70">
            以后你遇到的物理题，我尽量都往这儿靠。
          </div>
        </SketchFrame>

        {line.picked === null && pickable ? (
          <Slips
            items={q.choices.map(c => ({ label: c }))}
            onPick={(_l, _e, i) => onPickSpot(q, i)}
            hint="这道题点一下就行 ——"
          />
        ) : (
          <p className="text-[11.5px] text-ink-400 mt-1.5">
            这道题不打分 —— 我拿它看看你从哪儿开始最合适。
          </p>
        )}
      </div>
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
 *
 * 这一版在最上面多了一张卡：冷启动那一分钟写出来的「前一页」（见本文件顶部 ③）。
 * 它和下面那些系统侧字段不是两套数据 —— 首页那本本子接着它往下写。
 */
function ProfilePage({ roleId, notes, onDone }: { roleId: string; notes: Note[]; onDone: () => void }) {
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

      {/* ③ 冷启动写出来的这一页 —— 它就是首页那本本子的前一页 */}
      <div className="rounded-2xl bg-white shadow-card border border-ink-100 relative overflow-hidden">
        <div className="absolute left-7 top-0 bottom-0 w-px bg-cheer-200" />
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent, transparent 28px, #eef1f5 28px, #eef1f5 29px)',
            backgroundPosition: '0 12px',
          }}
        />
        <div className="relative pl-9 pr-4 py-3.5">
          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-brand-600">
            <IconBook className="w-3.5 h-3.5" />
            同桌的小本子 · 第 1 页
          </div>
          <p className="text-[12.5px] text-ink-600 leading-relaxed mt-1.5">
            刚才那一分钟，你每说一句，这本子上就多一行 —— 一共 {notes.length} 行。
            <br />
            明天打开首页，那本本子就接着这一页往下写。
          </p>
          <div className="mt-2.5 space-y-1">
            {notes.map((n, i) => (
              <NoteLine key={i} n={n} />
            ))}
          </div>
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
