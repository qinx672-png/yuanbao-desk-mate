import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  eyeCare?: boolean
  /** 状态栏时间，用于演示夜间护眼场景 */
  clock?: string
}

export default function PhoneFrame({ children, eyeCare = false, clock = '19:24' }: Props) {
  return (
    <div className="relative">
      <div className="w-[390px] h-[820px] rounded-[44px] bg-[#0f1c30] p-[10px] shadow-phone">
        <div
          className={`relative w-full h-full rounded-[36px] overflow-hidden bg-ink-50 flex flex-col ${
            eyeCare ? 'eye-care' : ''
          }`}
        >
          {/* 状态栏 */}
          <div className="shrink-0 h-11 px-6 flex items-center justify-between text-[13px] font-semibold text-ink-900 bg-transparent relative z-30">
            <span>{clock}</span>
            <div className="absolute left-1/2 -translate-x-1/2 top-1.5 w-[104px] h-[26px] rounded-full bg-[#0f1c30]" />
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-3.5" viewBox="0 0 18 14" fill="currentColor">
                <rect x="0" y="9" width="3" height="5" rx="1" />
                <rect x="5" y="6" width="3" height="8" rx="1" />
                <rect x="10" y="3" width="3" height="11" rx="1" />
                <rect x="15" y="0" width="3" height="14" rx="1" opacity=".35" />
              </svg>
              <svg className="w-6 h-3.5" viewBox="0 0 26 14" fill="none" stroke="currentColor">
                <rect x="1" y="1.5" width="20" height="11" rx="3" strokeWidth="1.4" opacity=".45" />
                <rect x="3" y="3.5" width="14" height="7" rx="1.6" fill="currentColor" />
                <path d="M23.5 5.5v3" strokeWidth="2" strokeLinecap="round" opacity=".45" />
              </svg>
            </div>
          </div>

          {/* 屏幕内容 */}
          <div className="flex-1 min-h-0 flex flex-col relative">{children}</div>

          {/* Home Indicator */}
          <div className="shrink-0 h-6 flex items-center justify-center bg-transparent relative z-30">
            <div className="w-[128px] h-[5px] rounded-full bg-ink-900/25" />
          </div>
        </div>
      </div>
    </div>
  )
}
