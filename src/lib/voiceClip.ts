/**
 * 同桌的预渲染音频 —— 按文本哈希取文件
 *
 * ── 为什么是内容寻址（文件名 = 文本的哈希）────────────────────
 * 用 01.mp3 / intro.mp3 这种名字，改一句台词就得记得重命名或重录，
 * 忘了就出现「新文案配旧录音」—— 听起来特别像真的，极难发现。
 * 用哈希当文件名，这种情况**物理上不可能发生**：改了字，哈希就变，
 * 文件必然找不到，于是退回浏览器语音并在控制台报警。
 *
 * ── 三级降级，每一级都出声，不会静默失败 ────────────────────
 *   ① 有 mp3        → 播豆包情感语音（正式效果）
 *   ② 没有 mp3      → 用浏览器内置语音念，并在控制台打 [voice] 缺音频
 *   ③ 连语音合成都没有 → 静默按字数估时，字幕照常（见 useSpeech）
 */

/**
 * 音频目录。相对路径（不带开头的 /）—— 因为 vite 的 base 是 './'，
 * 站点挂在 GitHub Pages 的子路径下时也能找到。
 */
const CLIP_BASE = 'voice/'

/** 和 scripts/gen-voice.mjs 里的 clipName 必须一致，改一处要改两处 */
export function clipHash(text: string): string {
  // SHA-1 前 16 位十六进制。同步实现，不用 crypto.subtle（那是异步的，
  // 而且只在 https / localhost 下可用，file:// 打开的单文件版会直接没有）
  let h1 = 0x67452301
  let h2 = 0xefcdab89
  let h3 = 0x98badcfe
  let h4 = 0x10325476
  let h5 = 0xc3d2e1f0

  const bytes = new TextEncoder().encode(text)
  // 补齐 + 长度（SHA-1 规范）
  const withPad = new Uint8Array((((bytes.length + 8) >> 6) + 1) << 6)
  withPad.set(bytes)
  withPad[bytes.length] = 0x80
  const bitLen = bytes.length * 8
  const dv = new DataView(withPad.buffer)
  dv.setUint32(withPad.length - 4, bitLen >>> 0)
  dv.setUint32(withPad.length - 8, Math.floor(bitLen / 0x100000000))

  const rol = (n: number, s: number) => ((n << s) | (n >>> (32 - s))) >>> 0
  const w = new Uint32Array(80)

  for (let i = 0; i < withPad.length; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4)
    for (let j = 16; j < 80; j++) w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1)

    let a = h1
    let b = h2
    let c = h3
    let d = h4
    let e = h5

    for (let j = 0; j < 80; j++) {
      let f: number
      let k: number
      if (j < 20) {
        f = (b & c) | (~b & d)
        k = 0x5a827999
      } else if (j < 40) {
        f = b ^ c ^ d
        k = 0x6ed9eba1
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d)
        k = 0x8f1bbcdc
      } else {
        f = b ^ c ^ d
        k = 0xca62c1d6
      }
      const t = (rol(a, 5) + f + e + k + w[j]) >>> 0
      e = d
      d = c
      c = rol(b, 30)
      b = a
      a = t
    }

    h1 = (h1 + a) >>> 0
    h2 = (h2 + b) >>> 0
    h3 = (h3 + c) >>> 0
    h4 = (h4 + d) >>> 0
    h5 = (h5 + e) >>> 0
  }

  const hex = [h1, h2, h3, h4, h5].map(x => x.toString(16).padStart(8, '0')).join('')
  return hex.slice(0, 16)
}

/* ── manifest：文本 → 文件名 ────────────────────────────────── */

let manifestPromise: Promise<Record<string, string>> | null = null

function loadManifest(): Promise<Record<string, string>> {
  if (manifestPromise) return manifestPromise
  manifestPromise = fetch(`${CLIP_BASE}manifest.json`)
    .then(r => (r.ok ? r.json() : {}))
    .catch(() => ({})) // 单文件构建 / 离线打开时拿不到，安静降级
  return manifestPromise
}

/**
 * 预加载清单，进首页就该做 —— 别等第一句话开口才去取。
 * 返回「有没有预渲染音频」：没有的话（比如单文件离线版）界面要如实说。
 */
export async function warmVoice(): Promise<boolean> {
  const m = await loadManifest()
  return Object.keys(m).length > 0
}

