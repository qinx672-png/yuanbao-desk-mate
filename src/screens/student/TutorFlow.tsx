import { useEffect, useRef, useState, useCallback, type ComponentType } from 'react'
import type {
  Bubble,
  ScriptNode,
  Stage,
  GuideDepth,
  ExitOption,
  FallbackLoopStep,
  LabKind,
  TutorSnapshot,
} from '@/types'
import VoltmeterLab from '@/components/lab/VoltmeterLab'
import {
  TONGZHUO_NAME,
  script,
  answerChoices,
  stageMetas,
  diagnosis,
  teachingModes,
  depthHint,
  fallbackLoopFor,
  noErrorChallengeReply,
  exitOptions,
  interestContexts,
  BACK_TO_CALLER,
} from '@/data/mockData'
import { moodFromBubbleKind, findRole, type ClassmateMood } from '@/components/common/ClassmateAvatar'
import ClassmateAvatarV2 from '@/components/common/ClassmateAvatarV2'
import PhotoUpload from '@/screens/student/PhotoUpload'
import {
  IconBook,
  IconClock,
  IconMic,
  IconCamera,
  IconPencil,
  IconCheck,
  IconSpark,
  IconShield,
  IconSound,
  IconSoundOff,
} from '@/components/common/Icons'
import { useSpeech, useListening, wait } from '@/hooks/useSpeech'

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
 *
 * ── 2026-09-12：三档从「改写表」升级成「教法插件」────────────
 * 每档现在是一份自包含声明（见 types 的 TeachingMode），本文件不再认识
 * 「深聊/标准/快讲」这三个具体的档 —— 它只认格式。加第四档时，
 * **这个文件一行都不用改**，加一份数据就行。
 *
 * 切档只有「点」这一条通道：顶栏档位芯片 / 底部「换讲法」按钮 → 面板里选。
 *
 * 曾经加过「说」—— 面板里挂个麦克风，说一句「讲细一点」就切。2026-09-12 砍掉：
 * 面板本来就是一按就开、点一下就切，再让学生说一遍比直接点还多两步。
 * 秦肖验收时的原话：「现在点开三档可选就很直接很方便，没有必要加上再说一遍的选项。」
 *
 * 注意这跟「说/点/写三通道等价」不冲突 —— 那条规矩管的是**作答**
 * （学生的主要动作，值得给三条路）；换讲法是个小控件，点一下就够了。
 */

/** 取某一档的教法声明。找不到就退回默认档 —— 别让一个坏 key 把整页打崩 */
const modeOf = (d: GuideDepth) => teachingModes.find(m => m.key === d) ?? teachingModes[1]

interface Props {
  roleId: string
  depth: GuideDepth
  onDepthChange: (d: GuideDepth) => void
  /**
   * 这一场结束。
   *
   * `seconds` / `turns` 是**真的**，由 TutorFlow 自己测出来 ——
   * 结算页上「本次学习记录」那一栏写的每个数都得是这一场真发生的，
   * 不能拿 mockData 里的固定值顶上：学生聊了 40 秒就退出，
   * 结算页却写「学习时长 15 分钟」，那是编。
   */
  onFinish: (r: {
    mastered: boolean
    exited?: boolean
    seconds: number
    turns: number
    /** 这一场真正走过的步骤名（去重，按走过顺序） */
    visited: string[]
    /**
     * 孩子在这一场里**抓到并纠正**的 AI 讲解错误数。
     *
     * 只数真的埋了错、又被学生指出来的那几处（node.error 存在 + 学生点过质疑）。
     * 学生质疑错了（那一步 AI 其实没问题）**不计入** —— AI 站得住不算「纠正」，
     * 把它算进来等于夸大了孩子的功劳，家长端那个数字就成了假的。
     */
    caught: number
  }) => void
  /** 拍照浮层当前开着哪种模式（null = 没开）。浮层状态在上层，因为顶栏也要跟着变 */
  shoot: ShootKind | null
  onShoot: (k: ShootKind | null) => void
  /** 拍了新题：交给上层走诊断流程；这道题的进度已存成断点 */
  onShootNew: () => void
  /**
   * 从哪个节点开始（不给就从 p2-probe 起）。
   *
   * 只为演示和验收用 —— 走完整条链路要点七八步，
   * 改一次实验台就要走一遍，没法迭代。真机上不该有这个东西：
   * 学生从哪儿进入辅导是由诊断结果决定的，不是由参数决定的。
   */
  startAt?: string
  /**
   * 上次离开时留下的断点（没有就别传）。
   *
   * 传进来就是**续学**：本子恢复成离开时的样子，停在哪一步就摆回哪一步，
   * 不从头问、也不重放那些学生已经看过的话。
   */
  snapshot?: TutorSnapshot | null
  /** 学生选择离开时，把当前进度交上去存着（存哪儿由上层决定） */
  onSaveProgress: (s: TutorSnapshot) => void
}

type ShootKind = 'newProblem' | 'myWork'

type Mode = 'chat' | 'timer' | 'answer'

/** 学生用哪种方式把答案交给同学 —— 提交界面的措辞要跟着变，不能三种都说「写在」 */
type AnswerVia = 'type' | 'voice' | 'photo'

const VIA_HEAD: Record<AnswerVia, string> = {
  type: '把答案写在笔记本里给同学看：',
  voice: '说给同学听 —— 选你刚说的那个：',
  photo: '看到你的草稿了。这道题你选的是：',
}

/**
 * 一句话念完之后、下一句开口之前的换气时间。
 *
 * ⚠️ 这里原来叫 TYPE_DELAY = 520，是「每句话固定等 520 毫秒」——
 * 一个节奏推完全程：三个字的口诀和四十个字的讲解一样长，
 * 而且**全程没有声音**。同桌是「数字同桌」，却不说话。
 * 现在改成：先念，念完停这一下，再念下一句。节奏跟着话的长短走。
 */
