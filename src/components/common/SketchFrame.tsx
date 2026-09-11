/**
 * 手绘框：界面不是「弹出来」的，是「被画出来」的
 *
 * 参照 Runway Solaris「界面世界模型」——界面正从「设计产物」变成「生成结果」。
 * 这里用一条略带抖动的手绘闭合路径 + stroke-dashoffset 动画，
 * 让本子上长出来的每一件东西都"被画一遍"，而不是 fade-in 一张成品卡片。
 *
 * 学生首页、冷启动、辅导页共用这一套笔触，保证三屏是同一本本子。
 */

/** 300×120 视窗里的一条手绘闭合路径，靠 preserveAspectRatio="none" 拉伸到任意尺寸 */
const WOBBLY =
  'M 6 5.5 C 70 3.2, 180 4.8, 294 6.5 C 296.5 40, 295.5 82, 293.5 114.5 C 210 116.8, 90 115.2, 6.5 113.5 C 4.2 80, 5.5 38, 6 5.5 Z'

export function SketchFrame({
  stroke,
  fill,
  rotate = '',
  className = '',
  children,
}: {
  stroke: string
  fill: string
  /** 倾斜角，如 '-rotate-[1.1deg]'。**必须放内层**，见下方注释 */
  rotate?: string
  className?: string
  children: React.ReactNode
}) {
  /* 注意：popIn 的关键帧会写 transform，若和 rotate 放在同一元素上，
     动画结束后 fill-mode:both 会让 rotate 永久失效（便利贴变正）。
     所以倾斜必须放在内层，动画放外层。 */
  return (
    <div className="animate-popIn">
      <div className={`relative ${rotate} ${className}`}>
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 300 120"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={WOBBLY}
            fill={fill}
            stroke={stroke}
            strokeWidth={1.6}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="animate-drawLine"
            style={{ strokeDasharray: 1000 }}
          />
        </svg>
        <div className="relative px-3.5 py-3">{children}</div>
      </div>
    </div>
  )
}

/**
 * 逐字写出来：读起来像有人正在本子上写，而不是整段文字一起跳出来。
 *
 * 节奏按句子长度自适应 —— 整句大约 1.4 秒写完，长句快一点、短句慢一点，
 * 这样它和同桌念这句话的时长能大致同步：字写完了，话也说完了。
 */
export function Handwrite({ text, total = 1400 }: { text: string; total?: number }) {
  const pace = Math.min(72, Math.max(16, total / Math.max(1, text.length)))
  return (
    <span>
      {[...text].map((c, i) => (
        <span key={i} className="animate-writeIn" style={{ animationDelay: `${Math.round(i * pace)}ms` }}>
          {c}
        </span>
      ))}
    </span>
  )
}
