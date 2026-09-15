/**
 * 类型定义（V2）
 * 全部字段均对表《产品定位说明 V2》《核心流程说明 V2》《架构判断说明 V2》，
 * 不额外引入文档未定义的概念。
 */

export type Role = 'student' | 'parent'

export type ScreenId =
  | 'role'
  // 学生端（8 屏）
  | 'stu-onboard'
  | 'stu-home'
  | 'stu-photo'
  | 'stu-diagnosis'
  | 'stu-tutor'
  | 'stu-summary'
  | 'stu-growth'
  | 'stu-watch'
  // 家长端（6 屏）
  | 'par-home'
  | 'par-weekly'
  | 'par-weak'
  | 'par-trend'
  | 'par-plan'
  | 'par-assistant'

/** 核心流程六阶段（《核心流程说明》二、详细流程拆解） */
export type Stage = 1 | 2 | 3 | 4 | 5 | 6

export interface StageMeta {
  stage: Stage
  title: string
  owner: string
  duration: string
}

/** 学生画像：仅使用个人学情数据，不引入其他学生数据（定位说明 3.4 隐私保护） */
export interface StudentProfile {
  name: string
  grade: string
  textbook: string
  province: string
  guardianBound: boolean
}

export interface ProblemDiagnosis {
  subject: '数学' | '物理'
  grade: string
  knowledgePoint: string
  problemType: string
  textbookChapter: string
  isWeakPoint: boolean
  weakPointNote: string
  ocrText: string
}

/* ───────────────── V2：虚拟形象角色库（定位说明 3.0-3） ───────────────── */

/**
 * 官方预设初中生形象，仅 8 个，不做自由生成、不做形象付费。
 *
 * 2026-09-13：删掉 name（形象名）和 tone（说话方式）两个字段。
 * 同桌的名字只有「小元」一个（见 mockData.ts 的 TONGZHUO_NAME），
 * 形象换的只是长相；tone 从来没有渲染到界面上过，属于死数据。
 */
export interface AvatarRole {
  id: string
  /** 风格标签：运动系 / 文静系 / 幽默系 … —— 这是形象之间唯一还说得出口的差别 */
  style: string
  palette: {
    skin: string
    hair: string
    jacket: string
    jacketDark: string
    accent: string
  }
  /** 配饰：眼镜 / 发带 / 帽子 / 无 */
  extra?: 'glasses' | 'band' | 'cap' | 'hoodie'
}

/* ───────────────── V2：冷启动画像（定位说明 3.0-2、流程说明 前置能力） ───────────────── */

/**
 * 冷启动闲谈节点：趣味外壳 + 科学内核。
 *
 * 2026-09-12 起只剩两种：兴趣那一步（同桌硬猜你周末干嘛）和选形象。
 * 原来的猜人格式问句（「你八成是那种…的人」）已删除 —— 见 QuickQuestion。
 */
export type OnboardStepKind = 'chat' | 'avatar' | 'done'

/** 冷启动闲谈节点：趣味外壳 + 科学内核 */
export interface OnboardStep {
  id: string
  kind: OnboardStepKind
  /** 元宝同桌说的话 */
  ask: string
  /** 这一问在科学内核里量的是什么（原型透明标注，产品内不展示） */
  measures: string
  options?: { label: string; echo?: string; tag?: string }[]
}

/* ───────── V2：冷启动快问快答（定位说明 3.0-2） ───────── */

/**
 * 冷启动里的一道快问快答。
 *
 * ── 为什么是「两个具体场景里挑一个」，不是「你八成是那种…的人」──
 * 大五的成熟测法是**迫选**（forced-choice）：给两个真实会发生的情境，逼你挑一个。
 * 它比量表准、也比量表快，而且学生答的是「我会怎么做」，不是「我是什么样的人」——
 * 后者会把他推到「我在被评价」的位置上，答案就不真了。
 *
 * ── 两个选项必须一样体面 ──
 * 只要有一个明显更「好」，学生答的就是「应该选什么」，而不是「我会怎么做」。
 * 所以每一对都写成两种都说得过去、都像正常人会选的样子，谁也不比谁高级。
 */
