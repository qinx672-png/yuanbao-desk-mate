/**
 * 语音体检：量一遍正式音频的语速，确认发出去的确实是 VV + 0 档。
 *
 * 它的真正用途是**抓「发布了错的音色」**这一类错误 —— 换音色、换档位、或某几句
 * 被别的参数渲染过，都会让分布出现第二座峰。所以看的是**分布**，不是均值。
 *
 * ⚠️ 两个踩过的坑，都写在这儿免得重犯：
 *   1. 豆包返回的是 **MPEG-2 / 24kHz** —— 比特率表和每帧采样数都和 MPEG-1 不同。
 *      按 MPEG-1 查表会算出 10 字/秒 这种不可能的数。
 *   2. **口径**：本脚本一律「标点不计」。凡是含标点的字/秒数**不能**和这里的
 *      输出并排比较。见下面「参照」那段为什么只留了两个数。
 */
import { readFile } from 'node:fs/promises'
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './tts-lib.mjs'

// 按版本号分表：version bits 3=MPEG-1, 2=MPEG-2, 0=MPEG-2.5
const SAMPLE_RATES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] }
const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
const BITRATES_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]

/** 数一遍 MP3 帧，返回总时长（秒） */
function duration(buf) {
  let i = 0
  // 跳过 ID3v2
  if (buf.length > 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    i = 10 + ((buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9])
  }
  let seconds = 0
  let frames = 0
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) {
      i++
      continue
    }
    const ver = (buf[i + 1] >> 3) & 0x03
    const layer = (buf[i + 1] >> 1) & 0x03
    const bitrateIdx = (buf[i + 2] >> 4) & 0x0f
    const rateIdx = (buf[i + 2] >> 2) & 0x03
    if (ver === 1 || layer !== 1 || bitrateIdx === 0 || bitrateIdx === 15 || rateIdx === 3) {
      i++
      continue
    }
    const table = ver === 3 ? BITRATES_V1_L3 : BITRATES_V2_L3
    const bitrate = table[bitrateIdx] * 1000
    const sampleRate = SAMPLE_RATES[ver][rateIdx]
    const spf = ver === 3 ? 1152 : 576 // ← MPEG-2 是 576，不是 1152
    if (!bitrate || !sampleRate) {
      i++
      continue
    }
    seconds += spf / sampleRate
    frames++
    i += Math.floor((spf / 8) * bitrate / sampleRate)
  }
  return { seconds, frames }
}

const OUT = join(ROOT, 'public', 'voice')
const manifest = JSON.parse(await readFile(join(OUT, 'manifest.json'), 'utf8'))

const rows = []
const skipped = []
for (const [text, file] of Object.entries(manifest)) {
  const p = join(OUT, file)
  if (!existsSync(p)) {
    skipped.push(`缺文件  ${file}  ${text.slice(0, 20)}`)
    continue
  }
  const { seconds } = duration(await readFile(p))
  const chars = text.replace(/[\s\p{P}]/gu, '').length // 只数实字，标点不计
  // 太短的句子量语速没意义（「嗯。」1 个字 ÷ 0.6 秒 = 1.7，纯噪声），所以排除。
  // ⚠️ 但排除要**打出来**：2026-09-14 我因为没看见这个过滤，把「实测条数比磁盘少 5」
  //    当成了漏生成，白排查一轮。静默的过滤器 = 下一次的假警报。
  if (seconds > 0.5 && chars >= 6) rows.push({ text, seconds, chars, rate: chars / seconds })
  else skipped.push(`太短    ${file}  「${text}」（${chars} 实字 / ${seconds.toFixed(1)} 秒）`)
}

// 在册但没进统计的，一条不落地列出来，让人能自己判断该不该担心
if (skipped.length) {
  console.log(`\n未计入统计的 ${skipped.length} 条（在册，只是不适合量语速）：`)
  for (const s of skipped) console.log('  · ' + s)
}

rows.sort((a, b) => a.rate - b.rate)
const avg = rows.reduce((s, r) => s + r.rate, 0) / rows.length

console.log(`\n量了 ${rows.length} 条音频的语速（字/秒，标点不计）\n`)
console.log(`  平均  ${avg.toFixed(2)}`)
console.log(`  中位  ${rows[Math.floor(rows.length / 2)].rate.toFixed(2)}`)
console.log(`  最低  ${rows[0].rate.toFixed(2)}  ← ${rows[0].text.slice(0, 24)}`)
console.log(`  最高  ${rows[rows.length - 1].rate.toFixed(2)}  ← ${rows[rows.length - 1].text.slice(0, 24)}`)
// ⚠️ 参照值必须和上面的测量值同口径（都是标点不计），否则并排印出来就是在骗人。
//    2026-09-13 这里原本印的是「温柔小雅 4.5 ｜ 新闻联播 ≈5 ｜ VV+0 5.1 ｜ VV+20 6.3」，
//    四个数全是**含标点**口径 —— 其中一个还是我当场撤回过的（「新闻联播 ≈5」没核实过口径）。
//    教训：撤回一个数字，要连它出现的每一处一起改，不然它会从这个角落爬回来。
console.log(`
参照（同为标点不计口径）：
  温柔小雅 +0   4.14   ← 换 VV 之前的旧音色
  VV +0         4.44   ← 本次上线音色，4 句教学台词实测
  本次正式上线的中位数落在 4.34（见上），和 4.44 同档 —— 确认发出去的是 VV+0
  （「VV+20 = 6.3」「新闻联播 ≈ 5」是含标点的数，口径不同，别拿来比）
`)

// 分档统计，看是不是整体落在一档上（而不是混了两种音色）
const buckets = { '<4.0': 0, '4.0~4.7': 0, '4.7~5.5': 0, '5.5~6.0': 0, '>=6.0': 0 }
for (const r of rows) {
  if (r.rate < 4.0) buckets['<4.0']++
  else if (r.rate < 4.7) buckets['4.0~4.7']++
  else if (r.rate < 5.5) buckets['4.7~5.5']++
  else if (r.rate < 6.0) buckets['5.5~6.0']++
  else buckets['>=6.0']++
}
console.log('分布：')
for (const [k, v] of Object.entries(buckets)) {
  console.log(`  ${k.padEnd(9)} ${String(v).padStart(3)}  ${'█'.repeat(Math.round(v / 2))}`)
}
console.log()

// 总时长：一次演示要听多久
const totalSec = rows.reduce((s, r) => s + r.seconds, 0)
console.log(`全部 ${rows.length} 条加起来 ${(totalSec / 60).toFixed(1)} 分钟`)
console.log(`目录体积 ${(readdirSync(OUT).filter(f => f.endsWith('.mp3')).reduce((s, f) => s + statSync(join(OUT, f)).size, 0) / 1048576).toFixed(1)} MB\n`)
