/**
 * 复查状态机自测 —— 不需要开浏览器，不依赖 React。
 *
 * 跑法（在 prototype 目录下）：
 *   node scripts/check-followUp.mjs
 *
 * 它的作用：把 advance() 的规则全部走一遍，把「输入 → 输出」打出来。
 * 规则改了、或者谁改坏了，跑一下就看得见。
 */

import { advance, intervalDaysOf } from '../src/lib/followUp.ts'

/** 一个刚被识别出来、还没复查过的薄弱点 —— 也就是 mockData 里 k1 的状态 */
const SEED = {
  status: '待复查',
  round: 0,
  mode: '场景触发',
  nextTrigger: '下次遇到这个知识点的题时，先插 1 道复查题',
}

function show(label, f) {
  const days = intervalDaysOf(f)
  const interval = days === null ? '不再排期' : `间隔 ${days} 天`
  const flag = f.needsReteach ? '  ⚠️ 下一轮要先重讲' : ''
  console.log(`  ${label.padEnd(24)} → ${f.status}（第 ${f.round} 轮） · ${interval}${flag}`)
  console.log(`  ${' '.repeat(24)}   「${f.nextTrigger}」`)
  console.log('')
}

console.log('\n═══ 场景一：连续通过（正常路径，直达终点）═══\n')
let a = SEED
show('起点：刚识别出薄弱点', a)
a = advance(a, '通过'); show('第 1 次复查：通过', a)
a = advance(a, '通过'); show('第 2 次复查：通过', a)
a = advance(a, '通过'); show('第 3 次抽查：通过', a)
a = advance(a, '通过'); show('再查一次：通过', a)

console.log('═══ 场景二：中途没通过（A 档规则）═══\n')
let b = SEED
show('起点：刚识别出薄弱点', b)
b = advance(b, '通过'); show('第 1 次复查：通过', b)
b = advance(b, '未通过'); show('第 2 次复查：未通过', b)
b = advance(b, '通过'); show('重讲后再查：通过', b)

console.log('═══ 场景三：抽查没过（退回起点）═══\n')
let c = SEED
c = advance(c, '通过')
c = advance(c, '通过'); show('已达「已巩固」', c)
c = advance(c, '未通过'); show('抽查：未通过', c)

console.log('═══ 场景四：已移出是终点（吸收一切输入）═══\n')
let d = SEED
d = advance(d, '通过')
d = advance(d, '通过')
d = advance(d, '通过'); show('已达「已移出」', d)
d = advance(d, '未通过'); show('终点再按「未通过」', d)
d = advance(d, '通过'); show('终点再按「通过」', d)

console.log('═══ 规则速查 ═══\n')
console.log('  通过：待复查 → 复查中 → 已巩固 → 已移出（终点，不再排期）')
console.log('  未通过：不论第几轮，一律退回「待复查」、轮次归 0、先重讲一遍')
console.log('  已移出：终点，吸收一切输入 —— 通过 / 未通过都改不动它')
console.log('  间隔：待复查 3 天 · 复查中 7 天 · 已巩固 21 天 · 已移出 不排期')
console.log('')
