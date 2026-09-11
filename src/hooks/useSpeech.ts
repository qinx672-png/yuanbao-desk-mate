import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 语音层：同桌说话（TTS）+ 学生说话（语音识别）
 *
 * ── 为什么用浏览器内置的 Web Speech API ──────────────────────
 * 零依赖、不用装东西、不用 API Key、不用联网，原型里能真出声。
 * 不接豆包/腾讯 TTS：那要 API Key，浏览器直接调会把密钥暴露在前端，
 * 原型阶段不该这么干（真实产品里由服务端签发临时凭证）。
 *
 * ── 关于「自动播放」 ─────────────────────────────────────
 * 浏览器禁止页面加载后自动出声。本原型里的语音都由学生的点击触发
 * （点「学生端」/「进教室」），是同一个文档里的用户手势，能正常发声。
 * 万一被拦，speak() 会走静音路径，字幕照常，不会卡住流程。
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
  const [voiceName, setVoiceName] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)

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
    }
  }, [])

  /**
   * 说一句话。真出声时按语音实际时长返回；
   * 静音 / 无中文语音时按「读一遍」的时长停一下，保证字幕看得清。
   */
  const speak = useCallback(
    (text: string) =>
      new Promise<void>(resolve => {
        let settled = false
        let guard = 0
        const finish = () => {
          if (settled) return
          settled = true
          window.clearTimeout(guard)
          setSpeaking(false)
          resolve()
        }

        const silent = muted || !ttsReady || !voiceRef.current
        if (silent) {
          guard = window.setTimeout(finish, 800 + text.length * 68)
          return
        }

        const synth = window.speechSynthesis
        synth.cancel()
        const u = new SpeechSynthesisUtterance(text)
        u.lang = 'zh-CN'
        u.voice = voiceRef.current
        u.rate = 1.02
        u.pitch = 1.06
        u.onend = finish
        u.onerror = finish
        // 兜底：onend 偶尔不触发，别让流程卡死
        guard = window.setTimeout(finish, 2200 + text.length * 420)
        setSpeaking(true)
        synth.speak(u)
      }),
    [muted, ttsReady],
  )

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [])

  return { speak, stop, speaking, muted, setMuted, ttsReady, voiceName }
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
