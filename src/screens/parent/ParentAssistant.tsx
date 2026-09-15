import { useCallback, useEffect, useRef, useState } from 'react'
import type { AssistantQuickAsk } from '@/types'
import { assistantThread, assistantQuickAsks, student } from '@/data/mockData'
import { IconShield, IconSpark, IconArrowRight, IconSound, IconSoundOff, IconMic } from '@/components/common/Icons'
import { useSpeech, useListening, wait } from '@/hooks/useSpeech'

/**
 * 屏 · 家长专属 AI 助手（定位说明 3.6）
 *
 * ── 这一屏的语音边界（2026-09-13 修订，原来写的是「一律不做」）────
 * 原话是：「家长多半在办公室或通勤路上，问的是要精确答案的问题，
 * 打字比说话更准、也更有分寸 —— **语音是给孩子的能力，不是统一形态**。」
 *
 * 这段话一半对一半错，所以是收窄，不是推翻：
 *   · **对的那半**：周报、薄弱点、趋势图那些**报表页**不念。那些是精确数据
 *     （「L₂ 断路 4 次」「掌握度 62%」），念出来听岔了没法回看，语音是负分。
 *     那几屏至今一句语音都没有，这条继续成立。
 *   · **错的那半**：把「家长」当成一个统一场景。这一屏是**对话**，
 *     而家长真在通勤路上时，他**根本没法打字** —— 那恰恰是语音该上场的地方。
 *     所以「家长端不开口」这个结论下大了，该收成「报表不念，对话可以开口」。
 *
 * 现状：助手的回复会念出来，也可以按住麦克风直接问。
 * 语音仍然只是**多给一条通道**，打字和点选一直是等价的、一直都在。
 *
 * ── 为什么不把历史记录一起念出来 ─────────────────────────────
 * 进这一屏时已有十几条旧消息。全念等于强迫家长听一分半钟独白，
 * 而且他大概率已经读过了。**只念「你刚问出来的那条」** ——
 * 语音回答的是「你刚刚问的那件事」，不是「这个页面有什么」。
 *
 * ── 这一屏的灵魂不是「能问」，是「有一件事它不给」──────────
 * 家长问「他跟你聊的时候说过不想学吗？原话给我看看」——
 * 助手答：**这个我不能给。** 学生和助手的对话原文不向家长透传，
 * 因为这是孩子愿意说实话的前提。
 * 一条拒绝，比十条能力更能说明「透明但不在场」到底是什么意思。
 * 所以那条回复被单独标出来，是整个页面的视觉重心。
 *
 * ── 诚实说明 ───────────────────────────────────────────────
 * 原型里打字提问走的是关键词匹配（见 answerFor），答不上来时如实说
 * 「原型里我只准备了下面这几个问题」，不编一个像模像样的回答糊过去。
 * 真实实现由 LLM 基于学情数据作答。
 * 语音识别（STT）在国内浏览器上常常不可用，用不了时**如实标注**
 * 「原型模拟识别」，不装作真听懂了。
 */

type Msg = {
  from: 'ai' | 'parent'
  text: string
  source?: string
  /** 家长那句其实是原型模拟的（STT 用不了时的兜底）—— 界面上如实标出来 */
  simulated?: boolean
}

/**
 * 原型：主题词命中。真跑由 LLM 基于学情数据回答。
 *
 * ── 这一版修的是什么 ────────────────────────────────────────
 * 旧版拿问题的每个字去 label 里找，命中 30% 算匹配。实测《产品定位说明》
 * 148-162 行承诺的 5 个例子：6 问 5 不中，唯一「中」的那个还答非所问 ——
 * 问「今天学了什么」，它答「今天该练什么」。连屏上输入框自己写的
 * placeholder 都答不上来。
 *
 * 现在改成主题词命中：家长的话里出现哪个主题词，就归到哪一类，
 * 命中最多的那条胜出。它仍然不是理解 —— 但「问什么答什么」成立了。
 *
 * 一个都没命中时，如实说答不上来，不编一个像模像样的回答糊过去。
 * 这个产品对家长的第一句承诺就是「我基于学情数据回答，也会说不」，
 * 那就得真的会说不。
 */
