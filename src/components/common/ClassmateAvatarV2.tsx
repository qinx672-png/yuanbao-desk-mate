/**
 * 同桌形象 V2 · 为「64px 下能分辨」而重画
 *
 * ── 为什么要重画 ──────────────────────────────────────────
 * V1 的 6 种表情是靠**微调五官**做的：眉毛弯度差 2 个单位、眼睛 rx 差 0.4。
 * 但形象渲染尺寸是 64px，viewBox 是 120 —— 缩放 0.533。
 * 于是眉毛描边 1.6 单位 → 屏幕上 0.85 像素，眼睛 rx2.2 → 1.2 像素。
 * 人眼在 0.85 像素上读不出「这是在鼓励」。
 *
 * ── 重画遵循的一条硬规则 ──────────────────────────────────
 * **任何要表达含义的图形，源码尺寸不得小于 4 个单位。**
 * (4 单位 × 0.533 ≈ 2.1 像素，这是能稳定看见的下限)
 * 所以 V2 全部改用粗大特征：整颗头的倾角、眼睛开/闭/朝向、嘴的大弧线、
 * 以及一个「一眼就能扫到」的状态符号。
 *
 * ── 两版并列，只为让秦肖挑 ────────────────────────────────
 *   A「大幅五官」  —— 骨架不动，只把眉眼嘴加粗加大
 *   B「姿态+符号」 —— A 的基础上，再叠加头部倾角和状态符号
 * B 是 A 的超集，所以对比时能直接看出「符号那一层值不值」。
 */
import { type CSSProperties } from 'react'
import type { AvatarRole } from '@/types'
import { avatarRoles } from '@/data/avatarRoles'
import { type ClassmateMood } from '@/components/common/ClassmateAvatar'

export type AvatarVariant = 'A' | 'B'

interface Props {
  mood?: ClassmateMood
  size?: number
  className?: string
  style?: CSSProperties
  roleId?: string
  /** A = 只改五官；B = 再叠加头部姿态与状态符号 */
  variant?: AvatarVariant
}

const DEFAULT_ROLE = 'a2'

export function findRoleV2(roleId?: string): AvatarRole {
  return avatarRoles.find(r => r.id === roleId) ?? avatarRoles.find(r => r.id === DEFAULT_ROLE)!
}

/** 头部倾角（度）。正数 = 头往右边歪。给 0 就是不歪 */
const TILT: Record<ClassmateMood, number> = {
  thinking: -8,
  explaining: 0,
  encouraging: 6,
  listening: 5,
  pointing: -5,
  happy: 0,
}

/* ─────────────────────────── 五官 ─────────────────────────── */
/* 全部按「≥4 单位」重画。左右眼中心固定在 x=51 / x=69，嘴在 y≈62 */

const BROW_SW = 3.4
const EYE_L = 51
const EYE_R = 69
const EYE_Y = 50

/** 眉毛：六种各不相同，且差异靠**角度**不靠弯度（角度在小尺寸下更抗压） */
function Brows({ mood, c }: { mood: ClassmateMood; c: string }) {
  const p = { stroke: c, strokeWidth: BROW_SW, strokeLinecap: 'round' as const, fill: 'none' }
  switch (mood) {
    case 'thinking': // 一高一低 —— 在琢磨
      return (
        <>
          <path d="M44 43 L56 40" {...p} />
          <path d="M64 37 L76 41" {...p} />
        </>
      )
    case 'explaining': // 双双扬起 —— 在讲
      return (
        <>
          <path d="M44 42 L56 39" {...p} />
          <path d="M64 39 L76 42" {...p} />
        </>
      )
    case 'encouraging': // 缓和的八字 —— 温和
      return (
        <>
          <path d="M44 40 Q50 37 56 40" {...p} />
          <path d="M64 40 Q70 37 76 40" {...p} />
        </>
      )
    case 'listening': // 平直 —— 中性、专注
      return (
        <>
          <path d="M44 41 L56 41" {...p} />
          <path d="M64 41 L76 41" {...p} />
        </>
      )
    case 'pointing': // 一挑一压 —— 在指给你看
      return (
        <>
          <path d="M44 42 L56 41" {...p} />
          <path d="M64 38 L76 40" {...p} />
        </>
      )
    case 'happy': // 高高扬起 —— 喜形于色
      return (
        <>
          <path d="M44 38 Q50 34 56 37" {...p} />
          <path d="M64 37 Q70 34 76 38" {...p} />
        </>
      )
  }
}

