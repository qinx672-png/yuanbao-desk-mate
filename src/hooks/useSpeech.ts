import { useCallback, useEffect, useRef, useState } from 'react'
import { clipUrlFor, playClip, reportMissing, stopClip, warmVoice } from '@/lib/voiceClip'

/**
 * 语音层：同桌说话（TTS）+ 学生说话（语音识别）
 *
 * ── 同桌的声音从哪来 ────────────────────────────────────────
 * 首选**预渲染的豆包情感语音**（mp3，见 lib/voiceClip.ts 与
 * scripts/gen-voice.mjs）：音色是「温柔小雅」，带 tender 情感参数，
 * 这是演示里听到的正式效果。
 *
 * 找不到对应 mp3 时，退回浏览器内置的 Web Speech API —— 也就是
 * 之前那版「非常僵硬」的机器音。**它是兜底，不是主路径**：
 * 缺音频会在控制台打 [voice] 缺音频，开发时还会自动记进
 * scripts/voice-extra.json，下次跑 gen-voice 就补上了。
 *
 * 为什么不实时调豆包接口：那要么把密钥塞进前端（绝对不行），
 * 要么挂个后端（静态站就没声音了）。台词本来就是静态数据，
 * 一次性合成好当静态资源发，密钥不进前端、离线可用、零延迟。
 *
 * ── 关于「自动播放」 ─────────────────────────────────────
 * 浏览器禁止页面加载后自动出声。本原型里的语音都由学生的点击触发
 * （点「学生端」/「进教室」），是同一个文档里的用户手势，能正常发声。
 * 万一被拦，会退回浏览器语音（同样可能被拦），最终兜底是静默 + 字幕，
 * 流程不会卡。
 *
 * ── 关于语音识别（STT）───────────────────────────────────
 * SpeechRecognition 在 Chrome 上依赖境外服务，国内常常不可用。
 * 所以这里做两档：能用就用真的，不能用就回落成模拟识别，
 * 并且把「真/模拟」如实报给界面 —— 界面上会标出来，不装作是真听懂了。
 */

/** 语音识别的最小类型垫片（TS 标准库不含 SpeechRecognition） */
interface SttResultEvent {
  results?: { 0?: { 0?: { transcript?: string } } }
}
interface SttLike {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: SttResultEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}
type SttCtor = new () => SttLike