function answerFor(q: string): { text: string; source: string } | null {
  let best: AssistantQuickAsk | null = null
  let bestScore = 0
  for (const a of assistantQuickAsks) {
    const score = a.keys.filter(k => q.includes(k)).length
    if (score > bestScore) {
      best = a
      bestScore = score
    }
  }
  return best ? { text: best.answer, source: best.source } : null
}

export default function ParentAssistant() {
  const [msgs, setMsgs] = useState<Msg[]>(assistantThread.map(m => ({ ...m })))
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState(false)
  /** 语音识别在不在。不在时麦克风照按，但要如实标「原型模拟识别」 */
  const [listening, setListening] = useState(false)

  const { speak, stop, muted, setMuted, canSpeak } = useSpeech()
  const { listen, sttAvailable } = useListening()

  const scrollRef = useRef<HTMLDivElement>(null)
  /**
   * 代次号：家长连着问、或者问到一半又按了麦克风时，
   * 用它把在飞的那一轮作废 —— 否则两条回复会前后脚冒出来。
   */
  const runRef = useRef(0)
  const simIdx = useRef(0)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, pending])

  useEffect(
    () => () => {
      runRef.current++
      stop()
    },
    [stop],
  )

  /**
   * 问一句。assistant 的回答会**念出来** —— 家长在开车/通勤时看不了屏幕。
   *
   * 打断：说话期间再问一句，会把上一句掐掉再答新的。
   * 对话不是单向广播，这一点在家长端和学生端是同一条规矩。
   */
  const ask = useCallback(
    async (q: string, simulated = false) => {
      const text = q.trim()
      if (!text) return
      runRef.current++
      stop() // 上一句还没念完就掐掉
      const id = runRef.current

      setDraft('')
      setMsgs(m => [...m, { from: 'parent', text, simulated }])
      setPending(true)

      // 「正在查学情数据」的停顿。跟学生端同一个节奏：先让家长看见它在想
      await wait(900)
      if (runRef.current !== id) return // 期间又问了新的

      const a = answerFor(text)
      const reply: Msg = a
        ? { from: 'ai', text: a.text, source: a.source }
        : {
            from: 'ai',
            text: '这个问题原型里我答不上来 —— 我只准备了学情、教育方法、边界这三类。真实产品里我会基于学情数据回答，答不了的会直接说答不了。',
            source: '诚实说明：原型未接入真实模型',
          }
      setMsgs(m => [...m, reply])
      setPending(false) // 先停掉「正在输入」的三个点，再开口
      await speak(reply.text)
    },
    [speak, stop],
  )

  /**
   * 按住麦克风问。
   *
   * STT 不可用时**不假装听懂了** —— 拿预设问题顶上，并打上
   * 「原型模拟识别」。界面必须说清楚哪句是真的听来的。
   */
  const askByVoice = useCallback(async () => {
    if (listening) return
    setListening(true)
    try {
      const chips = assistantQuickAsks.filter(a => a.chip)
      const canned = chips[simIdx.current++ % Math.max(chips.length, 1)]?.label ?? '他最近状态怎么样'
      const r = await listen(canned)
      await ask(r.text || canned, !r.real)
    } finally {
      setListening(false)
    }
  }, [ask, listen, listening])

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-ink-50">
      {/* ── 常驻边界声明：家长端的第一句话就该是边界 ──────────── */}
      <div className="shrink-0 bg-parent-800 px-5 pt-2.5 pb-3">
        <div className="flex items-center gap-2">
          <IconShield className="w-4 h-4 text-white/70 shrink-0" />
          <span className="text-[13px] font-semibold text-white">{student.name}的学习助手</span>
          {/*
            静音开关。家长在会议室、在车上外放、或者孩子就在旁边 ——
            都得能当场关掉声音，不能逼他去翻系统音量。
          */}
          <button
            onClick={() => setMuted(m => !m)}
            aria-label={muted ? '打开语音' : '静音'}
            title={muted ? '打开语音' : canSpeak ? '静音' : '这台机器放不出声，只能看文字'}
            className={`tap ml-auto shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition ${
              muted ? 'bg-white/10 text-white/50' : 'bg-white/15 text-white'
            }`}
          >
            {muted ? <IconSoundOff className="w-3.5 h-3.5" /> : <IconSound className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[11.5px] text-white/60 leading-relaxed mt-1">
          我基于学情数据回答，也会说不。孩子和同桌的对话原文不会出现在这里 —— 那是他愿意说实话的前提。
        </p>
      </div>

      {/* ── 对话 ─────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 min-h-0 scroll-area px-4 py-4 space-y-3.5">
        {msgs.map((m, i) => (
          <Bubble key={i} m={m} />
        ))}

        {pending && (
          <div className="flex items-center gap-1.5 pl-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-ink-300 animate-typing"
                style={{ animationDelay: `${i * 0.18}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 常问的几个（家长不知道能问什么，这里给脚手架）──────── */}
      <div className="shrink-0 bg-white border-t border-ink-100 px-4 pt-3 pb-3">
        <div className="text-[11px] text-ink-400 mb-1.5">常问的 · 也可以直接打字问</div>
        <div className="flex gap-1.5 overflow-x-auto scroll-area pb-2 -mx-1 px-1">
          {/* 只挂标了 chip 的那几条：全铺上去要横滑三屏，反而谁都看不见 */}
          {assistantQuickAsks.filter(a => a.chip).map(a => (
            <button
              key={a.label}
              onClick={() => void ask(a.label)}
              disabled={pending}
              className="tap shrink-0 rounded-full border border-ink-200 bg-white px-3 text-[12.5px] text-ink-700 hover:border-parent-400 hover:text-parent-700 transition disabled:opacity-50"
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-1">
          {/*
            按住问。家长在开车、在做饭、手上没空的时候，打字这条路是断的 ——
            这是这一屏加语音的唯一理由。
          */}
          <button
            onPointerDown={e => {
              e.currentTarget.setPointerCapture(e.pointerId)
              void askByVoice()
            }}
            disabled={listening || pending}
            aria-label="按住说话"
            title={sttAvailable ? '按住说话' : '这台设备上语音识别不可用 —— 按住会用预设问题演示'}
            className={`tap shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center transition active:scale-95 ${
              listening
                ? 'bg-parent-700 border-parent-700 text-white'
                : 'bg-white border-ink-200 text-parent-700 disabled:opacity-40'
            }`}
          >
            <IconMic className="w-4 h-4" />
          </button>

          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') void ask(draft)
            }}
            placeholder={listening ? '在听…' : '也可以直接问，比如「他最近状态怎么样」'}
            className="flex-1 min-w-0 rounded-xl border border-ink-200 px-3 py-2.5 text-[13.5px] outline-none focus:border-parent-400"
          />
          <button
            onClick={() => void ask(draft)}
            disabled={!draft.trim() || pending}
            className="tap shrink-0 w-10 h-10 rounded-xl bg-parent-700 text-white flex items-center justify-center disabled:bg-ink-200 transition active:scale-95"
            aria-label="发送"
          >
            <IconArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function Bubble({ m }: { m: Msg }) {
  /* 那条「我不能给」—— 整屏的信任证明，单独一个样子 */
  const isBoundary = m.from === 'ai' && m.text.startsWith('这个我不能给')

  if (m.from === 'parent') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[78%] rounded-2xl rounded-br-md bg-parent-700 text-white px-3.5 py-2.5 text-[13.5px] leading-relaxed">
          {m.text}
          {/* 这句不是真听来的 —— 如实标出来，和学生端同一套口径 */}
          {m.simulated && <span className="text-white/60">（原型模拟识别）</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <div
        className={`max-w-[86%] rounded-2xl rounded-bl-md px-3.5 py-3 text-[13.5px] leading-relaxed ${
          isBoundary
            ? 'bg-white border-2 border-cheer-300 text-ink-800 shadow-card'
            : 'bg-white border border-ink-100 text-ink-800'
        }`}
      >
        {isBoundary && (
          <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-cheer-700 mb-1.5">
            <IconShield className="w-3.5 h-3.5" />
            这条我会拒绝
          </div>
        )}
        {m.text}
        {m.source && (
          <div className="flex items-start gap-1 mt-2 pt-2 border-t border-dashed border-ink-200/70">
            <IconSpark className="w-3 h-3 text-ink-300 shrink-0 mt-0.5" />
            <span className="text-[11px] text-ink-400 leading-relaxed">{m.source}</span>
          </div>
        )}
      </div>
    </div>
  )
}