export interface QuickQuestion {
  id: string
  /** 测大五的哪个维度（原型透明标注，产品内不展示） */
  dimension: string
  /** 场景句 —— 初中生真的会遇到的事，不是抽象特质形容词 */
  scene: string
  /** 两个选项。顺序有意义：下标和 high / pledge 一一对应 */
  choices: [string, string]
  /** 哪个选项指向该维度的高端（0 或 1）。只进系统，不给孩子看 */
  high: 0 | 1
  /**
   * 答完这一题，同桌往后打算怎么陪 —— 两个选项各写一条。
   *
   * ⚠️ 记的是「我打算怎么陪你」，不是「你是什么样的人」。
   * 前者是 AI 的承诺，孩子看了会觉得被接住；
   * 后者是给孩子贴标签，《产品定位说明》「刻意不做的事」明令禁止。
   */
  pledge: [string, string]
  /**
   * 同桌在这一题插一句猜测。不设这个字段就不猜。
   *
   * 只出现在 10 题里的 3 题上。每题都猜会打断节奏，更要紧的是——
   * 猜了之后学生会不自觉往猜的那边靠，采到的东西就不准了。
   */
  guess?: {
    /**
     * 猜学生选第几个。
     * - 0 / 1 直接猜某个下标
     * - 'echo' 跟上一题选同一个下标（同维度相邻两题用）—— 同桌真的在往下推，不是每道题都重新硬猜
     */
    pick: 0 | 1 | 'echo'
    /** true = 第一题，手上没线索，老实承认自己是硬猜的 */
    blind?: boolean
  }
}

/**
 * 学科起点诊断：不问「你数学好不好」，直接看做题（架构说明 五）。
 *
 * ⚠️ 2026-09-12 起**不在冷启动出题**：第一次见面就考他，是对关系的透支，
 * 而且学生会学到「我说什么，你都会拿来考我」，之后就不敢说真话了。
 * 这两道题留给**第一次真实辅导**——那时候他本来就是带着题来的。
 * 原型尚未在辅导页接线，这里先把题留着（别当死代码删了）。
 */
export interface StartProbe {
  id: string
  /** 指向知识点库（同 WrongProblem.pointId：学科和知识点名从库里查，不手写） */
  pointId: string
  subject: '数学' | '物理'
  question: string
  choices: string[]
  answerIndex: number
  knowledgePoint: string
}

/** 大五的一维：粗档 + 它到底影响什么（不说「你是什么样的人」） */
export interface ProfileTrait {
  /** 维度名，如「尽责性」 */
  name: string
  /** 粗档：偏低 / 中等 / 偏高 —— 每维只有 2 题，只够定这么细，别装精确 */
  level: string
  /** 这一维决定的是**怎么陪他学**，不是他是什么人 */
  usedFor: string
}

/**
 * 画像 V0：大五人格只用于过程支持适配，不向用户输出人格定论。
 *
 * 冷启动当天只拿得到两样：兴趣、大五五维的粗档（每维 2 题）。
 * 动机和学科起点**不在冷启动采**（见 StartProbe 的说明）——
 * 如实列在 pending 里，不假装第一天就什么都知道。
 */
export interface ProfileV0 {
  /**
   * 冷启动**没采集**的东西，以及打算什么时候补上。
   *
   * 这一节是故意留着的：原型最容易被挑的一句是「你第一天怎么就知道这么多」，
   * 把没测的、什么时候补、为什么现在不测写在明面上，比事后解释有用。
   */
  pending: { name: string; why: string; when: string }[]
}

/* ───────────────── 知识点库（对齐实战题背景的「学科—知识点—题型」） ───────────────── */

