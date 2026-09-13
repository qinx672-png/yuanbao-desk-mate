import { type CSSProperties } from 'react'
import type { AvatarRole } from '@/types'
import { avatarRoles } from '@/data/avatarRoles'

/**
 * 数字同桌形象
 *
 * 设计思路：
 * - 不以"聊天机器人"形态出现，而是"坐在旁边的同桌"形象（双肩包、校服外套、文具）
 * - 同一套骨架，通过五官细节变化呈现不同状态（思考 / 提醒 / 鼓励 / 讲解 / 等待）
 * - V2：支持角色库（定位说明 3.0-3）—— 8 个官方预设形象，换的只是外壳配色与配饰，
 *   引导逻辑（内核）完全一致；不做自由生成、不做形象付费
 */

export type ClassmateMood = 'thinking' | 'explaining' | 'encouraging' | 'listening' | 'pointing' | 'happy'

interface Props {
  mood?: ClassmateMood
  size?: number
  className?: string
  style?: CSSProperties
  /** 角色 id，缺省用默认形象「小蓝」 */
  roleId?: string
}

export const MOOD_LABEL: Record<ClassmateMood, string> = {
  thinking: '在思考',
  explaining: '在讲解',
  encouraging: '在鼓励',
  listening: '在听你说',
  pointing: '在指出',
  happy: '很高兴',
}

const DEFAULT_ROLE = 'a2'

export function findRole(roleId?: string): AvatarRole {
  return avatarRoles.find(r => r.id === roleId) ?? avatarRoles.find(r => r.id === DEFAULT_ROLE)!
}

