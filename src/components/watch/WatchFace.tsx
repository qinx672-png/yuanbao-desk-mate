import { useEffect, useState } from 'react'
import { IconCheck } from '@/components/common/Icons'
import { WATCH_CLOCK } from '@/data/watchDemo'

/**
 * 手表端 · 课堂记录
 *
 * ══════════════════════════════════════════════════════════════
 * 这块表在整个产品里只做一件事：**在课堂上留一个记号。**
 * 它不聊天、不讲解、不呈现整理结果 —— 那些全部发生在手机上。
 *
 * 为什么只做一件事：
 * 上课时学生只有一只手、一半的注意力。任何要求他「说清楚自己
 * 哪里没听懂」的交互，孩子都不会用第二次。所以打点的成本必须
 * 接近于零：抬手、按一下、放下。
 *
 * 「这一个点该挂到哪条知识点上」由手表自己解决 —— 它一直在记录，
 * 知道老师此刻讲到了第几条。学生不需要解释，也没机会解释。
 *
 * 这也是这一屏想回答的问题：**同一个产品跨两块屏，
 * 不是把手机界面缩小塞进手表，而是各自只做自己那块屏做得了的事。**
 * ══════════════════════════════════════════════════════════════
 */

interface Props {
  /** 是否已下课同步 */
  synced: boolean
  /** 本节已打点几次 */
  markCount: number
  /** 老师此刻正讲到第几条知识点（0 起） */
  pointIndex: number
  /** 那条知识点的文字 */
  pointLabel: string
  /** 在手表上按一下「没听懂」 */
  onMark: () => void
  /** 下课 · 同步到手机 */
  onSync: () => void
}

export default function WatchFace({ synced, markCount, pointIndex, pointLabel, onMark, onSync }: Props) {
  /*
   * 按下去那一下要有反馈。真机上是震动马达，
   * 屏幕上就把它画成一圈荡开的涟漪 —— 演示时看得见才算数。
   */
  const [ripple, setRipple] = useState(0)

  useEffect(() => {
    if (ripple === 0) return
    const t = setTimeout(() => setRipple(0), 900)
    return () => clearTimeout(t)
  }, [ripple])

  const press = () => {
    if (synced) return
    onMark()
    setRipple(r => r + 1)
  }

  return (
    <div className="flex w-[188px] shrink-0 flex-col items-center">
      {/* 表带（上） */}
      <div className="h-9 w-[96px] rounded-t-[22px] bg-gradient-to-b from-[#2a3646] to-[#1b2634]" />

      {/* 表壳 */}
      <div className="relative rounded-[44px] bg-[#0f1723] p-[9px] shadow-phone">
        {/* 表冠 */}
        <div className="absolute -right-[3px] top-[52px] h-[26px] w-[5px] rounded-r-full bg-[#2a3646]" />

        {/* 屏幕 */}
        <div className="relative flex h-[214px] w-[172px] flex-col overflow-hidden rounded-[36px] bg-[#0b1220]">
          {/* 状态行：时刻 + 记录状态（红线：记录中这件事必须一直看得见） */}
          <div className="flex items-center justify-between px-3.5 pt-3">
            <span className="text-[10.5px] font-semibold tabular-nums text-white/85">{WATCH_CLOCK}</span>
            <span className="flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 rounded-full ${synced ? 'bg-cheer-400' : 'animate-pulse bg-warm-400'}`}
              />
              <span className="text-[9px] text-white/55">{synced ? '已同步' : '记录中'}</span>
            </span>
          </div>

          {/* 老师正讲到哪一条 —— 打点会自动挂到它上面 */}
          <div className="mt-3.5 px-3.5">
            <div className="text-[8.5px] tracking-wide text-white/40">
              {synced ? '本节课已记录完' : `老师正在讲 第 ${pointIndex + 1} 条`}
            </div>
            <div className="mt-1 line-clamp-2 text-[10.5px] leading-[1.5] text-white/80">{pointLabel}</div>
          </div>

          {/* 唯一的交互 */}
          <div className="relative mb-3 mt-auto flex flex-col items-center">
            {ripple > 0 && (
              <span
                key={ripple}
                className="watch-ripple pointer-events-none absolute top-0 h-[62px] w-[62px] rounded-full border-2 border-warm-400"
              />
            )}
            <button
              onClick={press}
              disabled={synced}
              aria-label="没听懂，记一下"
              className={`tap relative flex h-[62px] w-[62px] items-center justify-center rounded-full text-[11px] font-bold transition ${
                synced ? 'bg-white/10 text-white/30' : 'bg-warm-500 text-white active:scale-95'
              }`}
            >
              {synced ? <IconCheck className="h-5 w-5" /> : '没听懂'}
            </button>
            <div className="mt-2 h-3 text-[9px] text-white/45">
              {markCount === 0 ? '听不懂就按一下' : `本次已打点 ${markCount} 次`}
            </div>
          </div>
        </div>
      </div>

      {/* 表带（下） */}
      <div className="h-9 w-[96px] rounded-b-[22px] bg-gradient-to-t from-[#2a3646] to-[#1b2634]" />

      {/* 下课同步。真机上是自动的，演示需要一个按得下去的触发点 */}
      {synced ? (
        <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-cheer-50 px-3 py-2 text-[12px] font-semibold text-cheer-700">
          <IconCheck className="h-3.5 w-3.5" />
          本节课已同步
        </div>
      ) : (
        <button
          onClick={onSync}
          className="tap mt-3 rounded-xl bg-ink-900 px-3.5 text-[12px] font-semibold text-white transition hover:bg-ink-800"
        >
          下课 · 同步到手机
        </button>
      )}
    </div>
  )
}