/** 眼睛：开 / 闭成弯月 / 看向上下左右 —— 「睁还是闭」是 64px 下最好认的差异 */
function Eyes({ mood, c }: { mood: ClassmateMood; c: string }) {
  const dot = (cx: number, cy: number, rx: number, ry: number) => (
    <>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={c} />
      <circle cx={cx + rx * 0.35} cy={cy - ry * 0.4} r={rx * 0.34} fill="#fff" />
    </>
  )
  switch (mood) {
    case 'thinking': // 眼珠往上翻 —— 在回忆
      return (
        <>
          {dot(EYE_L, EYE_Y - 2, 3.2, 2.6)}
          {dot(EYE_R, EYE_Y - 2, 3.2, 2.6)}
        </>
      )
    case 'explaining': // 正常睁眼
      return (
        <>
          {dot(EYE_L, EYE_Y, 3.2, 3.8)}
          {dot(EYE_R, EYE_Y, 3.2, 3.8)}
        </>
      )
    case 'encouraging': // 弯月眼（闭眼笑）—— 和「开心」靠嘴型区分
      return (
        <>
          <path d="M45 52 Q51 45 57 52" stroke={c} strokeWidth={3.4} fill="none" strokeLinecap="round" />
          <path d="M63 52 Q69 45 75 52" stroke={c} strokeWidth={3.4} fill="none" strokeLinecap="round" />
        </>
      )
    case 'listening': // 瞳孔偏向学生那一侧 —— 在看你
      return (
        <>
          {dot(EYE_L - 0.8, EYE_Y, 3.4, 3.8)}
          {dot(EYE_R - 0.8, EYE_Y, 3.4, 3.8)}
        </>
      )
    case 'pointing': // 眼睛往下看 —— 看着本子
      return (
        <>
          {dot(EYE_L, EYE_Y + 2, 3.2, 3.2)}
          {dot(EYE_R, EYE_Y + 2, 3.2, 3.2)}
        </>
      )
    case 'happy': // 大圆眼 —— 比「鼓励」的弯月眼更外放
      return (
        <>
          {dot(EYE_L, EYE_Y, 4.2, 4.6)}
          {dot(EYE_R, EYE_Y, 4.2, 4.6)}
        </>
      )
  }
}

/** 嘴巴：小尺寸下「张开的深色块」比线条好认得多 */
function Mouth({ mood }: { mood: ClassmateMood }) {
  const lip = '#9c5347'
  switch (mood) {
    case 'thinking': // 抿成一条小波浪
      return <path d="M53 63 Q57 60 60 63 Q63 66 67 63" stroke={lip} strokeWidth={2.6} fill="none" strokeLinecap="round" />
    case 'explaining': // 张开在说话
      return <ellipse cx="60" cy="63" rx="5" ry="4.2" fill={lip} />
    case 'encouraging': // 微笑露齿
      return (
        <>
          <path d="M51 60 Q60 70 69 60 Z" fill={lip} />
          <path d="M54 61.5 L66 61.5 L64 63.5 L56 63.5 Z" fill="#fff" />
        </>
      )
    case 'listening': // 抿嘴微笑
      return <path d="M52 61 Q60 67 68 61" stroke={lip} strokeWidth={2.8} fill="none" strokeLinecap="round" />
    case 'pointing': // 平直
      return <path d="M53 63 L67 63" stroke={lip} strokeWidth={2.8} strokeLinecap="round" />
    case 'happy': // 大笑，露舌
      return (
        <>
          <path d="M48 59 Q60 74 72 59 Z" fill={lip} />
          <path d="M55 66 Q60 72 65 66 Z" fill="#ff8a8a" />
        </>
      )
  }
}

/** 腮红 —— 只在「开心」出现，多给一个颜色线索 */
function Blush() {
  return (
    <>
      <ellipse cx="41" cy="59" rx="5" ry="3.4" fill="#ffb3b3" opacity="0.75" />
      <ellipse cx="79" cy="59" rx="5" ry="3.4" fill="#ffb3b3" opacity="0.75" />
    </>
  )
}

/* ─────────────────────── 手部 / 身体动作 ─────────────────────── */