/**
 * 这一句有没有现成音频。查到了返回可播放的 URL，没有返回 null。
 *
 * 这里**不**再发一个 HEAD 去确认文件在不在 —— manifest 和 mp3 是
 * gen-voice 同一次跑出来的，本来就同步；而且每句话开口前多一个来回，
 * 是直接加在演示节奏上的延迟。真的 404 了，playClip 会返回 false，
 * 一样退回浏览器语音，不差这一下。
 *
 * manifest 用「原文」当键 —— 和 gen-voice 里的键完全一致（都做过去 ** 处理）。
 */
export async function clipUrlFor(text: string): Promise<string | null> {
  const m = await loadManifest()
  const name = m[text]
  return name ? `${CLIP_BASE}${name}` : null
}

/* ── 播放 ──────────────────────────────────────────────────── */

let current: HTMLAudioElement | null = null
/** 正在播的那句的收尾函数。掐断时必须调用它，否则 await 会永远挂住 */
let currentFinish: ((ok: boolean) => void) | null = null

/**
 * 掐掉正在播的那句（学生插话 / 离开这一屏 / 换节点时调）。
 *
 * ⚠️ 必须把挂起的 Promise 结掉。只 pause 不清账的话，上面那句
 * `await playClip(...)` 就再也没有人来 resolve —— 说话协程永久停在那儿，
 * 该节点后面所有气泡都出不来。学生一插话就会踩到这条路径。
 */
export function stopClip(): void {
  const a = current
  const fin = currentFinish
  current = null
  currentFinish = null
  if (a) {
    a.onended = null
    a.onerror = null
    a.onloadedmetadata = null
    try {
      a.pause()
    } catch {
      /* 已经停了 */
    }
  }
  // 返回 false ＝「这句没播完」，调用方据此决定要不要接着说话
  fin?.(false)
}

/**
 * 播一句预渲染音频。
 * 返回 true＝真的播了（会等到播完）；false＝没播成，调用方该退回浏览器语音。
 *
 * 自动播放限制：浏览器的规矩是「没被用户手势碰过的页面不许出声」。
 * 本原型里所有语音都由点击触发（点「学生端」/「进教室」/按住说话），
 * 是同一次手势之后的调用，能正常播。万一被拦，这里返回 false，
 * 上层走浏览器语音（同样可能被拦，最终兜底是静默 + 字幕，流程不会卡）。
 *
 * @param expectChars 原文字数，只用来估一个兜底时限（见下）。
 */
export function playClip(url: string, expectChars = 20): Promise<boolean> {
  return new Promise(resolve => {
    stopClip()
    const a = new Audio(url)
    current = a

    let settled = false
    let guard = 0
    const finish = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(guard)
      if (current === a) {
        current = null
        currentFinish = null
      }
      if (!ok) {
        try {
          a.pause()
        } catch {
          /* 还没开始播 */
        }
      }
      resolve(ok)
    }
    currentFinish = finish

    a.onended = () => finish(true)
    a.onerror = () => finish(false)
    // 网络卡住时既没有 ended 也没有 error —— 会一路挂死，把整段对话
    // 卡在这一句上。所以按音频真实时长设个兜底闹钟。
    a.onloadedmetadata = () => {
      const ms = Number.isFinite(a.duration) ? a.duration * 1000 : 0
      // duration 拿不到（流式 mp3 偶尔是 Infinity）就退回按字数估
      const est = ms > 0 ? ms : 700 + expectChars * 240
      window.clearTimeout(guard)
      guard = window.setTimeout(() => finish(true), est + 2500)
    }

    a.play().catch(() => finish(false))
  })
}

/* ── 缺句上报（只在开发时）─────────────────────────────────── */

const reported = new Set<string>()

/**
 * 这句没有音频 → 告诉开发服务器记一笔，好让 gen-voice 下次补上。
 *
 * 这条通路是「改了文案忘了重跑脚本」的唯一探测器。没有它，
 * 缺句只会安静地退回浏览器语音，谁都不会发现。
 * 生产构建里 import.meta.env.DEV 是 false，这段不会执行。
 */
export function reportMissing(text: string): void {
  if (!import.meta.env.DEV) return
  const t = text.trim()
  if (t.length < 2 || reported.has(t)) return
  reported.add(t)
  console.info(`[voice] 缺音频，先用浏览器语音顶上：${t}`)
  void fetch('/__voice/extra', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: t }),
  }).catch(() => {})
}