/**
 * 一个知识点。
 *
 * ── 它为什么必须存在 ────────────────────────────────────────
 * 「识别并**持续跟进**薄弱知识点」是这道实战题标题里的第一个动词。
 * 「识别」好办（诊断、错题本都能做），难的是「跟进」——
 * 跟进需要一个**稳定的追踪单元**：你得知道「电路分析」底下分几个子知识点，
 * 才能追踪「他到底是欧姆定律不会，还是串并联分不清」。
 *
 * 没有这张网，「薄弱点」就只是一个字符串标签，
 * 系统既不知道该往回查什么（prereq），也不知道该拿什么跟它区分（confusable），
 * 更不知道几天后该拿什么题来复查（problemTypes）。
 *
 * ── 字段对应实战题背景里的哪句话 ──────────────────────────────
 * · 「按学科—知识点—题型组织」→ subject / name / problemTypes
 * · 「不同教材在章节顺序与解法引入上存在差异」→ textbookNote
 * · 「已授权的自有知识点库」→ 归我们使用，不是我们去发明
 *
 * ⚠️ 本库**不是**产品的核心竞争力，是产品的底座。交付文档里要写
 * 「我们怎么用这个库」，不能写成「我们建了一个库」——后者是复述题干。
 */
export interface KnowledgePoint {
  id: string
  subject: '数学' | '物理'
  /** 知识点名。学生端会看到，用教材原词，不要另造说法 */
  name: string
  /** 教材定位（人教版）。写全，因为「翻到书上哪一页」是家长的信任凭据 */
  textbook: {
    book: string
    chapter: string
    section: string
  }
  /**
   * 前置知识点 id —— 查漏补缺要往回查的那几环。
   *
   * 这是「持续跟进」最值钱的一个字段：学生这道题不会，
   * **不一定是这个知识点没学会**，很可能是更底下的一环塌了。
   * 只知道「他串联电路错了 4 次」没有用；知道「他错在串联电路，
   * 但根子在串联和并联都分不清」，才谈得上跟进。
   */
  prereq: string[]
  /**
   * 易混知识点 id —— 错题归因用。
   *
   * 「串并联特点混淆」「判别式符号判断出错」这类归因，
   * 靠的就是这一栏。它同时是出题依据：复习时优先拿两个易混点对比着考。
   */
  confusable: string[]
  /** 这个知识点下学生真正会遇到的题型（真题三级结构的第三级） */
  problemTypes: string[]
  /**
   * 教材版本差异。**只知道才写，不知道就不写** ——
   * 这一栏是给家长看的信任凭据，编一条比空着伤得重。
   */
  textbookNote?: string
  /**
   * 这个知识点是否已进入原型演示链路（原型只用得到其中一部分）。
   * 分这两个状态，是为了让「库里有什么」和「演示走了哪些」不互相冒充。
   */
  inDemo?: boolean
}

/* ───────────────── V2：引导深度三档（定位说明 3.1） ───────────────── */

export type GuideDepth = '深聊' | '标准' | '快讲'

/**
 * 一档讲法 = 一个「教法插件」。
 *
 * ── 为什么它不能只是一张「节点改写表」────────────────────────
 * 旧版每档只有 label/desc/scene 三个展示字段，真正干活的是另一张
 * `depthRewrite` 表。两张表分开的后果是：**「深聊」的改写表是空的** ——
 * 它其实不算一档，只是「别的档没覆盖到，所以还是原样」。
 * 那不是三档，那是一档加两个补丁。
 *
 * 现在一档 = 一份自包含的声明：学生看到什么、说什么话会切到它、
 * 什么时候不该用它、它到底做了什么、以及它改写哪些节点。
 * **加第四档 = 加一份数据，TutorFlow 一行不用改。**
 *
 * ── 抄的是 OpenMAIC 的 SKILL.md 契约（只抄了一半）─────────────
 * 它的每个技能用同一套公式描述自己：
 * 「做什么 → Use when 用户会说的话（含原话）→ Not for X（那是兄弟技能）」。
 *
 * 我们**只抄了最后那段**（`notFor`）：档位之间互相指认边界，形成一个网，
 * 而不是一排孤立选项 —— 这是它最值钱的地方。
 *
 * 中间那段（Use when 用户会说的话）曾经也抄了，做成语音切档，后来砍掉：
 * 面板本来就是一按就开的三个按钮，再让学生对着麦克风说一遍，比直接点
 * 还多两步。**一条设计试了发现多余就砍掉，比留着好看更实在。**
 * 详见 TutorFlow 顶部关于切档通道的说明。
 */
