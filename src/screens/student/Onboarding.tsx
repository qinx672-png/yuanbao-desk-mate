import { useEffect, useRef, useState } from 'react'
import {
  TONGZHUO_NAME,
  onboardInterest,
  onboardAvatar,
  quickQuestions,
  quickGuessPick,
  quickGuessLine,
  traitUsage,
  profileV0,
  profileTimeline,
  avatarRoles,
  interestContexts,
} from '@/data/mockData'
import ClassmateAvatarV2 from '@/components/common/ClassmateAvatarV2'
import { Handwrite } from '@/components/common/SketchFrame'
import TalkButton from '@/components/common/TalkButton'
import { useSpeech, useListening, wait } from '@/hooks/useSpeech'
import type { ProfileTrait } from '@/types'
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
 * - 大五只用于「过程支持」适配（节奏、反馈、情境），不向学生输出「你是这个人」这类人格定论
 *   （架构判断说明 五 · 能力边界）
 * - 最后一步是角色库自选（3.0-3），换外壳不换内核
 *
 * ── 这一屏为什么必须和首页用同一套形态 ──────────────────────
 * 这是学生打开产品看到的第一屏。第一屏如果是气泡+按钮的问卷，
 * 后面再怎么"对话优先"，主轴也是断的 —— 孩子第一眼就认定这是个答题工具。
 * 所以主路径是**同桌出声说，孩子按住说话答**，打字只是兜底。
 *
 * ── 2026-09-12 改版：把「猜你是什么人」换成「快问快答」─────────
 *
 * 旧版做了四轮「同桌猜 → 你纠正 → 我归纳一句」。三处毛病：
 *
 * ① 四轮同一个形状。学生做的动作四遍都是「从三个选项里点一个」，第四遍一定腻。
 * ② 每次猜完还要归纳「你习惯先搭框架」——这已经在给孩子定性了。
 *    外壳是游戏，里子还是量表。
 * ③ 学生说完兴趣，下一句就被考题了。这一下教给他的是
 *    「我说什么，你都会拿来考我」，之后他就不敢说真话了 ——
 *    而冷启动的全部价值，就在于让他敢说。
 *
 * 现在改成：
 *
 * ① 同桌硬猜一次（第一步，保留）
 *    「我手上一条线索都没有，硬猜一个」——这一句是好设计，留。
 *    学生纠正它 → 采到兴趣 → 喂给出题情境素材库。
 *
 * ② 10 道快问快答（QUICK 段）
 *    一屏一道，两个具体场景挑一个，点完即走。约 40 秒。
 *    大五五个维度各 2 题，只能定「偏低/中等/偏高」三个粗档 —— 够用了，别装精确。
 *    10 题里只有 3 题同桌插一句猜测（q1 硬猜 / q4、q8 顺着上一题推）：
 *    每题都猜会打断节奏，更要紧的是猜了之后学生会往猜的那边靠，采到的东西就不准了。
 *
 * ③ 本子上落的是**承诺**，不是评价
 *    答完之后，本子上多出三行 ——「以后卡住我先不开口，等你说」这种。
 *    记的是「我打算怎么陪你」，不是「你是什么样的人」。
 *    孩子看了会觉得被接住，而不是被看穿。这是这一版最要紧的一条。
 *
 * ── 为什么冷启动不再出题 ─────────────────────────────────────
 * 旧版在最后放了两道起点题（一道串联电路、一道一元二次方程）。
 * 第一次见面就考他，是对关系的透支 —— 而且「我说打篮球」→ 下一句就被考题，
 * 孩子会学会别说真话。起点诊断挪到**第一次真实辅导**：
 * 那时候他本来就是带着题来的，顺手看水平，完全不突兀（阶段 1 本就在做诊断）。
 * 动机同理：问一嘴答的都是场面话，真正准的是看他怎么用产品。
 * 这两项如实列在画像页的「还没测」里，不假装第一天什么都知道。
 *
 * ── 一处刻意的例外：快问快答不给语音 ─────────────────────────
 * 语音适合表达**意图**（"我想练两道题"），不适合表达**判断**（"读数等于电源电压的那只"）。
 * 10 道快问快答是纸面点选 —— 全语音会把能做的孩子挡在门外。
 * 这不是没做完，是判断：语音优先 ≠ 语音唯一。
 *
 * ── 诚实说明 ───────────────────────────────────────────────
 * 1. 语音合成为浏览器内置能力，找不到中文语音时降级为字幕模式（界面会标出）。
 * 2. 语音识别能用则真、不能用则模拟，模拟结果在本子上如实标注「（原型模拟识别）」。
 * 3. 大五粗档在原型里就是数数（每维 2 题，数几个落在高端），不是量表计分。
 *    真跑由 LLM 结合作答过程（犹豫时长、改选）一起判。
 * 4. 兴趣靠关键词匹配（resolveInterest），不是真 NLU。
 *
 * 保留的既有安全设计：不出现分数/排名/人格标签、
 * 「这段闲聊不是测评」的常驻声明、形象选择不做付费分层。
 */

