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

/** 官方预设初中生形象，仅 8 个，不做自由生成、不做形象付费 */
export interface AvatarRole {
  id: string
  /** 形象名 */
  name: string
  /** 风格标签：运动系 / 文静系 / 幽默系 … */
  style: string
  /** 说话方式（同一内核，不同外壳） */
  tone: string
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

export type OnboardStepKind = 'chat' | 'probe' | 'avatar' | 'done'

/** 冷启动闲聊节点：趣味外壳 + 科学内核 */
export interface OnboardStep {
  id: string
  kind: OnboardStepKind
  /** 元宝同桌说的话 */
  ask: string
  /** 这一问在科学内核里量的是什么（原型透明标注，产品内不展示） */
  measures: string
  options?: { label: string; echo?: string; tag?: string }[]
}

/** 学科起点诊断：不问「你数学好不好」，直接看做题（架构说明 五） */
export interface StartProbe {
  id: string
  subject: '数学' | '物理'
  question: string
  choices: string[]
  answerIndex: number
  knowledgePoint: string
}

/** 画像 V0：大五人格只用于过程支持适配，不向用户输出人格定论 */
export interface ProfileV0 {
  traits: { name: string; level: string; usedFor: string }[]
  motivation: string
  interests: string[]
  startPoint: { subject: '数学' | '物理'; level: string; basis: string }[]
}

/* ───────────────── V2：引导深度三档（定位说明 3.1） ───────────────── */

export type GuideDepth = '深聊' | '标准' | '快讲'

export interface GuideDepthMeta {
  key: GuideDepth
  label: string
  desc: string
  scene: string
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
}

/** 引导脚本节点 */
export interface ScriptNode {
  id: string
  stage: Stage
  bubbles: Bubble[]
  /** 学习状态信号（阶段2/4：只读可观测行为信号 → 调整引导策略，不下情绪结论） */
  sensing?: string
  options?: ChatOption[]
  /** 需要学生自行输入（复述定理 / 说出思路） */
  input?: {
    placeholder: string
    quickFill: string
    next: string
  }
  /** 进入独立计算阶段 */
  gotoTimer?: boolean
  /** 进入本次小结 */
  finish?: boolean
  /** 情境个性化：本题情境取自学生兴趣（定位说明 3.0-2） */
  interestContext?: string
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
  /** AI 的回应话术，不含「未完成 / 半途而废」等字样 */
  reply: string
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
  subject: '数学' | '物理'
  title: string
  knowledgePoint: string
  reason: string
  mastered: boolean
}

export interface WeakPoint {
  id: string
  subject: '数学' | '物理'
  name: string
  chapter: string
  from: number
  to: number
  errorCount: number
  /** 查漏补缺：需回溯的前置知识点（定位说明 3.4 场景1） */
  traceBack?: string
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
  answer: string
  source: string
}