export default function ClassmateAvatar({ mood = 'listening', size = 96, className, style, roleId }: Props) {
  const role = findRole(roleId)
  const p = role.palette
  const uid = `${role.id}`
  const hairShade = p.hair
  const skinShade = shade(p.skin)

  return (
    <div className={className} style={style} aria-label={`数字同桌 ${role.name} · ${MOOD_LABEL[mood]}`}>
      <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`bg-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor={p.accent} />
          </linearGradient>
          <linearGradient id={`jacket-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={p.jacket} />
            <stop offset="100%" stopColor={p.jacketDark} />
          </linearGradient>
        </defs>

        {/* 圆形背景 */}
        <circle cx="60" cy="60" r="58" fill={`url(#bg-${uid})`} />

        {/* 桌面（一条浅色横线，让学生感觉"同桌"） */}
        <rect x="0" y="92" width="120" height="28" fill="#f4f7fb" />
        <line x1="0" y1="92" x2="120" y2="92" stroke="#cdd9e8" strokeWidth="1.2" />

        {/* 双肩包（一半露出桌子） */}
        <rect x="20" y="78" width="22" height="22" rx="4" fill="#5b6b80" />
        <rect x="78" y="78" width="22" height="22" rx="4" fill="#5b6b80" />
        <rect x="22" y="74" width="18" height="6" rx="2" fill="#7c8ba1" />
        <rect x="80" y="74" width="18" height="6" rx="2" fill="#7c8ba1" />

        {/* 身体（校服外套） */}
        <path d="M30 95 Q30 72 60 72 Q90 72 90 95 L90 110 L30 110 Z" fill={`url(#jacket-${uid})`} />
        {/* 白色 T 领 */}
        <path d="M52 72 L60 80 L68 72 Z" fill="#ffffff" />
        {/* 衣领翻折 */}
        <path d="M30 78 L42 76 L42 88 L30 90 Z" fill={p.jacketDark} />
        <path d="M90 78 L78 76 L78 88 L90 90 Z" fill={p.jacketDark} />
        {/* 帽绳（连帽衫款） */}
        {role.extra === 'hoodie' && (
          <>
            <path d="M50 74 Q46 84 48 92" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M70 74 Q74 84 72 92" stroke="#ffffff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </>
        )}
        {/* 校徽 */}
        <circle cx="42" cy="86" r="2.4" fill="#ffd86b" />

        {/* 脖子 */}
        <rect x="55" y="62" width="10" height="12" rx="2" fill={p.skin} />

        {/* 脸 */}
        <ellipse cx="60" cy="50" rx="22" ry="24" fill={p.skin} />
        {/* 头发 */}
        <path
          d="M38 46 Q38 24 60 24 Q82 24 82 46 Q82 38 76 36 Q70 40 60 38 Q50 40 44 36 Q38 38 38 46 Z"
          fill={hairShade}
        />
        {/* 鬓角 */}
        <path d="M38 46 Q40 56 40 60 L42 58 Q41 50 40 46 Z" fill={hairShade} />
        <path d="M82 46 Q80 56 80 60 L78 58 Q79 50 80 46 Z" fill={hairShade} />

        {/* 配饰：发带 */}
        {role.extra === 'band' && (
          <path d="M37 40 Q60 30 83 40 L83 35 Q60 25 37 35 Z" fill={p.jacket} />
        )}
        {/* 配饰：鸭舌帽 */}
        {role.extra === 'cap' && (
          <>
            <path d="M36 38 Q36 20 60 20 Q84 20 84 38 Z" fill={p.jacket} />
            <path d="M34 38 Q34 34 60 34 L96 36 Q96 41 60 41 Q34 42 34 38 Z" fill={p.jacketDark} />
          </>
        )}

        {/* 眉毛：随状态变化 */}
        {mood === 'thinking' && (
          <>
            <path d="M48 44 L55 42" stroke={hairShade} strokeWidth="1.6" strokeLinecap="round" />
            <path d="M65 42 L72 44" stroke={hairShade} strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
        {mood === 'explaining' && (
          <>
            <path d="M48 44 Q51 41 55 43" stroke={hairShade} strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M65 43 Q69 41 72 44" stroke={hairShade} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </>
        )}
        {mood === 'encouraging' && (
          <>
            <path d="M48 43 Q51 41 55 42" stroke={hairShade} strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M65 42 Q69 41 72 43" stroke={hairShade} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </>
        )}
        {mood === 'listening' && (
          <>
            <line x1="48" y1="43" x2="55" y2="43" stroke={hairShade} strokeWidth="1.6" strokeLinecap="round" />
            <line x1="65" y1="43" x2="72" y2="43" stroke={hairShade} strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
        {mood === 'pointing' && (
          <>
            <path d="M48 44 L55 41" stroke={hairShade} strokeWidth="1.6" strokeLinecap="round" />
            <line x1="65" y1="43" x2="72" y2="43" stroke={hairShade} strokeWidth="1.6" strokeLinecap="round" />
          </>
        )}
        {mood === 'happy' && (
          <>
            <path d="M48 42 Q51 39 55 42" stroke={hairShade} strokeWidth="1.6" strokeLinecap="round" fill="none" />
            <path d="M65 42 Q69 39 72 42" stroke={hairShade} strokeWidth="1.6" strokeLinecap="round" fill="none" />
          </>
        )}

        {/* 眼睛：随状态变化 */}
        {mood === 'thinking' && (
          <>
            <path d="M49 49 Q51 52 53 49" stroke={hairShade} strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M67 49 Q69 52 71 49" stroke={hairShade} strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </>
        )}
        {mood === 'explaining' && (
          <>
            <ellipse cx="51" cy="50" rx="2.2" ry="2.6" fill={hairShade} />
            <ellipse cx="69" cy="50" rx="2.2" ry="2.6" fill={hairShade} />
            <circle cx="51.5" cy="49" r="0.6" fill="#fff" />
            <circle cx="69.5" cy="49" r="0.6" fill="#fff" />
          </>
        )}
        {mood === 'encouraging' && (
          <>
            <path d="M48 50 Q51 53 54 50" stroke={hairShade} strokeWidth="1.6" fill="none" strokeLinecap="round" />
            <path d="M66 50 Q69 53 72 50" stroke={hairShade} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </>
        )}
        {mood === 'listening' && (
          <>
            <ellipse cx="51" cy="50" rx="1.8" ry="2.2" fill={hairShade} />
            <ellipse cx="69" cy="50" rx="1.8" ry="2.2" fill={hairShade} />
          </>
        )}
        {mood === 'pointing' && (
          <>
            <ellipse cx="51" cy="50" rx="2" ry="2.4" fill={hairShade} />
            <ellipse cx="69" cy="50" rx="2" ry="2.4" fill={hairShade} />
          </>
        )}
        {mood === 'happy' && (
          <>
            <path d="M48 50 Q51 47 54 50" stroke={hairShade} strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <path d="M66 50 Q69 47 72 50" stroke={hairShade} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* 配饰：眼镜（画在眼睛之上） */}
        {role.extra === 'glasses' && (
          <g stroke={hairShade} strokeWidth="1.3" fill="none">
            <circle cx="51" cy="50" r="6.4" />
            <circle cx="69" cy="50" r="6.4" />
            <line x1="57.4" y1="50" x2="62.6" y2="50" />
            <line x1="44.6" y1="49" x2="39" y2="47" />
            <line x1="75.4" y1="49" x2="81" y2="47" />
          </g>
        )}

        {/* 鼻子 */}
        <path d="M60 54 L58 58 L61 58 Z" fill={skinShade} />

        {/* 嘴巴：随状态变化 */}
        {mood === 'thinking' && <path d="M56 62 L64 62" stroke="#a06a55" strokeWidth="1.4" strokeLinecap="round" />}
        {mood === 'explaining' && <ellipse cx="60" cy="63" rx="3.5" ry="2" fill="#a06a55" />}
        {mood === 'encouraging' && (
          <path d="M55 62 Q60 66 65 62" stroke="#a06a55" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        )}
        {mood === 'listening' && (
          <path d="M56 62 Q60 65 64 62" stroke="#a06a55" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        )}
        {mood === 'pointing' && (
          <path d="M55 62 Q60 65 65 62" stroke="#a06a55" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        )}
        {mood === 'happy' && (
          <path d="M53 60 Q60 68 67 60" stroke="#a06a55" strokeWidth="1.8" strokeLinecap="round" fill="#ff8a8a" />
        )}

        {/* 思考状态：手指抵下巴 */}
        {mood === 'thinking' && (
          <path
            d="M40 78 Q38 76 39 73 Q40 71 43 71 Q46 71 46 74 Q46 77 44 78 Z"
            fill={p.skin}
            stroke={skinShade}
            strokeWidth="0.8"
          />
        )}
        {/* 讲解状态：伸出一只手，比划"看这里" */}
        {mood === 'explaining' && (
          <g>
            <path d="M28 88 Q22 86 22 82 Q22 80 25 80 Q28 80 28 84 Z" fill={p.skin} stroke={skinShade} strokeWidth="0.8" />
            <circle cx="22" cy="82" r="1.2" fill={skinShade} />
          </g>
        )}
        {/* 鼓励状态：竖起大拇指 */}
        {mood === 'encouraging' && (
          <g>
            <path d="M92 82 L96 82 L96 92 L92 92 Z" fill={p.skin} stroke={skinShade} strokeWidth="0.8" />
            <circle cx="94" cy="80" r="2" fill={p.skin} stroke={skinShade} strokeWidth="0.8" />
          </g>
        )}
        {/* 听的状态：手拿笔 */}
        {mood === 'listening' && (
          <g>
            <rect x="86" y="86" width="6" height="2" rx="1" fill="#ffb84a" transform="rotate(20 89 87)" />
            <circle cx="93" cy="88" r="1.5" fill={p.jacketDark} />
          </g>
        )}
        {/* 指出状态：手指指向下方（指向笔记本） */}
        {mood === 'pointing' && (
          <g>
            <path d="M88 90 L96 96 L98 94 L90 88 Z" fill={p.skin} stroke={skinShade} strokeWidth="0.8" />
            <circle cx="89" cy="89" r="1.4" fill={skinShade} />
          </g>
        )}
        {/* 开心状态：双手握拳加油 */}
        {mood === 'happy' && (
          <g>
            <circle cx="26" cy="84" r="3" fill={p.skin} stroke={skinShade} strokeWidth="0.8" />
            <circle cx="94" cy="84" r="3" fill={p.skin} stroke={skinShade} strokeWidth="0.8" />
          </g>
        )}
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

/** 一组可用的状态映射，把对话类型转成数字同桌的表情 */
export function moodFromBubbleKind(
  kind: 'ai' | 'student' | 'praise' | 'cite' | 'system' | 'sensing',
): ClassmateMood {
  switch (kind) {
    case 'praise':
      return 'encouraging'
    case 'cite':
      return 'pointing'
    case 'system':
      return 'happy'
    case 'sensing':
      return 'thinking'
    case 'student':
      return 'listening'
    default:
      return 'explaining'
  }
}