type Line =
  | { k: 'ai'; text: string }
  | { k: 'me'; text: string; via?: 'voice' | 'typed'; simulated?: boolean }

/** 同桌记住的一件事。学生说过的原话存这儿，「因为你刚才说…」就是从这儿拼出来的 */
interface Memory {
  /** 本子上的简写（打篮球） */
  short: string
  /** 学生说的原话（我周末打篮球） */
  text: string
  /** 落在哪个兴趣上（篮球/游戏/动漫/休息），没对上就是 null */
  tag: string | null
}

/** 小本子上的一行 */
interface Note {
  /** 猜＝同桌的猜测；观察＝学生这一句里看见的事；承诺＝同桌往后打算怎么陪 */
  kind: '猜' | '观察' | '承诺'
  text: string
  /** 只对「猜」有意义：这一猜中没中 —— 这是**同桌自己的成绩**，不是学生的分 */
  hit?: boolean
}

interface Props {
  roleId: string
  onPickRole: (id: string) => void
  onDone: () => void
}

/** 走完一步之后下一步去哪。用显式的 stage，不再用下标硬凑 */
type Stage = 'name' | 'interest' | 'quick' | 'avatar'

/**
 * 同桌的名字来自 mockData 的 TONGZHUO_NAME —— 全局唯一一处，别在这儿再写一遍。
 *
 * 以前同桌的名字来自最后一步选的形象（阿橙 / 小蓝 / 豆豆 …），可选形象是
 * **最后**一步 —— 于是开场那十几秒里它根本没有名字，只能说「我是你的新同桌」。
 * 第一次见面不报名字、也不问对方名字，直接开始猜你周末干嘛 —— 这是秦肖说
 * 「太人机」的根子：对话是单向采集，不是互相认识。
 *
 * 现在名字固定成小元（和产品名「元宝同桌」同源），形象退成纯外壳。
 * 学生主页 / 讲题页顶部的那条身份栏也读同一个常量，不会各说各的。
 */

/** 演示时学生「说」出来的名字。和 mockData 里的 student.name 对齐 */
const DEMO_STUDENT_NAME = '小明'

/** 名字这步的科学内核（原型可视化用，产品内不展示） */
const NAME_MEASURES = '互惠式自我暴露：同桌先给出自己（名字 + 喜好），再问学生。单向采集只会让人闭嘴'

const VERDICT_HIT_FIRST = '哟，头一句就蒙对了 —— 不过这回是运气，我手上一点线索都没有。'
const VERDICT_MISS_FIRST = '猜偏了，正常，我手上一条线索都没有。你纠正我这一句，比我自己猜十次都管用。'

/** 猜中 / 猜偏在快问快答里的说法：一句话，不归纳、不评价人格 */
const QUICK_HIT = '中了。'
const QUICK_MISS = '又偏了，你选你的。'

/**
 * 本子上最后落哪三句承诺。
 *
 * 挑的是最能用起来的三维：尽责性（任务切多细）、开放性（给几种讲法）、
 * 情绪稳定性（什么时候递台阶）。外向性和宜人性也测了，进画像页，但不占本子 ——
 * 十行承诺会把本子变成说明书，孩子就不看了。
 */
const PLEDGE_PICK = ['q3', 'q5', 'q9']

/**
 * 本子上那句「猜「…」」的短版。
 *
 * **从 onboardInterest.ask 派生，不再手写一份副本** —— 原来这里是硬编码的
 * 「猜「你在家躺着刷手机」」，和 mockData 里的台词是两处独立维护的字符串。
 * 改了台词忘了改这里，本子上就会记下一句同桌从没说过的话 ——
 * 正是「同一件事在两处说法不一致」，而且藏得深、看起来还挺真。
 */
const GUESS_SHORT = onboardInterest.ask.replace(/[。，]?\s*猜得准吗？?\s*$/, '')

/** 兴趣关键词兜底：学生说「在家躺着」时，也要能落到「休息」这个情境上 */
const INTEREST_WORDS: { tag: string; words: string[] }[] = [
  { tag: '篮球', words: ['篮球', '打球', '球场'] },
  { tag: '游戏', words: ['游戏', '开黑', '手游'] },
  { tag: '动漫', words: ['动漫', '动画', '漫画', '画画'] },
  { tag: '休息', words: ['休息', '躺着', '睡觉', '宅', '发呆', '歇着', '歇'] },
]