export interface TeachingMode {
  key: GuideDepth
  /** 学生看到的档名 */
  label: string
  /** 学生看到的一句话说明 */
  desc: string
  /** 什么场景用（学生看到的场景提示） */
  scene: string

  /** Not for：什么时候不该用我、该换哪个兄弟档 —— 三档靠这个互相指认边界 */
  notFor: { when: string; useInstead: GuideDepth }

  /** 这一档到底做了什么（给开发与评审看，不给学生） */
  strategy: {
    /** 一句话说清这一档的教学法 */
    oneLine: string
    /** 会不会直接给结论 —— 这是三档最本质的差别，摊开写，别含糊 */
    givesAnswer: boolean
    /** 追问密度 */
    probeDensity: '全程追问' | '关键处追问' | '不追问'
  }

  /** 节点改写：原节点 id → 这一档下换成哪个节点。空对象 = 不改写 */
  rewrite: Record<string, string>
}

/* ───────────────── 对话脚本 ───────────────── */

export type BubbleKind = 'ai' | 'student' | 'praise' | 'cite' | 'system' | 'sensing'

export interface Bubble {
  kind: BubbleKind
  text: string
}

export interface ChatOption {
  label: string
  next: string
  /** 思路正确与否，仅用于原型内部驱动正向反馈，不向学生展示对错标签 */
  correct?: boolean
  /** 学生气泡展示文案，缺省用 label */
  echo?: string
  /**
   * 学生点了这个选项之后，同桌**接着说**的几句 —— 排在下一个节点的内容前面。
   *
   * 2026-09-14 加，为的是合并掉纯导航节点 `p2-known`：
   * 那个节点整页只有「很好，那我们就直接从解题思路开始。」＋ 一条考纲落点 cite，
   * 学生唯一的动作是点「开始吧」—— 一句话换一次点击，白搭一轮。
   * 并进选项里，同样的话一个字不少，少按一次。
   *
   * 为什么是 `Bubble[]` 而不是像 `ExitOption.reply` 那样用 string：
   * 这里要能带 **cite 卡**（考纲落点），一句纯文本表达不了。
   */
  reply?: Bubble[]
}

/**
 * 可交互实验台的种类。
 *
 * 用字符串 key ＋ TutorFlow 里的注册表，而不是在脚本数据里直接塞 React 组件：
 * 数据不该认识组件。加一个实验台 = 加一个 key ＋ 注册表里一项，
 * TutorFlow 的渲染逻辑一行都不用改 —— 和 teachingModes「教法插件」同一个思路。
 */
export type LabKind = 'voltmeter'

/**
 * 断点续学的一处存档。
 *
 * ── 为什么连**对话历史**一起存，而不只存节点 id ──────────────
 * 学生回来时看到的本子必须是他离开时的样子。
 * 只存节点 id 的话，「从这一步继续」会变成「从这一步重开」——
 * 本子空空如也，那就不叫续学。
 *
 * ── 为什么放在 App 那一层 ─────────────────────────────────
 * 理由和 followUps 一样：这个状态**跨屏**。学生首页要拿它显示
 * 「继续上次那节课」的入口，辅导屏要消费它。它不属于任何单独一屏。
 */
export interface TutorSnapshot {
  /** 停在哪一步 */
  nodeId: string
  /** 那一步的人话名字，用于「下次从「断点在哪只灯」继续」这类文案 */
  title: string
  /** 离开那一刻本子上的全部内容 */
  history: Bubble[]
}

