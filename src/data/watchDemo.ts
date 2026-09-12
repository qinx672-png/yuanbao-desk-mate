import type { WatchMark } from '@/types'

/**
 * 手表端课堂打点 · 演示种子数据
 *
 * 这节课（9月11日 第3节 · 电路故障的判断方法）学生已经打过两个点。
 * 先给两条，是因为「打点 → 挂到知识点上」这层关系，
 * 空着看不出来，得有一条已经挂好的才看得懂。
 */
export const watchSeedMarks: WatchMark[] = [
  { id: 1, at: '10:08', index: 0 },
  { id: 2, at: '10:11', index: 1 },
]

/** 手表屏幕上显示的时刻（这节课进行到这儿） */
export const WATCH_CLOCK = '10:14'

/**
 * 打点时刻：从 10:12 起，每打一次往后走一分钟。
 * 演示用 —— 真机上取的是系统时间。
 */
export function nextMarkTime(count: number): string {
  const total = 10 * 60 + 12 + count
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