const BREATH_MS = 320

/**
 * 哪些气泡是「同桌真的说出口的话」—— 只有这些才进语音。
 *
 * ⚠️ 2026-09-14 修：原来是「队列里有什么就念什么」，于是三类**界面文案**
 * 也被当台词念了：
 *   · sensing —— 教研备注，界面上渲染成「同学的小心思」，但内容全是写给
 *     设计者看的（「递台阶，不催促：这一步不考故障判断」「对应课标『推理论证』」），
 *     学生听到的是一句莫名其妙的教研话
 *   · system  —— 系统提示（「本次掌握状态：已掌握」）
 *   · cite    —— 教材出处卡（「本题考纲落点：【人教版…】」）
 * 另外 student（学生自己写的字，渲染成「你写的」）也不该念 ——
 * 用同桌的音色念学生自己的话，怎么听怎么怪。
 *
 * 这条 bug 还被语音的「缺句自动上报」洗白过：前端念不到就上报，上报就被
 * 当成「待补台词」合成 —— 6 条教研备注因此真的被渲染成了音频。
 * **所以过滤必须加在念之前**，否则补渲染只会把错误固化下来。
 */
const SPEAKABLE = new Set<Bubble['kind']>(['ai', 'praise'])

/**
 * 不朗读的气泡（界面文案）停留多久 —— 按字数给，不按固定值。
 *
 * 理由和 BREATH_MS 那条一样：固定值会让 4 个字的 chip 和 35 个字的旁注
 * 一样长，短的拖沓、长的来不及看。这里给的是「扫一眼」的节奏，
 * 比朗读快得多（朗读约 68ms/字，这里 45ms/字），下限 400ms、上限 1.8s。
 *
 * ⚠️ 这是**止血值，不是终态**：这些文字的真正问题是「写给了设计者看，
 * 却摆在学生页上」，那要改内容（或干脆不显示），不是调时长能解决的。
 */
const silentMsFor = (text: string) => Math.min(400 + text.length * 45, 1800)

/**
 * 开口的句式脚手架 —— 只教「怎么开口」，不含任何学科内容。
 *
 * 为什么不给「示范答案」：那和把答案印在选项按钮上是同一件事，只是换了个位置。
 * 孩子卡住有两种原因，得分开接：
 *   · 有想法，但不知道那句话怎么起头 —— 给句式（这一排）
 *   · 根本没想法，问题太大了       —— 给「问小一点」（接脚手架，降的是粒度）
 */
const EXPRESS_STARTERS = ['我觉得是……，因为……', '我先看到……，所以猜……', '我不太确定，但我想……']

/**
 * 这一档给不给「开口句式」—— 三档差异化的第二个着力点（2026-09-14 加）。
 *
 * 判断依据是各档**自己声明过的** `probeDensity`，不是新发明一条规则：
 *   · 深聊「全程追问」→ **不给**。它承诺的是「一步都不替你走」，
 *     而句式卡就是把话头替学生起了 —— 那是半步。
 *   · 标准「关键处追问」/ 快讲「不追问」→ 给。这两档本来就愿意给扶手。
 *
 * ⚠️ 「问小一点」**不**受这条管，两档都有。
 * 它降的是问题的**粒度**，不是替学生**答**；深聊自己的定义里就写着
 * 「学生答不上来就把问题问小」。砍掉它深聊会变成死胡同。
 *
 * 为什么不用 rewrite 表做这件事：那是**换内容**，一个节点换一个节点。
 * 这条改的是**给不给扶手**，同一份内容、同一句话，只是帮不帮开头。
 * 硬塞进 rewrite 表要复制一遍全部 express 节点，改一处文案就得改两处。
 */
const givesStarter = (d: GuideDepth) => modeOf(d).strategy.probeDensity !== '全程追问'

/**
 * 实验台注册表 —— 节点只声明「这一步用哪个实验台」，具体长什么样在这儿查。
 *
 * 和 teachingModes「教法插件」同一个思路：本文件不认识任何**具体**的实验台，
 * 只认识「这个节点有个 lab 要渲染」。以后加第二个实验台（力学斜面、化学滴定……），
 * 在这里加一行、在 LabKind 里加一个 key 就行，下面的渲染逻辑一行都不用改。
 */
const LABS: Record<LabKind, ComponentType<{ onDone: () => void }>> = {
  voltmeter: VoltmeterLab,
}

