import { useRef, useState } from 'react'
import { IconMic } from '@/components/common/Icons'

/**
 * 麦克风 · 说 / 点 / 写 三条等价通道
 *
 * ── 为什么会变成三条通道 ────────────────────────────────────
 * 最初这一版只有「按住说话」，打字藏在一条小链接后面，而且那条链接是坏的
 * （写进去的字根本没送出去）。秦肖验收时说他没法说话、演示不了 ——
 * 这一下暴露的不是演示问题，是产品缺陷：
 * **出不了声的孩子会被整个产品挡在门外** —— 课堂上、深夜家里有人睡了、
 * 口齿不清、口音重到识别不了、选择性缄默。这些都不是边缘情况。
 *
 * 所以改成三条等价通道，走进去是同一个意图解析：
 *   · 按住说话（长按 ≥260ms 松手）—— 真语音，能用就用真的
 *   · 点一下麦克风（短按 <260ms）  —— 展开「你可以这样说」，点一句就行
 *   · 直接打字                     —— 同一个面板里，不用再找
 * 默认状态下屏幕上依然只有一个麦克风，面板点开才出现 ——
 * 「谈到什么才出现什么」这条原则没有破。
 *
 * ── 演示价值 ───────────────────────────────────────────────
 * 面试现场演示、投影、静音环境、交给评审自己点 —— 都不用出声也能走完全流程。
 */