/** 引导脚本节点 */
export interface ScriptNode {
  id: string
  /**
   * 这一步的人话名字（如「断点在哪只灯」）。
   *
   * 只用于**离开辅导之后**的文案：断点续学的提示、学生首页的「继续上次」卡片。
   * 缺省时上层退回一句通用的「上次停下的那一步」，不会渲染出空白。
   */
  title?: string
  stage: Stage
  bubbles: Bubble[]
  /** 学习状态信号（阶段2/4：只读可观测行为信号 → 调整引导策略，不下情绪结论） */
  sensing?: string
  options?: ChatOption[]
  /** 需要学生自行输入（复述定理 / 说出思路） */
  input?: {
    placeholder: string
    /**
     * 「照着说一遍」按钮填入的示范答案。
     *
     * **开放作答（channel: 'express'）不设这个字段** —— 点一下就把答案填进去再提交，
     * 学生做的还是「识别」，等于把刚拿掉的选项从后门放回来。
     * 复述类（照着说一遍定理）保留它，因为那本来就只是复述，不是作答。
     */
    quickFill?: string
    next: string
    /**
     * 作答通道（见 openspec/changes/open-response-choice）：
     * - 'express' 内容类问题 —— 学生要自己说出学科结论，只给开放输入，不给候选答案
     * - 缺省        复述类 —— 照着说一遍定理/概念（原有行为）
     */
    channel?: 'express'
    /**
     * 脚手架：学生卡住时展开的「粒度更小的问题」。
     * 只降低问题粒度，不给候选答案——把答案摆出来让他挑，任务就从「生成」降级成「识别」了。
     */
    scaffolds?: string[]
    /** 脚手架展开后替换的 placeholder（更具体，引导学生先答小问） */
    scaffoldPlaceholder?: string
    /**
     * 学生对着麦克风开口时，原型模拟他会怎么说。
     *
     * 真识别可用就用真的；不可用时回落到这句，界面如实标注「（原型模拟识别）」，
     * 不装作真听懂了。写法刻意保留口语的磕绊 —— 真实初中生不这么说话才是假的。
     */
    simulatedSay?: string
  }
  /**
   * 状态类选项的兜底入口：选项都不像学生的情况时，让他自己说。
   * 状态类问句（「你还记得吗」「你是怎么想的」）保留选项是合法的——
   * 学生在报告自己的状态，不是在猜答案。
   */
  freeInput?: {
    hint: string
    placeholder: string
    next: string
  }
  /**
   * 这一步是一个**可交互实验台**，不是文字讲解。
   *
   * 为什么要有它：这条链路原来全是「AI 说 → 学生答」，讲机制只能靠文字。
   * 而「电源电压为什么全落在断点上」是拓扑 + 电压分配，纯文字讲是逆着认知的 ——
   * 学生只能背下结论。实验台让学生自己把表挪过去，看见读数怎么变。
   */
  lab?: {
    kind: LabKind
    /** 做完进哪个节点 */
    next: string
  }
  /** 进入独立计算阶段 */
  gotoTimer?: boolean
  /** 进入本次小结 */
  finish?: boolean
  /** 情境个性化：本题情境取自学生兴趣（定位说明 3.0-2） */
  interestContext?: string
  /**
   * 这一步里 AI **自己讲错**的那处（如果确实埋了错）。
   *
   * 有它，「我觉得讲错了」这个按钮才是真的 —— 学生质疑时，
   * AI 认的必须是它真说过的那句原话（quote），不能是模板套话。
   * 反过来，没埋错的小步去质疑，AI 会如实说自己核对过、没问题：
   * **能承认错误，也要能站得住**，否则认错就成了讨好。
   */
  error?: {
    /** AI 实际说过的那句错话，认错时要原样引用它 */
    quote: string
    /** 正确的讲法 */
    fix: string
  }
}

/* ───────────────── V2：容错四步闭环（架构说明 五） ───────────────── */

export interface FallbackLoopStep {
  step: '发现' | '承认' | '修复' | '沉淀'
  who: '学生' | 'AI'
  text: string
}

/* ───────────────── V2：体面退出（定位说明 3.2） ───────────────── */