export default function TutorFlow({
  roleId,
  depth,
  onDepthChange,
  onFinish,
  shoot,
  onShoot,
  onShootNew,
  startAt,
  snapshot,
  onSaveProgress,
}: Props) {
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
  /**
   * 「我觉得讲错了」用过没有 —— **按节点记**，不是一个全局开关。
   *
   * 原来是个布尔量：整个挂载周期只能用一次，用过就永久变灰。
   * 问题是这个按钮就贴在右下角最显眼处，讲别的内容时手一滑就消耗掉了；
   * 等真走到埋错的那一步（全流程唯一一处 node.error）想演示
   * 「AI 讲错了，学生能当场质疑」，按钮已经点不动 ——
   * 招牌能力恰好在该展示的那一步展示不了。
   *
   * 改成按节点记：每一步都有自己的一次机会，误触的代价降到最小。
   */
  const [challengedAt, setChallengedAt] = useState<Set<string>>(() => new Set())
  /** 这一步用没用过「我觉得讲错了」 */
  const challenged = challengedAt.has(node.id)
  const [answerVia, setAnswerVia] = useState<AnswerVia>('type')
  /**
   * 脚手架展开到第几层（0 = 没展开）。
   * 学生卡住时降低的是**问题的粒度**，不是把候选答案递过去 ——
   * 答案一摆出来，任务就从「生成」降级成「识别」了。
   */
  const [scaffoldStep, setScaffoldStep] = useState(0)
  /** 状态类问句的兜底入口：两个选项都不像他的情况时，让他自己说 */
  const [freeOpen, setFreeOpen] = useState(false)

  /* ── 语音：说 / 点 / 写 三条等价通道里的第一条（复用已有语音层） ── */
  const { listen } = useListening()
  const [listening, setListening] = useState(false)
  /* 同桌的声音。原型的辅导端**一句都没出过声** —— 这是这次补上的 */
  const { speak, stop, muted, setMuted, canSpeak } = useSpeech()
  /** 这句是真听懂的还是原型模拟的 —— 界面如实标出来，不装作真听懂了 */
  const [heard, setHeard] = useState<'real' | 'mock' | null>(null)
  /** 「不知道怎么说」面板：句式脚手架 + 问小一点 */
  const [helperOpen, setHelperOpen] = useState(false)
  /** 题干条展不展开（默认收起，见顶栏那段注释） */
  const [showProblem, setShowProblem] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  /** 档位改写：同一份内容换讲法（快讲 → 跳过苏格拉底链，直接结论＋验证题） */
  const resolveId = useCallback((id: string, d: GuideDepth) => modeOf(d).rewrite[id] ?? id, [])

  /**
   * 热身题是从哪一步岔出去的。
   *
   * 用 ref 不用 state：它只在「回到那一步」的那一刻被读一次，
   * 不需要触发重渲染；放 state 只会让 enter 多背一个依赖。
   */
  const warmupFromRef = useRef<string | null>(null)

  /**
   * 当前停在哪一步 —— 存的是**改写之前的原脚本 id**。
   *
   * ⚠️ 2026-09-14 修：切档原来是 `enter(node.id, d)`，而 `node` 存的是
   * **resolveId 之后**的节点。于是同一趟走下来被解析了两次：
   *   resolveId('p2-fast', '标准') → 标准的 rewrite 表里没有 'p2-fast'
   *   → `?? id` 原样返回 'p2-fast' → **人卡在快讲那一页，切不出去**。
   * 反向也一样：从标准的 p2-teach-direct 切深聊，深聊 rewrite 是空表，
   * 永远回不到彩灯版。
   *
   * 记着原 id，切档才有得可切 —— 而且语义正好对：
   * 「原 id」就是**当初从哪一步岔出去的**。从快讲切回标准，
   * 因为快讲是抄近路、没有对应的「标准版节点」，就退回分岔点重讲这一段
   * （本子上的历史不动，只重摆当前这一步）。
   */
  const baseIdRef = useRef<string>('p2-probe')

  /** 这一场从什么时候开始的 —— 结算页的「学习时长」得自己测，不能编 */
  const startedAtRef = useRef(performance.now())

  /**
   * 学生这一场**真的走过**哪几步（存人话名字）。
   *
   * 结算页「这趟你已经拿到了」原来读的是 mockData 里写死的两条断言
   * （「弄清了电压为 0 代表元件正常」…）。学生第一步就退出，
   * 结算页照样说他弄明白了这两件事 —— 又是一次「把假设当事实」。
   * 现在改成按实际走过的步骤列，一步没走就一条都不列。
   */
  const visitedRef = useRef<string[]>([])

  /** 记一笔「这一步他走过了」。同一步重复进（热身回到原处）只记一次 */
  const noteVisit = (n: ScriptNode) => {
    const label = n.title ?? n.id
    if (!visitedRef.current.includes(label)) visitedRef.current.push(label)
  }

  /** 换一步时要清掉的界面状态。抽出来是因为「回到上一步」也得清同一批 */
  const resetStepUi = useCallback(() => {
    setScaffoldStep(0) // 换节点必须收起脚手架，否则上一步的小问题会串到下一步
    setFreeOpen(false)
    setHelperOpen(false)
    setHeard(null)
    setDraft('')
  }, [])

  const enter = useCallback(
    (
      id: string,
      d: GuideDepth = depth,
      /** 上一步的选项托带的「同桌接一句」，排在新节点内容前面。见 ChatOption.reply */
      reply?: Bubble[],
    ) => {
      /*
       * 哨兵：从热身题**回到岔出去的那一步**。
       *
       * 「刚才那一页是哪一页」只有运行时才知道，写不进静态脚本 ——
       * 所以脚本里留个 '@back'，在这儿拦下来换成真实节点。
       *
       * 和普通 enter 的区别：**不重放那一步的气泡**。
       * 学生刚才就在那一页上，本子里已经写着那些话；再念一遍
       * 反而会让他以为自己被送回了更早的地方。
       * 这里只把节点摆回来，那个问题原样等着他答。
       */
      if (id === BACK_TO_CALLER) {
        const back = warmupFromRef.current ?? 'p2-step2'
        baseIdRef.current = back
        setNode(script[resolveId(back, d)])
        resetStepUi()
        setQueue([])
        return
      }
      baseIdRef.current = id // 切档要用它重新解析，见 baseIdRef 的注释
      const n = script[resolveId(id, d)]
      setNode(n)
      noteVisit(n)
      resetStepUi()
      const bubbles: Bubble[] = n.sensing ? [{ kind: 'sensing', text: n.sensing }, ...n.bubbles] : [...n.bubbles]
      /*
       * reply 排在最前面：先回应学生刚点的那一下，再进新内容。
       * 没有 reply 时行为和以前**逐字节相同**（bubbles 原样），
       * 所以合并节点这件事不会碰到任何其他路径。
       */
      setQueue(reply?.length ? [...reply, ...bubbles] : bubbles)
    },
    [depth, resolveId, resetStepUi],
  )

  useEffect(() => {
    if (entered) return
    setEntered(true)
    /*
     * 有断点就是**续学**：本子恢复成离开时的样子，人摆回停下的那一步，
     * 已经说过的话一个字都不重念。没有断点才从头起。
     *
     * queue 置空是有意的 —— 续学时没有「同桌正在说」的过程，
     * 该说的上次已经说完了。
     */
    if (snapshot) {
      setHistory(snapshot.history)
      const n = script[resolveId(snapshot.nodeId, depth)]
      setNode(n)
      noteVisit(n) // 续学：停下时那一步也算走过
      setQueue([])
    } else {
      enter(startAt ?? 'p2-probe')
    }
    /* startAt / snapshot 不进依赖：它们只在挂载那一刻起作用。
       中途换起始节点或换断点，必须靠上层的 key 重新挂载，
       否则会和已经聊过的历史打架 */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, enter])

  /**
   * 数字同学在说话中 —— **念完一句再推进下一句**。
   *
   * ── 改动前是什么样 ──────────────────────────────────────
   * 每句话固定等 520 毫秒就冒出来，全程没有声音。
   * 「数字同桌」不说话，只在本子上刷字 —— 这是这个原型最大的形态缺口。
   *
   * ── 两个刻意的选择 ──────────────────────────────────────
   * ① **先写进本子，再开口念**。学生能边听边看；语音万一没出来
   *    （浏览器没中文语音 / 被拦截），字已经在纸上了，流程不会卡死。
   * ② 用 speakGenRef 而不是 effect 的 cleanup 来作废。
   *    因为 queue 一变（slice 之后）effect 就会重跑，
   *    若用 cleanup 收尾，会把**刚开口的那句**当场掐掉，
   *    变成每句话都只说半句。用代次号判断，就只在真正换节点时作废。
   */
  const speakGenRef = useRef(0)
  /**
   * 已经念过的那一条（比对象身份，不是比文字 —— 脚本里本来就有重复句）。
   *
   * 为什么需要它：`speak` 的身份跟着 muted 变，学生中途点一下静音，
   * 这个 effect 就会重跑一次。没有这道闸，同一句话会被写进本子两遍。
   * 有闸的话直接跳过，在飞的那次 await 会照常把队列推进下去。
   */
  const spokenRef = useRef<Bubble | null>(null)

  useEffect(() => {
    if (queue.length === 0) {
      setMood('listening')
      return
    }
    const cur = queue[0]
    setMood(moodFromBubbleKind(cur.kind))
    if (spokenRef.current === cur) return
    spokenRef.current = cur
    const gen = ++speakGenRef.current
    const run = async () => {
      setHistory(h => [...h, cur])
      // 该念的才念；界面文案只显示、不出声（见 SPEAKABLE）
      await (SPEAKABLE.has(cur.kind) ? speak(cur.text) : wait(silentMsFor(cur.text)))
      if (speakGenRef.current !== gen) return // 期间换了节点 / 学生退出了
      await wait(BREATH_MS)
      if (speakGenRef.current !== gen) return
      setQueue(q => q.slice(1))
    }
    void run()
  }, [queue, speak])

  /* 离开这一屏就别再念了 */
  useEffect(() => () => stop(), [stop])

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

  const pick = (label: string, next: string, echo?: string, reply?: Bubble[]) => {
    writeStudent(echo ?? label)
    setMood('thinking')
    if (next === 'timer') {
      setMode('timer')
      return
    }
    enter(next, depth, reply)
  }

  const submitInput = () => {
    if (!node.input) return
    // 开放作答没有 quickFill：空着不能提交，否则「写完了」就成了跳过键
    const text = draft.trim() || node.input.quickFill || ''
    if (!text) return
    writeStudent(text)
    setDraft('')
    setMood('thinking')
    enter(node.input.next)
  }

  /** 状态类问句的兜底：学生用自己的话报告状态（选项盖不住的那部分） */
  const submitFree = () => {
    if (!node.freeInput) return
    const text = draft.trim()
    if (!text) return
    setFreeOpen(false)
    pick(text, node.freeInput.next, text)
  }

  /**
   * 让同桌听学生说。
   *
   * 识别结果**不直接提交**，先落进输入框让学生看一眼 —— 识别错一个字，
   * 就可能把一个本来想对了的孩子判成答错，那比一开始不给选项伤得重。
   * 看一眼、改一下，再交出去。
   */
  const talk = async () => {
    if (!node.input || listening) return
    setListening(true)
    // 陪一个最短「我在听…」的时长：模拟识别是瞬时返回的，
    // 不垫一下，学生按下去会觉得没反应（真识别本来就要等）
    const [r] = await Promise.all([listen(node.input.simulatedSay ?? ''), wait(900)])
    setListening(false)
    if (!r.text) return
    setDraft(r.text)
    setHeard(r.real ? 'real' : 'mock')
  }

  const submitAnswer = (label: string, next: string) => {
    setMode('chat')
    writeStudent(label)
    setMood('thinking')
    enter(next)
  }

  /**
   * 切换引导深度：立刻用新档位重讲当前这一步，不用回退重来。
   *
   * ⚠️ 传的是 baseIdRef（**原脚本 id**），不是 node.id。
   * node.id 已经被上一档改写过了，再解析一次会被 `?? id` 原样返回，
   * 结果是「切了档，页面纹丝不动」。完整推导见 baseIdRef 的注释。
   */
  const switchDepth = (d: GuideDepth) => {
    setShowDepth(false)
    if (d === depth) return
    onDepthChange(d)
    const m = modeOf(d)
    setHistory(h => [...h, { kind: 'system', text: `已切换到【${d}】· ${m.desc}` }])
    enter(baseIdRef.current, d)
  }

  /**
   * 容错四步闭环：学生指出讲错了 → 发现 / 承认 / 修复 / 沉淀
   *
   * 分两条路，这是这次修掉的关键一处：
   *  · 这一步真的埋了错（node.error）→ 走完整四步，而且「承认」里
   *    引用的是它**真说过的那句原话**，不是套话；
   *  · 这一步没问题 → 如实说自己核对过，而不是顺着学生改口。
   *    学生也会质疑错。一律认错那是讨好 —— 孩子会学到
   *    「只要我坚持，它就会承认」，那比讲错一次更麻烦。
   */
  const challenge = () => {
    if (challenged) return
    setChallengedAt(s => new Set(s).add(node.id))
    setMood('thinking')
    const steps: FallbackLoopStep[] = node.error
      ? fallbackLoopFor(node.error.quote, node.error.fix)
      : [{ step: '修复', who: 'AI', text: noErrorChallengeReply }]
    setQueue(q => [
      ...q,
      ...steps.map(f => ({
        kind: (f.who === '学生' ? 'student' : f.step === '沉淀' ? 'system' : 'ai') as Bubble['kind'],
        text: f.step === '发现' ? f.text : `【${f.step}】${f.text}`,
      })),
    ])
  }

  /** 停下的那一步的人话名字。脚本没写 title 就退回一句通用的，不留空白 */
  const nodeTitle = node.title ?? '上次停下的那一步'

  /**
   * 收尾统一走这儿：把这一场**真实发生**的数据一起交上去。
   *
   * turns 数的是学生实际回答了几轮 —— 不是脚本里排了几步。
   * 结算页要写「引导轮次 N 轮」，那个 N 必须是他真答的轮数。
   */
  const finish = (r: { mastered: boolean; exited?: boolean }) =>
    onFinish({
      ...r,
      seconds: Math.round((performance.now() - startedAtRef.current) / 1000),
      turns: history.filter(b => b.kind === 'student').length,
      visited: [...visitedRef.current],
      // 从过程算，不在数据层写死 —— 和 visited 一个道理（见 mockData 里
      // exitSummary.gained 被删掉的那条注释：任何「学生的收获」都不能预置）
      caught: [...challengedAt].filter(id => script[id]?.error).length,
    })

  /**
   * 体面退出：不追问原因，不留「未完成」标记。
   *
   * ── 三条路都会留下续学点 ──────────────────────────────
   * `save` 和 `pause` 的区别**只在要不要当面承诺**：
   *   · save  —— 明说「存好了，下次从这一步接着问」
   *   · pause —— 嘴上只说「位置我记着」，不逼他承诺下次还来
   * 两条都真的存。这不是我加的戏：家长端和成长档案里四处写着
   * 「选择『今天先放一放』，第二天自己从断点续上」，
   * 6 处文案以前全是假的 —— 学生端根本没存过任何东西。
   * 与其把那 6 处删掉（那等于把「体面退出」这个差异点一起删了），
   * 不如让它成真。
   *
   * `easier` 不存，也**不动**已经存过的那个 —— 他只是岔去热个身，不是要走。
   */
  const doExit = (o: ExitOption) => {
    setShowExit(false)

    if (o.key === 'easier') {
      /* 热身是从**当前这一步**岔出去的，热完得回到这儿。
         已经在热身里就别再套一层，否则连按两次会一路退回更早的页。
         存 baseIdRef（原 id）：warmupFromRef 最后会被喂给 enter()，
         喂改写过的 id 会踩和切档同一个坑 */
      if (baseIdRef.current !== 'p2-warmup' && baseIdRef.current !== 'p2-warmup-hint') {
        warmupFromRef.current = baseIdRef.current
      }
      setHistory(h => [
        ...h,
        { kind: 'student', text: o.label },
        ...(o.reply ? [{ kind: 'ai' as const, text: o.reply }] : []),
      ])
      setTimeout(() => enter('p2-warmup'), 700)
      return
    }

    onSaveProgress({
      nodeId: node.id,
      title: nodeTitle,
      /* 连队列里还没念完的话一起收进去 ——
         否则续学时本子会比学生记忆里短一截 */
      history: [...history, ...queue, { kind: 'student', text: o.label }],
    })

    const reply =
      o.key === 'save'
        ? `存好了。下次打开，我直接从「${nodeTitle}」这一步接着问你，不用重头讲。`
        : `好，今天到这儿，不问你为什么。你刚才自己弄明白的那几步都留着 —— 位置我也记着，想回来随时接得上。`

    setHistory(h => [...h, { kind: 'student', text: o.label }, { kind: 'ai', text: reply }])
    setTimeout(() => finish({ mastered: false, exited: true }), 700)
  }

  /**
   * 快门按下之后分两条路 —— 因为拍的东西根本不是一回事。
   *
   *  · 拍新题：交给上层走诊断流程。这道题的进度已经存成断点，
   *    关掉浮层就回到刚才那一步，笔记本里的内容一个字都不会少。
   *  · 拍解题过程：留在这一屏。同学看的是过程不是答案，
   *    所以拍完直接进入提交，不打断这道题。
   */
  const shootDone = () => {
    const kind = shoot
    onShoot(null)
    if (kind === 'newProblem') {
      onShootNew()
      return
    }
    writeStudent('（拍了草稿纸）')
    setAnswerVia('photo')
    setMode('answer')
  }

  /** 阶段3 三种提交方式：各走各的路，不再三个按钮干同一件事 */
  const answerWays = [
    { Icon: IconPencil, label: '打字写答案', act: () => { setAnswerVia('type'); setMode('answer') } },
    { Icon: IconMic, label: '语音说', act: () => { setAnswerVia('voice'); setMode('answer') } },
    { Icon: IconCamera, label: '拍照上传', act: () => onShoot('myWork') },
  ]

  const waiting = queue.length > 0
  /* 节点声明了实验台就查表取组件 —— 查不到 key 会在这里就是 undefined，
     不会静默渲染出一块空白（LabKind 是联合类型，注册表少写一个键 TS 直接报错） */
  const LabComp = node.lab ? LABS[node.lab.kind] : null
  const labNext = node.lab?.next
  const currentStage: Stage = mode === 'timer' || mode === 'answer' ? 3 : node.stage
  const currentInterest = node.interestContext ? interestContexts[node.interestContext] : null
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  /*
   * 「我卡住了 / 不知道怎么说」这个入口还有没有东西可给。
   *
   * 为什么必须判：深聊档不给句式，如果学生又把「问小一点」点完了，
   * 面板就成**一个空虚线框** —— 点开什么都没有。标准档不会遇到，
   * 因为句式那一排永远在；深聊会。所以入口本身要跟着一起消失。
   */
  const canStarter = givesStarter(depth)
  const canScaffold = !!node.input?.scaffolds && scaffoldStep < node.input.scaffolds.length
  const hasHelper = canStarter || canScaffold

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

        {/*
          题干常驻条 —— 学生答到一半必须能回看原题。
          原来题干只在诊断屏和拍照屏出现过，一进辅导流程就没了，
          而脚本里到处在引用题干里的具体数值
          （「测 L₂ 两端电压等于电源电压」「两只灯都不亮」）——
          学生记不住就只能瞎猜，那测的就不是推理，是记忆力。

          为什么默认收起而不是全文摊开：这是手机形状的屏，题干全文三行
          要吃掉约六分之一高度，一直摊着会把笔记本压扁。
          收起时留**一行预览**，所以它始终「在」，一点就全开。

          ⚠️ 数据源是 mockData 里的常量 `diagnosis`（同 `knowledgePoint`，
          见上面那行）。真机上应该是「这道题识别出来的原文」，
          原型只有一条主线所以写死 —— 和 DEMO_REVIEW_POINT 是同一处妥协。
        */}
        <div className="mt-2 rounded-xl bg-white border border-ink-200 overflow-hidden">
          <button
            onClick={() => setShowProblem(o => !o)}
            className="tap w-full px-3 py-2 flex items-center gap-2 text-left"
          >
            <span className="text-[11px] font-bold text-ink-400 shrink-0 tracking-wide">题干</span>
            {!showProblem && (
              <span className="text-[12px] text-ink-600 truncate flex-1 min-w-0">
                {diagnosis.ocrText.split('\n')[0]}
              </span>
            )}
            <span className="ml-auto shrink-0 text-[11px] font-bold text-brand-600">
              {showProblem ? '收起' : '展开'}
            </span>
          </button>
          {showProblem && (
            <p className="px-3 pb-2.5 text-[12.5px] text-ink-800 leading-[1.85] whitespace-pre-line">
              {diagnosis.ocrText}
            </p>
          )}
        </div>
      </div>

      {/* 数字同桌形象区（常驻，不是聊天头像）+ 引导深度切换 */}
      <div className="shrink-0 bg-gradient-to-b from-white to-[#eaf2fb] px-4 pt-3 pb-2.5 border-b border-ink-100/70">
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* 64px 是形象的主要展示位，用 V2-B：头歪 + 状态符号，六种表情一眼可分 */}
            <ClassmateAvatarV2 mood={mood} size={64} roleId={roleId} variant="B" />
            {waiting && (
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-cheer-500 rounded-full border-2 border-white">
                <span className="absolute inset-0 animate-ping rounded-full bg-cheer-400 opacity-60" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-bold text-ink-900">你的同桌 · {TONGZHUO_NAME}</span>
              <span className="chip bg-brand-50 text-brand-700 text-[10.5px]">{role.style}</span>
            </div>
            <div className="text-[12px] text-ink-500 mt-0.5 truncate">
              {waiting
                ? muted
                  ? '正在写笔记给你看…'
                  : '正在讲给你听…'
                : studentSays
                  ? `我在看你写的「${studentSays}」`
                  : '把你不会的题拿过来，我们一起想明白'}
            </div>
          </div>

          {/*
            静音开关。辅导端原来没有 —— 但面试现场、投影、图书馆
            都需要能当场关掉声音，否则演示时要么吵到别人，
            要么得去系统音量里找。放这儿：一眼看得见、一下点得到。
            文案只留图标，省下的横向空间给上面的名字。
          */}
          <button
            onClick={() => setMuted(m => !m)}
            aria-label={muted ? '打开同桌的声音' : '静音'}
            title={muted ? '打开同桌的声音' : canSpeak ? '静音' : '这台机器放不出声，只能看字幕'}
            className={`tap shrink-0 w-8 h-8 rounded-xl border flex items-center justify-center ${
              muted ? 'bg-ink-50 border-ink-200 text-ink-400' : 'bg-white border-brand-200 text-brand-700'
            }`}
          >
            {muted ? <IconSoundOff className="w-4 h-4" /> : <IconSound className="w-4 h-4" />}
          </button>

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

        {/*
          实验台 —— 节点声明了 lab 就渲染，做完进 node.lab.next。
          它和 options / input 互斥：一个节点要么让学生说话，要么让他动手，
          不该同时递给他两件事。所以门槛和那两块一样（chat + 不 waiting）。

          ⚠️ 位置是刻意的：**放可滚动区，不放交互区**。
          交互区是 shrink-0，而实验台比它能拿到的空间高得多，
          多出来的部分会被手机框的 overflow-hidden 从底部裁掉 ——
          第一版就栽在这儿，裁掉的正好是「猜读数」那三个按钮。
          于是整个实验台像坏了一样：按钮点不到，表也拖不动
          （表要猜完才让拖，那是设计不是 bug）。放这儿就能滚。
        */}
        {mode === 'chat' && !waiting && LabComp && (
          <div className="mx-auto max-w-[360px] mt-3">
            {/* key 用节点 id：换节点必须换一个全新的实验台，
                否则上一轮拖到一半的位置会被 React 复用过来 */}
            <LabComp key={node.id} onDone={() => labNext && enter(labNext)} />
          </div>
        )}
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
              {answerWays.map(({ Icon, label, act }) => (
                <button
                  key={label}
                  onClick={act}
                  className="tap flex-col gap-1 rounded-2xl border-2 border-ink-100 py-3 text-ink-700 active:scale-[.98] transition"
                >
                  <Icon className="w-5 h-5 text-brand-600" />
                  <span className="text-[12.5px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
            <button
              className="btn-primary py-3"
              onClick={() => {
                setAnswerVia('type')
                setMode('answer')
              }}
            >
              我算好了
            </button>
          </div>
        )}

        {/* 阶段3→4：提交答案 */}
        {mode === 'answer' && (
          <div className="animate-fadeUp">
            <div className="text-[12.5px] text-ink-400 mb-2.5">{VIA_HEAD[answerVia]}</div>
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

        {/*
          选项区 —— 只留给**状态类**问句：
          「你还记得吗」「你是怎么想的」问的是学生自己的状态，
          选项是在帮他命名，不是在替他作答，所以合法。
          （内容类问句不给选项，见下面 node.input 那段）
        */}
        {mode === 'chat' && !waiting && node.options && !freeOpen && (
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
                onClick={() => pick(o.label, o.next, o.echo, o.reply)}
                className="btn-ghost py-3 text-[15px] justify-start px-4 text-left leading-snug"
              >
                {o.label}
              </button>
            ))}
            {/* 两个选项永远盖不住所有真实状态 —— 留个开口，
                别让学生被迫认领一个「最像的」（那才是思维定式） */}
            {node.freeInput && (
              <button
                onClick={() => setFreeOpen(true)}
                className="tap w-full py-1.5 text-[12.5px] text-ink-400 underline underline-offset-2"
              >
                {node.freeInput.hint}我自己说
              </button>
            )}
          </div>
        )}

        {/* 兜底入口展开后：学生用自己的话报告状态，选项让位 */}
        {mode === 'chat' && !waiting && node.freeInput && freeOpen && (
          <div className="animate-fadeUp">
            <div className="text-[12.5px] text-ink-400 mb-2">那你自己说，说多短都行：</div>
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={node.freeInput.placeholder}
              rows={2}
              className="w-full rounded-2xl border-2 border-ink-100 px-4 py-3 text-[15px] leading-relaxed resize-none focus:border-brand-300 outline-none font-[cursive]"
            />
            <div className="flex gap-2.5 mt-2.5">
              <button
                onClick={() => {
                  setFreeOpen(false)
                  setDraft('')
                }}
                className="tap px-3 rounded-xl bg-ink-100 text-ink-700 text-[13px] font-semibold shrink-0"
              >
                回到选项
              </button>
              <button className="btn-primary py-3 flex-1 disabled:opacity-40" disabled={!draft.trim()} onClick={submitFree}>
                写完了
              </button>
            </div>
          </div>
        )}

        {/*
          作答区 —— 两种通道分开：
          · express 内容类：学生要自己说出学科结论，**只给开放输入**，
            不给「照着说一遍」，卡住时给的是更小的问题（脚手架）；
          · 缺省 复述类：照着说一遍定理/概念，保留原有行为。
        */}
        {mode === 'chat' && !waiting && node.input && (
          <div className="animate-fadeUp">
            <div className="text-[12.5px] text-ink-400 mb-2">
              {node.input.channel === 'express' ? '同学把下一页翻过来，等你说说怎么想：' : '自己写一遍给同学看：'}
            </div>

            {/* 脚手架：把问题问小一点，但小问题本身仍要学生自己回答 */}
            {scaffoldStep > 0 && node.input.scaffolds && (
              <div className="mb-2.5 rounded-2xl bg-brand-50 border border-brand-100 px-3.5 py-3 space-y-2">
                <div className="text-[11.5px] font-bold text-brand-700">同学把问题问小一点，你答这个就行：</div>
                {node.input.scaffolds.slice(0, scaffoldStep).map((s, i) => (
                  <div key={i} className="text-[13px] text-ink-700 leading-relaxed">
                    {i + 1}. {s}
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={
                scaffoldStep > 0 && node.input.scaffoldPlaceholder
                  ? node.input.scaffoldPlaceholder
                  : node.input.placeholder
              }
              rows={2}
              className="w-full rounded-2xl border-2 border-ink-100 px-4 py-3 text-[15px] leading-relaxed resize-none focus:border-brand-300 outline-none font-[cursive]"
            />
            {/* 说的字和写的字落在同一个地方，来源如实标出来 */}
            {heard && (
              <p className="text-[11px] text-ink-400 mt-1.5 leading-relaxed">
                {heard === 'real'
                  ? '上面是我听到的，不对就直接改。'
                  : '（原型模拟识别）上面这句是原型替你写的 —— 真机上这里是识别结果，不对可以直接改。'}
              </p>
            )}

            <div className="flex gap-2.5 mt-2.5">
              {node.input.channel === 'express' ? (
                <>
                  {/* 说 —— 三条等价通道里的第一条（复用已有语音层）。
                      语音适合表达思路（「我觉得是……因为……」），不适合报数值，
                      所以只在开放作答出现，阶段3 的计算和起点诊断都不给。 */}
                  <button
                    onClick={talk}
                    disabled={listening}
                    className="tap px-3 rounded-xl bg-brand-500 text-white text-[13px] font-semibold shrink-0 flex items-center gap-1.5 disabled:bg-ink-200"
                  >
                    <IconMic className="w-4 h-4" />
                    {listening ? '我在听…' : '说给同桌'}
                  </button>
                  {/* 深聊不给句式，按钮就不该叫「不知道怎么说」——
                      那是在承诺一样它不打算给的东西。改说「我卡住了」，
                      点开后就只剩「问小一点」这一条路。
                      两条路都走完了就连入口一起撤掉，不留一个点开是空的框 */}
                  {hasHelper && (
                    <button
                      onClick={() => setHelperOpen(o => !o)}
                      className="tap px-3 rounded-xl bg-ink-100 text-ink-700 text-[13px] font-semibold shrink-0"
                    >
                      {helperOpen ? '收起' : canStarter ? '不知道怎么说' : '我卡住了'}
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setDraft(node.input?.quickFill ?? '')}
                  className="tap px-3 rounded-xl bg-ink-100 text-ink-700 text-[13px] font-semibold shrink-0"
                >
                  照着说一遍
                </button>
              )}
              <button className="btn-primary py-3 flex-1 disabled:opacity-40" disabled={!draft.trim()} onClick={submitInput}>
                {node.input.channel === 'express' ? '交给同桌' : '写完了'}
              </button>
            </div>

            {/* 开口面板：给的是句式，不是答案。
                深聊档不出现句式那一排 —— 详见 givesStarter */}
            {node.input.channel === 'express' && helperOpen && hasHelper && (
              <div className="mt-2.5 rounded-2xl border border-dashed border-ink-200 bg-[#fffdf5] px-3.5 py-3 animate-fadeUp">
                {canStarter && (
                  <>
                <div className="text-[11px] text-ink-400 mb-1.5">点一句就行 —— 这只是句式，不含答案</div>
                <div className="flex flex-wrap gap-1.5">
                  {EXPRESS_STARTERS.map((s, i) => (
                    <button
                      key={s}
                      onClick={() => setDraft(d => (d.trim() ? d.trimEnd() + ' ' : '') + s)}
                      className={`tap rounded-lg border border-dashed border-ink-200 bg-white px-3 text-[13px] text-ink-700 ${
                        i % 2 ? 'rotate-[.7deg]' : '-rotate-[.9deg]'
                      }`}
                    >
                      「{s}」
                    </button>
                  ))}
                </div>
                  </>
                )}
                {/* 另一种卡壳：不是不会说，是根本没想法 —— 那就把问题问小。
                    这条**两档都有**，深聊也不例外（降粒度 ≠ 代答）。
                    它上面的间距跟着句式行走：句式行不显示时不能再顶一段空 */}
                {canScaffold && (
                  <button
                    onClick={() => {
                      setScaffoldStep(s => s + 1)
                      setHelperOpen(false)
                    }}
                    className={`tap w-full ${canStarter ? 'mt-2.5' : ''} rounded-xl bg-brand-50 border border-brand-100 px-3 py-2 text-left text-[12.5px] font-bold text-brand-700`}
                  >
                    这个问题太大了，问小一点
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 结束 */}
        {mode === 'chat' && !waiting && node.finish && (
          <button
            className="btn-primary py-3.5 text-[16px] animate-fadeUp"
            onClick={() => finish({ mastered: node.id === 'p5-mastered' })}
          >
            看看这次学到了什么
          </button>
        )}
      </div>

      {showDepth && (
        <div className="absolute inset-0 z-20 bg-ink-900/35 flex items-end p-4" onClick={() => setShowDepth(false)}>
          <div
            className="w-full max-h-[78%] overflow-y-auto scroll-area rounded-3xl bg-white p-4 shadow-card animate-fadeUp"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-[16px] font-bold text-ink-900 mb-1">选择这次怎么讲</div>
            <p className="text-[12.5px] text-ink-400 mb-3">启发式是默认值，不是唯一值；换讲法不会重置你的进度。</p>

            <div className="space-y-2.5">
              {teachingModes.map(m => (
                <button
                  key={m.key}
                  onClick={() => switchDepth(m.key)}
                  className={`w-full rounded-2xl border-2 px-4 py-3 text-left transition ${
                    depth === m.key ? 'border-brand-400 bg-brand-50' : 'border-ink-100 bg-white active:bg-ink-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[15px] font-bold text-ink-900">{m.label}</span>
                    {depth === m.key && <span className="chip bg-brand-500 text-white text-[10.5px]">当前</span>}
                  </div>
                  <p className="text-[12.5px] text-ink-500 leading-relaxed mt-1">{m.desc}</p>
                  <p className="text-[11.5px] text-ink-400 leading-relaxed mt-1">适合：{m.scene}</p>
                  {/* Not for —— 档位之间互相指认边界。学生看到的不是三个孤立选项，
                      而是三档各自承认「我什么时候不该用」 */}
                  <p className="text-[11.5px] text-warm-700/85 leading-relaxed mt-1.5 pt-1.5 border-t border-dashed border-ink-100">
                    这时候别用我：{m.notFor.when} → 换「{m.notFor.useInstead}」
                  </p>
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

      {/*
        拍照浮层。盖在对话上，不切屏 —— 底下的笔记本原封不动，
        所以「关掉就回到刚才那一步」是真的，不是靠恢复逻辑装出来的。
      */}
      {shoot && (
        <div className="absolute inset-0 z-30 flex flex-col bg-[#121a26] animate-fadeUp">
          <PhotoUpload onShoot={shootDone} />
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