/**
 * 从学生那句话里把名字抠出来。
 *
 * 「我叫小明」「我是小明」「小明」都要能落到「小明」。
 * 抠不出来就返回空串 —— **宁可不显示，也不能把「我叫」当成名字写到本子上**。
 *
 * ── 2026-09-13 修：长度阈值原来是 8，挡不住它自己举的那个例子 ──
 * 原注释写「长度上限 8 是为了挡住『我叫小明我今年初三』」，
 * 但剥掉「我叫」之后剩「小明我今年初三」= **7 个字，照样过**。
 * 注释承诺的和代码做的不是一回事。
 *
 * 而且整句长度本来就不是判断名字的好尺子 —— 名字的特征是
 * **短 + 字符集受限**，不是「字数少」。所以改成两道：
 *   ① 长度 ≤ 6（中文名 2~4 字，小名/昵称到 5 顶天）
 *   ② 不含一眼不是名字的字（我你他年月岁级班叫…）
 * 于是「小明我今年初三」（7 字）被①挡掉、「我不告诉你」被②挡掉。
 *
 * ⚠️ 别把这两道说成能判断「是不是人名」：**「我是初三」剥完剩「初三」，
 *    照样会当名字收下。** 停用字表只能列确定的非名字字，
 *    再往下加（初一二三四…高）就会误伤真名字 —— 高、一、三都是常见姓氏/名字用字。
 *    「宁可不显示也不写错」这条线，靠这两道只能做到这个程度。
 *    真跑由模型做抽取，演示时学生说的是「我叫小明」。
 */
const NOT_A_NAME = /[我你他她它年月岁级班校老师叫名谁吗呢吧的了是在有和]/