export interface ExitOption {
  key: 'pause' | 'easier' | 'save'
  label: string
  desc: string
  /**
   * AI 的回应话术，不含「未完成 / 半途而废」等字样。
   *
   * **只有 `easier` 用得上**，所以是可选的。
   * `save` / `pause` 的回应由 TutorFlow 现拼 —— 它得说出
   * 「下次从『断点在哪只灯』接着问」这种带当前步骤名的话，
   * 而步骤名只有运行时才知道。写死在这儿就会出现两份说法，
   * 早晚对不上。
   */
  reply?: string
}

/* ───────────────── 跨设备：手表端课堂打点（课堂记录屏） ───────────────── */

/**
 * 手表在课堂上打的一个点。
 *
 * 字段刻意做得很少：只有「什么时候」和「挂在哪条知识点上」。
 * 学生一个字都不用输入 —— 上课时他没有那个注意力。
 * 「该挂到哪一条」由一直在记录的手表自己解决。
 */
export interface WatchMark {
  id: number
  /** 打点时刻，如 10:14 */
  at: string
  /** 挂到第几条知识点（classNote.knowledgePoints 的下标） */
  index: number
}

/* ───────────────── 阶段6：本次学习记录 ───────────────── */

/** 学习状态信号：只报可观测信号 + 依据，不下情绪结论（定位说明 3.5 / 架构说明 五） */
export interface StateSignal {
  label: string
  value: string
  basis: string
}

export interface SessionRecord {
  knowledgePoint: string
  initialMastery: string
  guideRounds: number
  finalMastery: string
  minutes: number
  /** V2：由「情绪」改为可观测行为信号 */
  signals: StateSignal[]
}

/* ───────────────── 学生端成长中心 ───────────────── */

export interface WrongProblem {
  id: string
  date: string
  /**
   * 指向知识点库的哪一条。
   *
   * ⚠️ `subject` / `knowledgePoint` 都是**从这个 id 查出来的**，不是手写的。
   * 手写过一次就会有第二次：库改了、原型不改，两边开始说不同的话 ——
   * 而家长正是靠「出处对不对得上教材」决定续不续费的（实战题背景原文）。
   */
  pointId: string
  subject: '数学' | '物理'
  title: string
  knowledgePoint: string
  reason: string
  mastered: boolean
}

export interface WeakPoint {
  id: string
  /** 同 WrongProblem.pointId：名称、学科、教材出处一律从知识点库查，不手写 */
  pointId: string
  subject: '数学' | '物理'
  name: string
  chapter: string
  from: number
  to: number
  errorCount: number
  /**
   * 查漏补缺：往回到哪一环（定位说明 3.4 场景1）。
   *
   * ⚠️ 这里指向的是**库里更底层的那个知识点**，不是一句描述文字 ——
   * 因为「回溯」这个动作要真的能执行：系统得知道回去补哪一节，
   * 才谈得上「安排先回到基础再往上学」。
   */
  traceBackPointId?: string
  /** 从 traceBackPointId 查出来的完整教材定位（家长看到的是这个） */
  traceBack?: string
  /**
   * 「持续跟进」的落地——识别出薄弱点只是第一步，关键是**下次谁记得**。
   *
   * 设计判断：初中生的自律撑不起「提醒了就复习」，所以**场景触发优先、时间触发兜底**——
   * 下次他本来就要做这个知识点的题时顺手插一道复查题，而不是提前发推送催他去复习。
   * 这是降低执行成本，不是提高自律要求。
   */
  followUp?: FollowUp
}