export default function TalkButton({
  onSay,
  disabled,
  speaking = false,
  hint = '按住说话',
  suggestions = [],
}: {
  /** text 有值＝点选或打字（学生明确表达）；无值＝走真语音识别 */
  onSay: (typed?: string) => Promise<void>
  /** 真不能动：正在离开这一屏。**不要用它来表示「同桌正在说」**，见下 */
  disabled?: boolean
  /**
   * 同桌正在说话。
   *
   * ── 为什么要有这个 prop ────────────────────────────────────
   * 最初只有 `disabled`，首页传的是 `phase !== 'waiting'` —— 意思是
   * 「同桌在说的时候你别插嘴」。后果是冷启动那 20 秒（开场白 + 便利贴）
   * **三条通道全死**：麦克风是灰的、点选面板不出现、打字框也没有。
   * 而上方文案还写着「说的、点的、写的，三条路都通」。
   *
   * 对话本来就不该是单向广播：真人同桌说话时你也可以打断。
   * 现在 `speaking` 只影响**提示词和配色**，不关门 ——
   * 打断的机制上层本来就实现了（作废在飞的段落 + 掐掉语音）。
   */
  speaking?: boolean
  hint?: string
  /** 「你可以这样说」的示范台词 —— 也是给不知道说什么的孩子的脚手架 */
  suggestions?: string[]
}) {
  const [holding, setHolding] = useState(false)
  const [pending, setPending] = useState(false)
  const [panel, setPanel] = useState(false)
  const [draft, setDraft] = useState('')
  const startedAt = useRef(0)

  /*
   * 关门条件只剩两个：
   *   · disabled          —— 正在离开这一屏，说什么都没意义了
   *   · pending && !speaking —— 学生刚说完、同桌还没开始接话的那一两帧，
   *     挡住重复提交（真开始接话之后 speaking 变 true，门就开了，可以打断）
   */
  const busy = disabled || (pending && !speaking)
  const talking = speaking && !busy

  const run = async (typed?: string) => {
    if (busy) return
    setPanel(false)
    setDraft('')
    setPending(true)
    try {
      await onSay(typed)
    } finally {
      setPending(false)
    }
  }

  const begin = () => {
    if (busy) return
    startedAt.current = performance.now()
    setHolding(true)
  }

  /** 松手：长按＝说完了，短按＝其实是想看看能说什么 */
  const end = () => {
    if (!holding) return
    setHolding(false)
    if (performance.now() - startedAt.current < 260) {
      setPanel(p => !p)
      return
    }
    void run(undefined)
  }

  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      <div className="relative">
        {/*
          ── 圆圈怎么表达状态（2026-09-13 重做，第一版做错了）──────────
          教训：上一版把「同桌正在说」画成**白底 + 浅蓝描边**，想跟
          「轮到你」区分开。结果秦肖一看就说「麦克风还是灰的、点不了」——
          功能上明明能按，配色却读起来像禁用。**为了「不一样」牺牲了「能用」，
          这是本末倒置。**

          现在的分工，别再混：
            · **颜色**只回答一个问题：「我现在能不能按」——
              灰＝不能（正在离开这屏），实心蓝＝能。
            · **动画和文字**回答另一个问题：「现在谁在说」——
              蓝圈呼吸＝轮到你了；橙圈呼吸＝同桌正在说，你可以插话。
          两件事各用各的通道，不互相挤占。
        */}
        {!busy && !holding && (
          <span
            className={`absolute inset-0 rounded-full animate-breathe pointer-events-none ${
              talking ? 'bg-cheer-500/45' : 'bg-brand-400/40'
            }`}
          />
        )}
        <button
          onPointerDown={e => {
            // 抓住指针：手指滑出按钮再松手也算数，不至于按到一半白说
            e.currentTarget.setPointerCapture(e.pointerId)
            begin()
          }}
          onPointerUp={end}
          onPointerCancel={() => setHolding(false)}
          disabled={busy}
          aria-label={hint}
          className={`relative w-[76px] h-[76px] rounded-full flex items-center justify-center transition-all duration-150 select-none touch-none ${
            holding
              ? 'bg-brand-600 scale-110 shadow-[0_0_0_10px_rgba(47,144,245,.18)]'
              : busy
                ? 'bg-ink-200 text-ink-400'
                : 'bg-brand-500 text-white shadow-[0_6px_20px_rgba(47,144,245,.4)] active:scale-95'
          }`}
        >
          {holding ? (
            <span className="flex items-center gap-[3px] h-7">
              {[0, 1, 2, 3, 4].map(i => (
                <span
                  key={i}
                  className="w-[3px] h-full bg-white rounded-full animate-wave"
                  style={{ animationDelay: `${i * 0.11}s` }}
                />
              ))}
            </span>
          ) : (
            <IconMic className="w-8 h-8" />
          )}
        </button>
      </div>

      <div className="text-[12.5px] text-ink-500 h-5">
        {holding
          ? '我在听…说完松手'
          : pending && !speaking
            ? '同桌在想…'
            : talking
              ? '同桌在说 —— 按住可以直接打断'
              : hint}
      </div>

      {/* 点一下麦克风，或点这里 —— 同一个面板 */}
      {!busy && (
        <button
          onClick={() => setPanel(p => !p)}
          className="text-[11.5px] text-ink-400 underline underline-offset-2"
        >
          {panel ? '收起' : '不方便出声？点一下选'}
        </button>
      )}

      {panel && !busy && (
        <div className="w-full animate-fadeUp pt-1">
          {suggestions.length > 0 && (
            <>
              <div className="text-[11px] text-ink-400 mb-1.5">点一句就行 ——</div>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => void run(s)}
                    className={`tap rounded-lg border border-dashed border-ink-200 bg-[#fffdf5] px-3 text-[13px] text-ink-700 hover:border-brand-300 hover:text-brand-700 transition ${
                      i % 2 ? 'rotate-[.7deg]' : '-rotate-[.9deg]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-2 mt-2.5">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && draft.trim()) void run(draft.trim())
              }}
              placeholder="也可以写在这儿"
              className="flex-1 min-w-0 rounded-xl border border-ink-200 px-3 py-2 text-[13.5px] outline-none focus:border-brand-400"
            />
            <button
              onClick={() => draft.trim() && void run(draft.trim())}
              disabled={!draft.trim()}
              className="tap shrink-0 rounded-xl bg-brand-500 text-white px-3 h-[38px] text-[13px] font-semibold disabled:bg-ink-200"
            >
              说给同桌
            </button>
          </div>

          <p className="text-[10.5px] text-ink-400 mt-2 leading-relaxed">
            说的、点的、写的，对同桌来说是一样的 —— 三条路都通。
          </p>
        </div>
      )}
    </div>
  )
}