const getSttCtor = (): SttCtor | null => {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: SttCtor; webkitSpeechRecognition?: SttCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** 等一会儿（用于句子之间的呼吸） */
export const wait = (ms: number) => new Promise<void>(r => window.setTimeout(r, ms))

export function useSpeech() {
  const [ttsReady, setTtsReady] = useState(false)
  const [clipReady, setClipReady] = useState(false)
  const [voiceName, setVoiceName] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

  // 预渲染音频有没有到位。界面用它决定说「同桌有声」还是「字幕模式」——
  // 不能再看 ttsReady（那只是「这台机器装没装中文语音」，装没装都还有 mp3）
  useEffect(() => {
    void warmVoice().then(setClipReady)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const pick = () => {
      const list = window.speechSynthesis.getVoices()
      // 优先中文语音；找不到就走静音路径
      const zh = list.find(v => v.lang?.toLowerCase().startsWith('zh'))
      if (zh) {
        voiceRef.current = zh
        setVoiceName(zh.name)
        setTtsReady(true)
      }
    }
    pick()
    // 语音列表是异步加载的，第一次拿不到要再等等
    window.speechSynthesis.addEventListener('voiceschanged', pick)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', pick)
      window.speechSynthesis.cancel()
      stopClip() // 卸载时把还在播的 mp3 一起停掉，否则它会把整页说完
    }
  }, [])

  /** 浏览器内置语音念一句（兜底路径）。真出声时按实际时长返回 */
  const speakByBrowser = useCallback(
    (text: string) =>
      new Promise<void>(resolve => {
        const synth = window.speechSynthesis
        if (!synth || !voiceRef.current) {
          // 连中文语音都没有 → 按「读一遍」的时长静停，保证字幕看得清
          window.setTimeout(resolve, 800 + text.length * 68)
          return
        }
        let settled = false
        const finish = () => {
          if (settled) return
          settled = true
          window.clearTimeout(guard)
          resolve()
        }
        synth.cancel()
        const u = new SpeechSynthesisUtterance(text)
        u.lang = 'zh-CN'
        u.voice = voiceRef.current
        u.rate = 1.02
        u.pitch = 1.06
        u.onend = finish
        u.onerror = finish
        // 兜底：onend 偶尔不触发，别让流程卡死
        const guard = window.setTimeout(finish, 2200 + text.length * 420)
        synth.speak(u)
      }),
    [],
  )

  /**
   * 说一句话。等到这句**真的念完**才 resolve —— 上层靠它控制字幕节奏。
   *
   * 顺序：预渲染 mp3 → 浏览器语音 → 静停（按字数估）。
   * 只有 muted 是「不出声」，其余每一档都尽量出声。
   */
  const speak = useCallback(
    async (text: string) => {
      if (muted) {
        await wait(800 + text.length * 68)
        return
      }

      setSpeaking(true)
      try {
        // ① 预渲染音频（正式效果）
        const url = await clipUrlFor(text)
        if (url) {
          if (await playClip(url, text.length)) return
          // manifest 里在册、实际却播不出来 —— 文件被删过 / 格式不对。
          // 这类问题不报给收集口（那会往 voice-extra.json 里塞已有的句子），
          // 只打警告，让人去查文件本身。
          console.warn(`[voice] 在册但播不出来，已退回浏览器语音：${url}`)
        } else {
          // ② 没有音频：记一笔待合成，并用浏览器语音把这一句顶上
          reportMissing(text)
        }
        await speakByBrowser(text)
      } finally {
        setSpeaking(false)
      }
    },
    [muted, speakByBrowser],
  )

  const stop = useCallback(() => {
    stopClip()
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  // canSpeak＝「同桌到底能不能出声」，这才是界面上该显示的状态：
  // 有预渲染音频能出声，或者退一步有浏览器中文语音也能出声。
  // 两者都没有才是真的「字幕模式」。
  return { speak, stop, speaking, muted, setMuted, canSpeak: clipReady || ttsReady, voiceName }
}

/**
 * 听学生说话。
 * 返回 { text, real }：real=false 表示这句是原型模拟的，界面要如实标注。
 */
export function useListening() {
  const [available, setAvailable] = useState(false)
  const recRef = useRef<SttLike | null>(null)

  useEffect(() => {
    setAvailable(!!getSttCtor())
    return () => {
      try {
        recRef.current?.stop()
      } catch {
        /* 没在听就忽略 */
      }
    }
  }, [])

  const listen = useCallback(
    (simulated: string) =>
      new Promise<{ text: string; real: boolean }>(resolve => {
        const Ctor = getSttCtor()
        if (!Ctor) {
          resolve({ text: simulated, real: false })
          return
        }
        let settled = false
        const finish = (text: string, real: boolean) => {
          if (settled) return
          settled = true
          try {
            recRef.current?.stop()
          } catch {
            /* 已经停了 */
          }
          resolve({ text, real })
        }
        try {
          const rec = new Ctor()
          rec.lang = 'zh-CN'
          rec.interimResults = false
          rec.maxAlternatives = 1
          rec.onresult = e => {
            const t = e.results?.[0]?.[0]?.transcript?.trim()
            // 真听到了就用真的；没听清不编，交给上层再问一遍
            finish(t || simulated, !!t)
          }
          rec.onerror = () => finish(simulated, false)
          rec.onend = () => finish(simulated, false)
          window.setTimeout(() => finish(simulated, false), 7000)
          recRef.current = rec
          rec.start()
        } catch {
          resolve({ text: simulated, real: false })
        }
      }),
    [],
  )

  return { listen, sttAvailable: available }
}