/** 一个薄弱点的复查状态机：识别 → 安排复查 → 复查 → 巩固（或回到复查） */
export interface FollowUp {
  /**
   * 待复查 = 已排期还没查
   * 复查中 = 查过但没稳
   * 已巩固 = 连过两轮，移出重点，还剩最后一次抽查
   * 已移出 = 抽查也过了，彻底归档，不再排复查 —— 这是闭环的终点
   *
   * ⚠️ 加「已移出」时踩到的坑：`StudentHome` 原来写的是
   * `status !== '已巩固'` 这种**字面量比较**，加新状态后编译器不会报错，
   * 已移出的薄弱点会继续触发插复查题。所以判断「还在不在复查循环里」
   * 一律用 `isUnderReview()`（见 lib/followUp.ts），不要在界面里比字符串。
   */
  status: '待复查' | '复查中' | '已巩固' | '已移出'
  /** 第几轮复查（0 = 还没复查过） */
  round: number
  /** 触发方式。场景触发优先；等不到场景时才用时间兜底 */
  mode: '场景触发' | '时间触发'
  /** 具体的触发条件，说人话——不写「遗忘曲线第 3 天」这种家长看不懂也验不了的话 */
  nextTrigger: string
  /**
   * 本轮复查没通过，需要先把知识点重讲一遍再排下一次（2026-09-13 定的 A 档）。
   *
   * 为什么不原地再考一次：复查的目的是「确认真的会了」，不是「考学生」。
   * 没会就该回到教学，反复考同一道题只会让学生挫败，也拿不到新信息。
   */
  needsReteach?: boolean
}

export interface ProgressPoint {
  day: string
  mastered: number
}

/** V2：成长档案 —— 只记行为事实，不做评价（定位说明 3.3） */
export interface ArchiveItem {
  date: string
  fact: string
  from: '辅导记录' | '课堂记录' | '错题本'
}

/* ───────────────── V2：手表端课堂记录（流程说明 前置能力） ───────────────── */

export interface ClassNote {
  date: string
  period: string
  subject: '数学' | '物理'
  teacher: string
  topic: string
  /** 结构化要点：知识点 */
  knowledgePoints: string[]
  /** 结构化要点：例题题干 */
  examples: string[]
  /** 结构化要点：板书大纲 */
  board: string[]
  /** 课堂与教材/课后表现的冲突提示 */
  gap?: string
}

/* ───────────────── 家长端 ───────────────── */

export interface WeeklyReport {
  weekLabel: string
  minutes: number
  problemCount: number
  knowledgeCount: number
  activeDays: number
  /** V2：不出现定性情绪词，只给趋势 + 依据 */
  trendHeadline: string
  trendBasis: string
  interestIndex: number
  highlights: string[]
}

export interface PlanSuggestion {
  title: string
  reason: string
  items: string[]
  /** 家长选择"暂不调整"后，AI 记录原因并降低强度（流程说明 节点5） */
  fallbackItems: string[]
}

/** V2：家长专属 AI 助手（定位说明 3.6） */
export interface AssistantMessage {
  from: 'parent' | 'ai'
  text: string
  /** 助手回答时标注数据来源，且不透传学生对话原文 */
  source?: string
}

export interface AssistantQuickAsk {
  label: string
  /**
   * 主题词：家长的话里命中任意一个，就归到这一条。
   *
   * ── 为什么要这一层 ──────────────────────────────────────────
   * 旧版是逐字比对：拿问题的每个字去 label 里找，命中 30% 算匹配。
   * 实测下来，《产品定位说明》148-162 行白纸黑字承诺的那 5 个例子，
   * 6 问 5 不中 —— 连屏上输入框自己写的 placeholder
   * 「他最近状态怎么样」都答不上来。屏上给的例子答不上来，是最伤的一种。
   *
   * 根因是中文没有分词：家长换个说法问同一件事，逐字比对就抓不到了。
   * 主题词这一层，就是让「问什么」和「答什么」重新对上。
   */
  keys: string[]
  /**
   * 是否出现在底部那排「常问的」里。
   *
   * 这排是脚手架（家长不知道能问什么），不是全部能力清单。
   * 问答库扩到 10 条之后如果全铺上去，手机宽度下要横向滑三屏，
   * 反倒谁都看不见。所以只挂最有代表性的几条，其余的靠打字照样能命中 ——
   * 脚手架的任务是让人知道「这几类都能问」，不是把菜单铺满。
   */
  chip?: boolean
  answer: string
  source: string
}