function Hands({ mood, skin, skinShade }: { mood: ClassmateMood; skin: string; skinShade: string }) {
  const s = { fill: skin, stroke: skinShade, strokeWidth: 1.2 }
  switch (mood) {
    case 'thinking': // 手抵下巴（画大）
      return (
        <path
          d="M38 80 Q34 77 35.5 72 Q37 68 41 68 Q45 68 45 73 Q45 78 42 80 Z"
          {...s}
        />
      )
    case 'explaining': // 举起一只手，掌心朝外
      return (
        <g>
          <path d="M26 84 Q20 82 20 76 Q20 72 24 72 Q28 72 28 78 Z" {...s} />
          <circle cx="21" cy="74" r="2.4" {...s} />
          <circle cx="25" cy="71.5" r="2.4" {...s} />
        </g>
      )
    case 'encouraging': // 双手竖起大拇指
      return (
        <g>
          <rect x="88" y="84" width="7" height="11" rx="2.4" {...s} />
          <circle cx="91.5" cy="81" r="3.4" {...s} />
          <rect x="25" y="84" width="7" height="11" rx="2.4" {...s} />
          <circle cx="28.5" cy="81" r="3.4" {...s} />
        </g>
      )
    case 'listening': // 手拿笔
      return (
        <g>
          <rect x="86" y="84" width="12" height="3.4" rx="1.6" fill="#ffb84a" transform="rotate(22 92 86)" />
          <circle cx="96" cy="91" r="2.6" {...s} />
        </g>
      )
    case 'pointing': // 伸出食指指向右下方
      return (
        <g>
          <path d="M86 92 L100 100 L98 104 L84 96 Z" {...s} />
          <circle cx="85" cy="93" r="3" {...s} />
        </g>
      )
    case 'happy': // 双手举高
      return (
        <g>
          <circle cx="24" cy="78" r="4.6" {...s} />
          <path d="M20 84 L28 84 L27 94 L21 94 Z" {...s} />
          <circle cx="96" cy="78" r="4.6" {...s} />
          <path d="M92 84 L100 84 L99 94 L93 94 Z" {...s} />
        </g>
      )
  }
}

/* ───────────────────────── 状态符号 ───────────────────────── */
/* B 版专有：一个「大而蠢」的图形，比任何五官微调都抗压缩 */

function Prop({ mood }: { mood: ClassmateMood }) {
  switch (mood) {
    case 'thinking': // 头顶三个点
      return (
        <g fill="#8aa2bd">
          <circle cx="42" cy="16" r="3.4" />
          <circle cx="60" cy="12" r="3.8" />
          <circle cx="78" cy="16" r="3.4" />
        </g>
      )
    case 'encouraging': // 两颗四角星
      return (
        <g fill="#ffc93c">
          <path d="M22 30 L24.6 36.4 L31 39 L24.6 41.6 L22 48 L19.4 41.6 L13 39 L19.4 36.4 Z" />
          <path d="M98 34 L100 39.4 L105.4 41.4 L100 43.4 L98 48.8 L96 43.4 L90.6 41.4 L96 39.4 Z" />
        </g>
      )
    case 'listening': // 耳侧两道声波弧
      return (
        <g stroke="#59b0ff" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M92 44 Q97 50 92 56" />
          <path d="M99 39 Q106 50 99 61" />
        </g>
      )
    case 'pointing': // 向下的箭头，指向笔记本
      return (
        <g stroke="#f3852c" strokeWidth="3.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 104 L60 114" />
          <path d="M54 108 L60 114 L66 108" />
        </g>
      )
    case 'happy': // 两侧蹦跳的短线
      return (
        <g stroke="#ffb84a" strokeWidth="3.4" fill="none" strokeLinecap="round">
          <path d="M14 60 L8 56" />
          <path d="M16 70 L9 70" />
          <path d="M106 60 L112 56" />
          <path d="M104 70 L111 70" />
        </g>
      )
    case 'explaining': // 嘴边一道「正在说」的短弧
      return (
        <path d="M80 62 Q86 62 86 66" stroke="#8aa2bd" strokeWidth="3" fill="none" strokeLinecap="round" />
      )
  }
}

/* ─────────────────────────── 主体 ─────────────────────────── */