function cleanName(raw: string): string {
  let s = raw.trim()
  // 去掉首尾标点和空白
  s = s.replace(/^[\s，,。！？!?、]+|[\s，,。！？!?、]+$/g, '')
  // 去掉自我介绍的壳
  s = s.replace(/^(我叫|我的名字是|我的名字叫|我是|名字叫|叫)/, '')
  s = s.replace(/^[\s，,。！？!?、]+|[\s，,。！？!?、]+$/g, '')
  s = s.replace(/(同学|小朋友|啦|呀|哦|噢)$/, '')
  if (s.length === 0 || s.length > 6) return ''
  if (NOT_A_NAME.test(s)) return ''
  return s
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

/**
 * 本子上记的简写：把「我周末打篮球」缩成「打篮球」。
 * 原型里就这一条去掉句首「我…」的土办法，真跑由 LLM 归纳。
 */
function shortOf(text: string, max = 12): string {
  const t = text.replace(/^我(周末|平时|一般)?/, '').replace(/^[，,、\s]+/, '')
  return t.length > max ? `${t.slice(0, max)}…` : t
}

/**
 * 把 10 个答案数成大五五个粗档。
 *
 * 每维只有 2 题，所以只可能是 0 / 1 / 2 个落在高端 —— **别包装成精确分数**。
 * 这一节故意写得这么朴素：原型里它就是数数，真跑由 LLM 结合作答过程一起判。
 * 写死一份「中等偏上」的假画像，会让下面那页科学内核变成摆设。
 */
function tallyTraits(answers: (0 | 1)[]): ProfileTrait[] {
  const dims = ['外向性', '尽责性', '开放性', '宜人性', '情绪稳定性']
  return dims.map(name => {
    let high = 0
    quickQuestions.forEach((q, i) => {
      if (q.dimension === name && answers[i] === q.high) high++
    })
    return {
      name,
      level: high === 0 ? '偏低' : high === 1 ? '中等' : '偏高',
      usedFor: traitUsage[name] ?? '',
    }
  })
}

export default function Onboarding({ roleId, onPickRole, onDone }: Props) {
  const [lines, setLines] = useState<Line[]>([])
  const [stage, setStage] = useState<Stage>('name')
  /**
   * 学生报的名字。只用来**写字**，不用来**念** ——
   * 带名字的台词没法预渲染（见 say 的说明），所以它只落在气泡和本子上。
   * 抠不出来时是空串，此时所有带名字的显示都要退化成不带名字的版本。
   */
  const [studentName, setStudentName] = useState('')
  /** 当前问到第几道快问快答 */
  const [qi, setQi] = useState(0)
  /** 每道快问快答选了哪个（下标 = quickQuestions 的下标） */
  const [answers, setAnswers] = useState<(0 | 1)[]>([])
  /** 刚点过的那个选项，用来做一个短促的「按下去」反馈 */
  const [picked, setPicked] = useState<0 | 1 | null>(null)
  const [phase, setPhase] = useState<'busy' | 'waiting'>('busy')
  const [showCore, setShowCore] = useState(true)
  const [showProfile, setShowProfile] = useState(false)
  /** 小本子上已经落下的行 —— 冷启动结束时，它就是首页那本的前一页 */
  const [notes, setNotes] = useState<Note[]>([])
  const [noteOpen, setNoteOpen] = useState(false)
  /** 同桌在这一题猜了第几个；没猜就是 null */
  const [guessPick, setGuessPick] = useState<0 | 1 | null>(null)

  const { speak, stop, muted, setMuted, canSpeak } = useSpeech()
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
  /** 答案和猜的一样要异步读，同样用 ref */
  const answersRef = useRef<(0 | 1)[]>([])
  const guessRef = useRef<0 | 1 | null>(null)
  /** 兴趣：第一步采到的 tag，交给画像页 */
  const [interest, setInterest] = useState<string | null>(null)
  /** 正在离开这一屏（去画像页）。这是 disabled 唯一该表示的意思 */
  const [leaving, setLeaving] = useState(false)
  /**
   * 开场那句「我先猜 ——」说出口了没有。
   *
   * 学生可以在同桌还没说出这一猜之前就抢话。要是直接往下走，
   * 本子上会记一条「猜「…」」（内容取自 GUESS_SHORT），而学生压根没听到过这句 ——
   * 界面记了一件没发生过的事。所以抢话时补说这一句。
   */
  const guessedRef = useRef(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [lines, qi, picked, stage])

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

  /**
   * 同桌说一句。
   *
   * text 是**念出来的话**，同时也是音频文件的哈希键 —— 它必须是静态的，
   * 否则预渲染不出来（见 scripts/gen-voice.mjs 顶部）。
   * display 是**气泡上显示的字**，可以不等于 text。
   *
   * ── 为什么需要这个口子 ──────────────────────────────────────
   * 学生报上名字之后，同桌得接一句带名字的话（「记住了 —— 小明」）。
   * 但带名字的台词有无限多种，不可能给每个名字预渲染一条音频。
   * 于是拆开：**念**的是静态的「好名字，记住了」，**写**的是带名字那句。
   * 声画信息量不同，但不矛盾 —— 不会出现「说的和写的对不上」。
   * （这是和秦肖定的「丙案」。甲案是干脆不问名字，乙案是让这一句
   *   掉回浏览器语音、音色当场突变 —— 两句都在建立好感的关键位置，
   *   所以选了代价最小的这条。）
   */
  const say = async (text: string, id: number, display?: string) => {
    if (!alive(id)) return
    setLines(l => [...l, { k: 'ai', text: display ?? text }])
    await speak(text)
    if (!alive(id)) return
    await wait(300)
  }

  /** 本子上落一行 */
  const addNote = (n: Note) => setNotes(l => [...l, n])

  /**
   * 开场：先互相认识，再硬猜。
   *
   * ── 为什么补「自报家门 + 问名字」这两步 ────────────────────
   * 原来开场是：一句产品隐喻 → 立刻硬猜你周末干嘛。
   * 同桌对自己**零暴露**，却马上开始采集你 —— 秦肖的原话是「太人机」。
   * 真人第一次见面不这样：先说我是谁、我喜欢什么，再问你是谁。
   * 所以照这个顺序补上，硬猜挪到名字之后 —— 认识了，再让人家纠正你。
   */
  const intro = async () => {
    const id = ++runRef.current
    await say('嗨，我是你的新同桌。开学第一天，这本本子还是空的 —— 以后你和我都写在这儿。', id)
    if (!alive(id)) return // 学生抢话了，开场白到此为止
    await say(
      `对了，我叫${TONGZHUO_NAME} —— 挺喜欢数学和物理的，尤其是「想不通、突然想通」那一下。`,
      id,
    )
    if (!alive(id)) return
    await say('你呢，你叫什么？', id)
    if (!alive(id)) return
    setStage('name')
    setPhase('waiting')
  }

  /** 名字走完才轮到硬猜 */
  const doGuess = async (id: number) => {
    // 原来这句是「先不问你，我先猜」—— 前面刚问完名字，再说「先不问你」就接不上了。
    // 改成「你的兴趣我先不问了」，指代明确：刚问了名字，现在先不问兴趣。
    await say(`你的兴趣我先不问了 —— 我先猜一个：${onboardInterest.ask}`, id)
    if (!alive(id)) return
    guessedRef.current = true
    setStage('interest')
    setPhase('waiting')
  }

  /**
   * 第 0 步：问名字。
   *
   * 抢话处理和 onSayInterest 同源 —— 同桌说话时学生本来就能打断，
   * 这条规则不因为换了一步就变。
   */
  const onSayName = async (typed?: string) => {
    if (leaving) return
    if (stage !== 'name') return
    if (phase === 'busy') {
      runRef.current++ // 让在飞的 intro / say 全部失效
      stop() // 掐掉正在说的那句
    }
    const id = runRef.current
    setPhase('busy')

    let text: string
    let simulated = false
    if (typed !== undefined) {
      text = typed.trim()
    } else {
      // 名字不是选择题，没有选项可点；演示时用一句预设的自我报名顶上
      const r = await listen(`我叫${DEMO_STUDENT_NAME}`)
      if (!alive(id)) return
      text = r.text.trim()
      simulated = !r.real
    }

    if (!text) {
      await say('没听清，你再说一遍？', id)
      if (alive(id)) setPhase('waiting')
      return
    }

    const nm = cleanName(text)
    setStudentName(nm)
    setLines(l => [...l, { k: 'me', text, via: typed === undefined ? 'voice' : 'typed', simulated }])

    // 丙案：念的是静态句（能预渲染），写的是带名字那句 —— 名字只进文字，不进音频
    await say('好名字，记住了。', id, nm ? `好名字，记住了 —— ${nm}。` : '好名字，记住了。')
    if (!alive(id)) return
    // 本子的第一行就是学生的名字：这本本子是从「你」开始的
    if (nm) addNote({ kind: '观察', text: `名字：${nm}` })
    await doGuess(id)
  }

  /**
   * 第 1 步：学生纠正同桌 → 本子记两行 → 采到兴趣
   *
   * ── 为什么这里要允许「抢话」────────────────────────────────
   * 原来第一行是 `if (phase !== 'waiting') return` —— 配合按钮上的
   * `disabled={phase !== 'waiting'}`，等于**整个开场白期间麦克风是死的**
   * （phase 初值就是 'busy'）。秦肖连着三次反馈「冷启动阶段根本没法说话」，
   * 根因就在这两行。
   *
   * 对话不是单向广播：真人同桌说话时你本来就能打断。现在抢话会作废
   * 开场白剩下的句子、掐掉正在说的那句，然后正常走后面的流程。
   */
  const onSayInterest = async (typed?: string) => {
    if (leaving) return
    if (stage !== 'interest') return
    if (phase === 'busy') {
      runRef.current++ // 让在飞的 intro / say 全部失效
      stop() // 掐掉正在说的那句
    }
    const id = runRef.current
    setPhase('busy')

    let text: string
    let simulated = false
    if (typed !== undefined) {
      text = typed.trim()
    } else {
      const opts = onboardInterest.options ?? [{ label: '猜错了，我打球' }]
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

    const opts = onboardInterest.options ?? []
    const res = resolveInterest(text, opts)
    const said = res.echo
    setLines(l => [
      ...l,
      { k: 'me', text: said, via: typed === undefined ? 'voice' : 'typed', simulated },
    ])

    // 学生抢在「我先猜」之前开了口 —— 补说这一句再往下走。
    // 顺序是「学生先说 → 同桌再猜」，跟他实际经历的时间顺序一致。
    // 不补的话，下面那条「猜」的笔记和后面的判定都指向一句没说过的话。
    if (!guessedRef.current) {
      guessedRef.current = true
      await say(`等下，我先猜一个 —— ${onboardInterest.ask}`, id)
      if (!alive(id)) return
    }

    // 本子上先记同桌这一猜中没中 —— 偏了也照写，不藏
    const hit = res.i !== null && res.i === 3
    addNote({ kind: '猜', text: `猜「${GUESS_SHORT}」`, hit })
    addNote({ kind: '观察', text: `周末：${shortOf(said)}` })
    memRef.current = [...memRef.current, { short: shortOf(said), text: said, tag: res.tag }]
    if (res.tag) setInterest(res.tag)

    await say(hit ? VERDICT_HIT_FIRST : VERDICT_MISS_FIRST, id)
    await say(
      res.tag
        ? `行，「${res.tag}」我记下了 —— 以后出题我就往这上面靠。`
        : '行，我记下了 —— 以后出题我往你说的这上头靠。',
      id,
    )

    // 进快问快答
    setStage('quick')
    await askQuick(0, id)
  }

  /**
   * ② 抛出一道快问快答。
   *
   * 有 guess 的题，同桌先说一句猜测再让学生答 —— 猜的是「这题你会选哪个」，
   * 不是「你是什么人」。猜完立刻补一句「你选你的」，把引导性明着卸掉。
   */
  const askQuick = async (i: number, id: number) => {
    const q = quickQuestions[i]
    if (!q) return
    setQi(i)
    setPicked(null)
    guessRef.current = null
    setGuessPick(null)

    if (q.guess) {
      /*
       * 这句「猜测台词」的拼装搬去了 mockData 的 quickGuessLine()。
       *
       * 为什么：这句是按数据现拼的，而**生成音频的脚本必须能把它穷举出来**，
       * 否则某些分支就没有预渲染音频，一到那儿就掉回浏览器机器音。
       * 2026-09-13 实测踩到两次：兴趣标签那句（4 个 tag 只有 1 个有声），
       * 和这里的猜句（5 个变体只有 3 个有声）。
       * 放在 mockData 里，前端和 gen-voice 读同一份逻辑，就不会再各拼各的。
       */
      const pick = quickGuessPick(i, answersRef.current[i - 1])
      const line = quickGuessLine(i, answersRef.current[i - 1])
      if (!line) return
      guessRef.current = pick
      setGuessPick(pick)
      await say(line, id)
      if (!alive(id)) return
    }

    setPhase('waiting')
  }

  /** ② 学生点了一个选项：记答案 → 该猜的判一下 → 下一题 */
  const pickQuick = async (choice: 0 | 1) => {
    if (phase !== 'waiting' || stage !== 'quick') return
    const id = runRef.current
    setPhase('busy')
    setPicked(choice)

    const q = quickQuestions[qi]
    const next = [...answersRef.current]
    next[qi] = choice
    answersRef.current = next
    setAnswers(next)

    // 有猜就当场交代一句 —— 一句话，不归纳、不评价人格
    if (guessRef.current !== null) {
      const hit = choice === guessRef.current
      addNote({ kind: '猜', text: `猜「${q.choices[guessRef.current]}」`, hit })
      await say(hit ? QUICK_HIT : QUICK_MISS, id)
      if (!alive(id)) return
    }

    if (qi < quickQuestions.length - 1) {
      // 没猜的题不留停顿：点完就走，这是「不烦」的关键
      if (guessRef.current === null) await wait(240)
      await askQuick(qi + 1, id)
      return
    }

    await wrap(id)
  }

  /** ③ 收尾：把三句承诺落到本子上，然后进选形象 */
  const wrap = async (id: number) => {
    await say('十道题答完了。我一条都没打分 —— 它们只告诉我一件事：以后该用什么方式陪你。', id)
    await say('其中三句我写在你本子上了，你看看。', id)
    if (!alive(id)) return

    PLEDGE_PICK.forEach(qid => {
      const idx = quickQuestions.findIndex(x => x.id === qid)
      const q = quickQuestions[idx]
      const a = answersRef.current[idx]
      if (q && a !== undefined) addNote({ kind: '承诺', text: q.pledge[a] })
    })

    setStage('avatar')
    await say(onboardAvatar.ask, id)
    if (!alive(id)) return
    setPhase('waiting')
  }

  if (showProfile) {
    return (
      <ProfilePage
        roleId={roleId}
        notes={notes}
        answers={answers}
        interest={interest}
        onDone={onDone}
      />
    )
  }

  const firstAi = lines.findIndex(l => l.k === 'ai')
  const q = quickQuestions[qi]
  const remain = quickQuestions.length - qi

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
          {muted ? '已静音' : canSpeak ? '同桌有声' : '字幕模式'}
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
        {/* 同首页：38px 用 A 版，状态由右侧文字承担 */}
        <ClassmateAvatarV2 mood={phase === 'busy' ? 'explaining' : 'listening'} size={38} roleId={roleId} variant="A" />
        <span className="text-[14px] font-bold text-ink-900">你的同桌</span>
        {/* 名字固定是小元（方案 A）；形象只决定「长什么样」，所以旁边挂的是风格不是名字 */}
        <span className="chip bg-brand-50 text-brand-700 text-[10.5px]">{TONGZHUO_NAME}</span>
        <span className="chip bg-ink-100 text-ink-500 text-[10.5px]">
          {avatarRoles.find(r => r.id === roleId)?.style}
        </span>
        <span className="ml-auto text-[11.5px] text-ink-400 truncate">
          {phase === 'busy' ? '正在说…' : '第一次见面'}
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
              <PageLine key={i} line={l} first={i === firstAi} />
            ))}

            {/* 科学内核标注：原型可视化，产品内不展示 */}
            {showCore && phase === 'waiting' && (
              <CoreNote
                text={
                  stage === 'quick' && q
                    ? `大五 · ${q.dimension} → ${traitUsage[q.dimension] ?? ''}（第 ${qi + 1} / ${quickQuestions.length} 题）`
                    : stage === 'name'
                      ? studentName
                        ? `${NAME_MEASURES}｜已采到：${studentName}`
                        : NAME_MEASURES
                      : stage === 'interest'
                        ? onboardInterest.measures
                        : onboardAvatar.measures
                }
              />
            )}

            {/* ── 第 0 步：问名字 ──────────────────────────────────
                名字不是选择题，没有「你可以这样说」的选项列表，
                只留一句演示用的示范 —— 说 / 点 / 写三条通道照旧都通。 */}
            {stage === 'name' && (
              <div className="pt-3 border-t border-dashed border-ink-200/80">
                <TalkButton
                  onSay={onSayName}
                  disabled={leaving}
                  speaking={phase === 'busy'}
                  hint="按住说名字"
                  suggestions={[`我叫${DEMO_STUDENT_NAME}`]}
                />
              </div>
            )}

            {/* ── 第 1 步：兴趣。说 / 点 / 写三条等价通道 ────────── */}
            {stage === 'interest' && (
              <div className="pt-3 border-t border-dashed border-ink-200/80">
                <TalkButton
                  onSay={onSayInterest}
                  /*
                   * disabled 只表示「正在离开这一屏」。
                   * 「同桌正在说」交给 speaking —— 它只改提示语和配色，不关门。
                   * 原来传的是 `phase !== 'waiting'`：phase 初值就是 'busy'，
                   * 于是开场白那十几秒麦克风全程是灰的，按都按不动。
                   */
                  disabled={leaving}
                  speaking={phase === 'busy'}
                  hint="按住说话"
                  suggestions={(onboardInterest.options ?? []).map(o => o.label)}
                />
              </div>
            )}

            {/* ── ② 快问快答：一屏一道，点完即走 ─────────────────
                刻意不用语音：语音适合表达意图，不适合表达判断。 */}
            {stage === 'quick' && q && (
              <QuickCard
                key={q.id}
                scene={q.scene}
                choices={q.choices}
                remain={remain}
                picked={picked}
                pickable={phase === 'waiting'}
                guessPick={guessPick}
                onPick={pickQuick}
              />
            )}

            {/* ── 选形象：8 张贴纸，换外壳不换内核 ─────────────── */}
            {stage === 'avatar' && (
              <div className="pt-1">
                <div className="grid grid-cols-4 gap-2">
                  {avatarRoles.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        onPickRole(r.id)
                        addNote({ kind: '观察', text: `形象挑了「${r.style}」` })
                      }}
                      className={`tap flex-col gap-1 rounded-2xl border-2 py-2 transition ${
                        roleId === r.id ? 'border-brand-500 bg-brand-50' : 'border-ink-100 bg-white'
                      }`}
                    >
                      {/* 角色选择：8 个并排，加符号会互相打架，用 A 版展示「长相」就够了 */}
                      <ClassmateAvatarV2 mood="listening" size={40} roleId={r.id} variant="A" />
                      {/* 只显示风格，不显示「阿橙」这类名字 —— 名字固定是小元，
                          这里摆个别的名字会让学生以为挑的是「换一个人」 */}
                      <span className="text-[11px] font-semibold text-ink-800 leading-tight">
                        {r.style}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="rounded-xl bg-brand-50 border border-brand-100 px-3 py-2 mt-2.5">
                  <p className="text-[11.5px] text-brand-700 leading-relaxed">
                    换形象只换长相 —— 名字一直是{TONGZHUO_NAME}。8 个形象背后是同一套引导逻辑、
                    同一份学情数据，随时能换回来。
                  </p>
                </div>
                <button
                  onClick={() => {
                    // 离开这一屏：先把还在说的那句掐掉，再把麦克风关上 ——
                    // 否则翻页之后同桌的声音还在后台把上一句念完
                    setLeaving(true)
                    stop()
                    setShowProfile(true)
                  }}
                  className="btn-primary w-full h-12 text-[15px] mt-3"
                >
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
 * ② 快问快答的一张卡（见本文件顶部 ②）
 *
 * 一屏一道：场景句 + 两张纸条，点完即走。
 * 「还剩 N 题」是刻意留的 —— 孩子不知道还有多久才会烦；
 * 知道终点在哪，等待才不显得长。这不是进度条：它不评价、不累积分数。
 */
function QuickCard({
  scene,
  choices,
  remain,
  picked,
  pickable,
  guessPick,
  onPick,
}: {
  scene: string
  choices: [string, string]
  remain: number
  picked: 0 | 1 | null
  pickable: boolean
  guessPick: 0 | 1 | null
  onPick: (i: 0 | 1) => void
}) {
  return (
    <div className="pt-1 animate-fadeUp">
      <div className="rounded-2xl border border-brand-100 bg-[#fbfdff] px-3 py-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="chip bg-white text-brand-700 text-[10.5px] border border-brand-100">快问快答</span>
          <span className="ml-auto text-[11px] text-ink-400">还剩 {remain} 题</span>
        </div>

        <p className="text-[14.5px] text-ink-900 leading-[1.85]">{scene}</p>

        <div className="mt-2.5 space-y-2">
          {choices.map((c, i) => {
            const idx = i as 0 | 1
            const isPicked = picked === idx
            const wasGuessed = guessPick === idx
            return (
              <button
                key={c}
                onClick={() => pickable && onPick(idx)}
                disabled={!pickable}
                className={`tap w-full text-left rounded-xl border border-dashed px-3.5 py-3 text-[14px] leading-[1.6] transition ${
                  isPicked
                    ? 'border-brand-400 bg-brand-50 text-brand-700 font-semibold'
                    : 'border-ink-200 bg-[#fffdf5] text-ink-700 hover:border-brand-300 hover:text-brand-700'
                } ${pickable ? '' : 'opacity-70'}`}
              >
                {c}
                {/* 同桌猜过这个 —— 标出来，让学生知道它猜的是哪个（猜中猜偏都不影响选） */}
                {wasGuessed && !isPicked && (
                  <span className="ml-1.5 text-[11px] text-ink-400">（同桌猜的这个）</span>
                )}
              </button>
            )
          })}
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
 * 折起来只露最后两行（写满一页的感觉还在），点一下摊开看全部。
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
  /* 折起来露最后两行（刚好看得见最新的动静），下标一起带着当 key 用 —— 同一句话可能出现两次 */
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
      : n.kind === '承诺'
        ? 'bg-cheer-50 text-cheer-700'
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
 * 它的作用是把「趣味外壳下面的科学内核」摊给评审看。
 *
 * 这一版的大五粗档是**从刚才那 10 个答案当场算出来的**（tallyTraits），
 * 不是写死的 —— 写死会让这一页变成摆设：答案怎么改，画像纹丝不动。
 */
function ProfilePage({
  roleId,
  notes,
  answers,
  interest,
  onDone,
}: {
  roleId: string
  notes: Note[]
  answers: (0 | 1)[]
  interest: string | null
  onDone: () => void
}) {
  const traits = tallyTraits(answers)

  return (
    <div className="flex-1 min-h-0 scroll-area bg-ink-50 px-4 py-4 space-y-3.5">
      <div className="rounded-2xl bg-warm-50 border border-dashed border-warm-200 px-3.5 py-2.5">
        <div className="text-[11px] font-bold text-warm-700">本子背面 · 原型可视化</div>
        <p className="text-[11.5px] text-warm-700/90 leading-relaxed mt-0.5">
          这一页学生在产品里看不到。它是把冷启动这一分钟「实际采集到了什么」摊开给评审看的。
        </p>
      </div>

      <div className="card p-4 flex items-center gap-3">
        {/* 冷启动结束的庆祝时刻：56px 够大，用 B 版把「高兴」拉满 */}
        <ClassmateAvatarV2 mood="happy" size={56} roleId={roleId} variant="B" className="shrink-0" />
        <div className="min-w-0">
          <div className="text-[16px] font-bold text-ink-900">认识完了，我是{TONGZHUO_NAME}</div>
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
        <div className="flex items-center gap-2 mb-1">
          <IconSpark className="w-4 h-4 text-brand-600" />
          <h3 className="text-[15px] font-bold text-ink-900">画像 V0（系统侧，学生不可见）</h3>
        </div>
        <p className="text-[11.5px] text-ink-400 leading-relaxed mb-3">
          大五粗档是从刚才那 10 个答案**当场数出来的**，不是预设值。每维只有 2 题，
          所以只够分「偏低 / 中等 / 偏高」三档 —— 够用了，不装精确。
        </p>

        <div className="space-y-2 mb-3">
          {traits.map(t => (
            <div key={t.name} className="rounded-xl bg-ink-50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-ink-800">{t.name}</span>
                <span className="chip bg-white text-ink-500 text-[11px]">{t.level}</span>
              </div>
              <p className="text-[12px] text-ink-500 leading-relaxed mt-1">用于：{t.usedFor}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-warm-50 px-3 py-2.5 mb-2">
          <div className="text-[12.5px] font-bold text-warm-700 mb-1">兴趣爱好 → 出题情境素材库</div>
          {interest ? (
            <div className="flex gap-1.5 flex-wrap">
              <span className="chip bg-white text-warm-700 text-[11.5px]">{interest}</span>
            </div>
          ) : (
            <p className="text-[11.5px] text-warm-700/90 leading-relaxed">
              这一步你没说，我没追问 —— 等哪天你自己提起，我再记。
            </p>
          )}
        </div>

        {/* 第一天没测得的东西，如实列出来。不假装什么都知道 */}
        <div className="rounded-xl border border-dashed border-ink-200 px-3 py-2.5">
          <div className="text-[12.5px] font-bold text-ink-700 mb-1.5">还没测的（不猜，等它自己出来）</div>
          <div className="space-y-2">
            {profileV0.pending.map(p => (
              <div key={p.name}>
                <div className="text-[12px] text-ink-800 font-semibold">{p.name}</div>
                <p className="text-[11.5px] text-ink-500 leading-relaxed mt-0.5">{p.why}</p>
                <p className="text-[11px] text-brand-600 mt-0.5">补上时间：{p.when}</p>
              </div>
            ))}
          </div>
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
          本子上那三行也不是对你的评价 —— 是我答应你的事。
        </p>
      </div>

      <button onClick={onDone} className="btn-primary w-full h-12 text-[15px]">
        进教室，开始学
      </button>
    </div>
  )
}