export default function ClassmateAvatarV2({
  mood = 'listening',
  size = 96,
  className,
  style,
  roleId,
  variant = 'B',
}: Props) {
  const role = findRoleV2(roleId)
  const p = role.palette
  // 同一页会同时渲染 A/B 两版，渐变 id 必须互不冲突
  const uid = `${role.id}-${variant}`
  const skinShade = shade(p.skin)
  const tilt = variant === 'B' ? TILT[mood] : 0

  /* 头（脸 + 头发 + 五官 + 配饰）单独成组，B 版整体旋转 ——
     倾角是「全局线索」，64px 下比任何局部微调都好认 */
  const head = (
    <>
      {/* 脸 */}
      <ellipse cx="60" cy="50" rx="22" ry="24" fill={p.skin} />
      {/* 头发 */}
      <path
        d="M38 46 Q38 24 60 24 Q82 24 82 46 Q82 38 76 36 Q70 40 60 38 Q50 40 44 36 Q38 38 38 46 Z"
        fill={p.hair}
      />
      <path d="M38 46 Q40 56 40 60 L42 58 Q41 50 40 46 Z" fill={p.hair} />
      <path d="M82 46 Q80 56 80 60 L78 58 Q79 50 80 46 Z" fill={p.hair} />

      {role.extra === 'band' && <path d="M37 40 Q60 30 83 40 L83 35 Q60 25 37 35 Z" fill={p.jacket} />}
      {role.extra === 'cap' && (
        <>
          <path d="M36 38 Q36 20 60 20 Q84 20 84 38 Z" fill={p.jacket} />
          <path d="M34 38 Q34 34 60 34 L96 36 Q96 41 60 41 Q34 42 34 38 Z" fill={p.jacketDark} />
        </>
      )}

      {mood === 'happy' && <Blush />}
      <Brows mood={mood} c={p.hair} />
      <Eyes mood={mood} c={p.hair} />

      {role.extra === 'glasses' && (
        <g stroke={p.hair} strokeWidth="1.8" fill="none">
          <circle cx="51" cy="50" r="7.4" />
          <circle cx="69" cy="50" r="7.4" />
          <line x1="58.4" y1="50" x2="61.6" y2="50" />
          <line x1="43.6" y1="49" x2="38" y2="46" />
          <line x1="76.4" y1="49" x2="82" y2="46" />
        </g>
      )}

      <path d="M60 54 L57.6 58.4 L61.6 58.4 Z" fill={skinShade} />
      <Mouth mood={mood} />
    </>
  )

  return (
    <div className={className} style={style} aria-label={`数字同桌 小元 · ${mood}`}>
      <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`bg2-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={p.accent} />
          </linearGradient>
          <linearGradient id={`jk2-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.jacket} />
            <stop offset="100%" stopColor={p.jacketDark} />
          </linearGradient>
        </defs>

        <circle cx="60" cy="60" r="58" fill={`url(#bg2-${uid})`} />

        <rect x="0" y="92" width="120" height="28" fill="#f4f7fb" />
        <line x1="0" y1="92" x2="120" y2="92" stroke="#cdd9e8" strokeWidth="1.2" />

        <rect x="20" y="78" width="22" height="22" rx="4" fill="#5b6b80" />
        <rect x="78" y="78" width="22" height="22" rx="4" fill="#5b6b80" />
        <rect x="22" y="74" width="18" height="6" rx="2" fill="#7c8ba1" />
        <rect x="80" y="74" width="18" height="6" rx="2" fill="#7c8ba1" />

        <path d="M30 95 Q30 72 60 72 Q90 72 90 95 L90 110 L30 110 Z" fill={`url(#jk2-${uid})`} />
        <path d="M52 72 L60 80 L68 72 Z" fill="#ffffff" />
        <path d="M30 78 L42 76 L42 88 L30 90 Z" fill={p.jacketDark} />
        <path d="M90 78 L78 76 L78 88 L90 90 Z" fill={p.jacketDark} />
        {role.extra === 'hoodie' && (
          <>
            <path d="M50 74 Q46 84 48 92" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M70 74 Q74 84 72 92" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </>
        )}
        <circle cx="42" cy="86" r="2.4" fill="#ffd86b" />

        <rect x="55" y="62" width="10" height="12" rx="2" fill={p.skin} />

        {/* 头：B 版按状态整体倾斜，脖子留在原位 */}
        {tilt ? <g transform={`rotate(${tilt} 60 68)`}>{head}</g> : head}

        <Hands mood={mood} skin={p.skin} skinShade={skinShade} />
        {variant === 'B' && <Prop mood={mood} />}
      </svg>
    </div>
  )
}

/** 简单加深一档，用作阴影色 */
function shade(hex: string): string {
  const n = hex.replace('#', '')
  const v = [0, 2, 4].map(i => Math.max(0, parseInt(n.slice(i, i + 2), 16) - 34))
  return `#${v.map(x => x.toString(16).padStart(2, '0')).join('')}`
}
