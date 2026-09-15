/**
 * 电压表实验台
 * ============================================================
 *
 * ── 它解决什么问题 ────────────────────────────────────────
 *
 * 这条链路原来全是「AI 说 → 学生答」，讲机制只能靠文字。
 * 而「电源电压为什么全落在断点上」是**电路拓扑 + 电压分配**，
 * 纯文字讲是逆着认知的 —— 学生只能把结论背下来，那不是懂，是记住了。
 *
 * 所以这里让学生自己把表挪过去，看见读数怎么变。
 * 结论由他自己读出来，不由 AI 告诉他。
 *
 * ── 最关键的一条设计约束：不许变成试错 ────────────────────
 *
 * 如果电压表一开始就能随便拖，学生的动作会变成
 * 「拖过去 → 看答案 → 拖回来 → 看答案」——
 * 这是**试错**，不是推理。他会绕过「预测」这一步，
 * 而这个实验唯一有价值的认知动作恰恰就是预测。
 *
 * （这一点产品自己写在 mockData 里：把「从现象推理出结论」替学生做完，
 *   学生的任务就从「生成」降级成「识别」。）
 *
 * 所以节奏被锁死成两轮，每一轮都必须先猜：
 *   ① 猜 L₂ 读数（三个选项）→ 才允许拖
 *   ② 拖过去，看到读数
 *   ③ 猜 L₁ 读数 → 才允许拖
 *   ④ 拖过去，看到 0
 *
 * 猜错不惩罚、不锁死，只是把「你猜的」和「实际读数」并排放着 ——
 * 认知冲突本身就是教学材料，不需要 AI 去点评。
 *
 * ── 尺寸：这里踩过一次坑，别再改回去 ──────────────────────
 *
 * 第一版画布是 344×252。落进 390px 宽的手机框里约 250px 高，
 * 再加上读数和分压条，整个实验台接近 500px。
 * 而它当时渲染在 TutorFlow 的「交互区」——那块是 shrink-0 的，
 * 笔记本又是 flex-1 min-h-0，于是实验台把笔记本压到 0 之后
 * **自己溢出了手机框，被 PhoneFrame 的 overflow-hidden 裁掉**。
 * 表现是：电路图看得见，三个「猜读数」的按钮在可视区外面，
 * 学生拖又拖不动（没猜就不让拖）—— 整个实验台像坏了一样。
 *
 * 所以有两条硬约束：
 *   ① 画布尽量扁（现在 344×206，比例 1.67）
 *   ② 它渲染在**可滚动的笔记本区**里，不在交互区（见 TutorFlow）
 *
 * ── 物理口径（全原型统一，别在别处写反）─────────────────
 *
 *   电路：电源 U、L₁、L₂ 串联，L₂ 的灯丝断了 → 回路不通，I = 0
 *   理想电压表内阻极大，**不取电流、不改变电路状态**，只负责读数
 *   所以无论表接在哪，回路电流始终是 0：
 *     接 L₂ 两端 → 读 U（电源电压全部落在断点上）
 *     接 L₁ 两端 → 读 0（完好的那一段两端没有电压差）
 */

import { useRef, useState } from 'react'

/* ── 画布几何：全部写成常量，改尺寸只改这里 ─────────────────── */
const VB = { w: 344, h: 206 }
/** 电路外框（一圈导线） */
const LOOP = { l: 76, r: 268, t: 30, b: 136 }
/** 两只灯在竖直边上的中心高度 */
const MID_Y = 83
/** 元件两端接线柱的高度 —— 电压表就接在这四个点上 */
const TERM = { up: 58, down: 108 }
/** 电压表吸住后的圆心位置。放在环路外侧，和灯的标签错开 */
const DOCK = { L1: { x: 28, y: MID_Y }, L2: { x: 316, y: MID_Y } }
/** 还没接线时电压表停在哪儿 */
const TRAY = { x: 172, y: 178 }
const R_VM = 16
const R_LAMP = 12
/** 圆心离目标多近就算接上 */
const SNAP = 64

type Side = 'L1' | 'L2'
type Phase = 'guess' | 'drag' | 'result'

/** 两段各自的读数 —— 全篇唯一的答案来源，别在 JSX 里再写一遍 */
const READING: Record<Side, string> = { L1: '0 V', L2: '电源电压 U' }
/** 正确的预测项（选项文案要和它逐字一致） */
const CORRECT: Record<Side, string> = { L1: '0 V', L2: '电源电压 U' }
const GUESSES = ['0 V', '一半', '电源电压 U']

/** 表笔从圆心往接线柱方向、落在圆周上的偏移量（由 R_VM 和夹角算出，别手改） */
const LEAD_DX = 14.2
const LEAD_DY = 7.4

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export default function VoltmeterLab({ onDone }: { onDone: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null)
  /** 第 1 轮量 L₂（断点），第 2 轮量 L₁（好的那只）—— 顺序不能反 */
  const [round, setRound] = useState<1 | 2>(1)
  const [phase, setPhase] = useState<Phase>('guess')
  const [guess, setGuess] = useState<string | null>(null)
  const [probe, setProbe] = useState<Side | null>(null)
  const [pos, setPos] = useState(TRAY)
  const [dragging, setDragging] = useState(false)
  /** 拖到了不该拖的地方 —— 给一句提示，不判错 */
  const [missed, setMissed] = useState(false)

  /*
   * 拖拽过程中的实时值另存一份 ref。
   *
   * 为什么不能只靠上面那两个 state：React 的 setState 是异步的，
   * 事件处理函数闭包里读到的是**这一次渲染时**的值。
   * 手指快的时候 pointerdown 和 pointermove 会落在同一帧里，
   * 那时 onMove 看到的 dragging 还是 false，直接 return ——
   * 表现就是「偶尔拖不动、松手弹回原位」。pos 同理，
   * onUp 里必须拿到手指离开那一刻的真实坐标，不能是上一帧的。
   */
  const draggingRef = useRef(false)
  const posRef = useRef(TRAY)

  const target: Side = round === 1 ? 'L2' : 'L1'
  /** 两轮都量完了：这时候才把「断在 L₂」在图上点破 */
  const revealed = round === 2 && phase === 'result'

  /* 把鼠标位置换算成 SVG 坐标。
     依赖 svg 的 width:100% + height:auto —— 它按 viewBox 比例撑开，
     不会有留白，所以「屏幕比例 → 画布比例」是线性的。 */
  function svgPoint(e: React.PointerEvent) {
    const r = svgRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * VB.w,
      y: ((e.clientY - r.top) / r.height) * VB.h,
    }
  }

  function onDown(e: React.PointerEvent) {
    if (phase !== 'drag') return
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingRef.current = true
    setDragging(true)
    setMissed(false)
  }

  function onMove(e: React.PointerEvent) {
    if (!draggingRef.current) return
    const p = svgPoint(e)
    const next = {
      x: clamp(p.x, R_VM + 2, VB.w - R_VM - 2),
      y: clamp(p.y, R_VM + 2, VB.h - R_VM - 2),
    }
    posRef.current = next
    setPos(next)
  }

  function onUp() {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    const t = DOCK[target]
    if (Math.hypot(posRef.current.x - t.x, posRef.current.y - t.y) <= SNAP) {
      posRef.current = t
      setPos(t)
      setProbe(target)
      setPhase('result')
    } else {
      /* 拖歪了就弹回托盘，并说清这一轮该量哪儿 —— 不判错，只是重来 */
      posRef.current = TRAY
      setPos(TRAY)
      setMissed(true)
    }
  }

  function nextRound() {
    setRound(2)
    setPhase('guess')
    setGuess(null)
    setProbe(null)
    posRef.current = TRAY
    setPos(TRAY)
    setMissed(false)
  }

  /* ── 引导条：每一轮、每个阶段说什么，都从这里出，JSX 里不散落文案 ── */
  const hint = (() => {
    if (phase === 'guess') {
      return round === 1
        ? '先别接。你猜：接到 L₂ 两端，读数是多少？'
        : '再猜一次：这回挪到 L₁ 两端，读数是多少？'
    }
    if (phase === 'drag') {
      return missed
        ? `这次要量的是 ${target === 'L2' ? 'L₂' : 'L₁'}。把电压表拖过去 —— 它不取电流，接上也不会改变电路。`
        : `把它拖到 ${target === 'L2' ? 'L₂' : 'L₁'} 两端`
    }
    return null
  })()

  const guessedRight = guess === CORRECT[target]

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-3">
      {/* ── 电路图 ─────────────────────────────────────── */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB.w} ${VB.h}`}
        className="w-full h-auto select-none touch-none"
        role="img"
        aria-label="串联电路：电源、L₁、L₂，其中一只灯丝断了；电压表可拖到任一只灯两端"
      >
        {/* 导线：四条边，上边留出电池的位置 */}
        <g stroke="#8a94a2" strokeWidth={2} fill="none" strokeLinecap="round">
          <path d={`M${LOOP.l} ${LOOP.t} H160`} />
          <path d={`M188 ${LOOP.t} H${LOOP.r}`} />
          <path d={`M${LOOP.r} ${LOOP.t} V${LOOP.b}`} />
          <path d={`M${LOOP.r} ${LOOP.b} H${LOOP.l}`} />
          <path d={`M${LOOP.l} ${LOOP.b} V${LOOP.t}`} />
        </g>

        {/* 电源：一长一短两横 = 电池符号 */}
        <g stroke="#3d4756" strokeWidth={2.4} strokeLinecap="round">
          <line x1={168} y1={20} x2={168} y2={40} />
          <line x1={180} y1={25} x2={180} y2={35} />
        </g>
        <text x={174} y={13} textAnchor="middle" fontSize={11} fill="#66717f">
          电源 U
        </text>

        {/* 两只灯：**画得一模一样**。
            图上绝不能暗示哪只断了 —— 断在哪只正是这个实验要让学生自己量出来的。
            一旦画出来，整个「找断点」的前提就塌了，变成看图说话。 */}
        {([['L1', LOOP.l, -20], ['L2', LOOP.r, 20]] as const).map(([name, x, labelDx]) => (
          <g key={name}>
            <circle cx={x} cy={MID_Y} r={R_LAMP} fill="#fff" stroke="#3d4756" strokeWidth={2} />
            <g stroke="#3d4756" strokeWidth={1.7} strokeLinecap="round">
              <line
                x1={x - R_LAMP * 0.7}
                y1={MID_Y - R_LAMP * 0.7}
                x2={x + R_LAMP * 0.7}
                y2={MID_Y + R_LAMP * 0.7}
              />
              <line
                x1={x + R_LAMP * 0.7}
                y1={MID_Y - R_LAMP * 0.7}
                x2={x - R_LAMP * 0.7}
                y2={MID_Y + R_LAMP * 0.7}
              />
            </g>
            {/* 标签放在环路外侧、电压表停靠位之内，两边都不打架 */}
            <text
              x={x + labelDx}
              y={MID_Y + 4}
              textAnchor="middle"
              fontSize={12.5}
              fontWeight={600}
              fill="#3d4756"
            >
              {name === 'L1' ? 'L₁' : 'L₂'}
            </text>
          </g>
        ))}

        {/* 四个接线柱 */}
        {[
          [LOOP.l, TERM.up],
          [LOOP.l, TERM.down],
          [LOOP.r, TERM.up],
          [LOOP.r, TERM.down],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill="#8a94a2" />
        ))}

        {/* 两轮都量完 —— 这时候才有资格把断点点破 */}
        {revealed && (
          <g>
            <line
              x1={LOOP.r}
              y1={MID_Y - 4}
              x2={LOOP.r}
              y2={MID_Y + 4}
              stroke="#d4711a"
              strokeWidth={6.5}
              strokeLinecap="round"
            />
            <text x={246} y={MID_Y + 4} textAnchor="end" fontSize={12} fontWeight={700} fill="#d4711a">
              断在这 →
            </text>
          </g>
        )}

        {/* 电压表：接上以后从圆心拉两根表笔到接线柱 */}
        {probe && (
          <g stroke="#1a72da" strokeWidth={2} strokeLinecap="round">
            <line
              x1={pos.x + (probe === 'L1' ? LEAD_DX : -LEAD_DX)}
              y1={pos.y - LEAD_DY}
              x2={probe === 'L1' ? LOOP.l : LOOP.r}
              y2={TERM.up}
            />
            <line
              x1={pos.x + (probe === 'L1' ? LEAD_DX : -LEAD_DX)}
              y1={pos.y + LEAD_DY}
              x2={probe === 'L1' ? LOOP.l : LOOP.r}
              y2={TERM.down}
            />
          </g>
        )}

        <g
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{ cursor: phase === 'drag' ? (dragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {/* 命中区域比看得见的圆大一圈，触摸屏上好抓 */}
          <circle cx={pos.x} cy={pos.y} r={R_VM + 10} fill="transparent" />
          {/* 轮到你动手时，套一圈虚线 —— 这是「可以拖」的唯一视觉信号，
              没有它学生根本不知道那个 V 是能抓的 */}
          {phase === 'drag' && (
            <circle
              cx={pos.x}
              cy={pos.y}
              r={R_VM + 7}
              fill="none"
              stroke="#1a72da"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              opacity={0.55}
            />
          )}
          <circle
            cx={pos.x}
            cy={pos.y}
            r={R_VM}
            fill={probe ? '#eef7ff' : '#fff'}
            stroke={phase === 'drag' ? '#1a72da' : '#8a94a2'}
            strokeWidth={phase === 'drag' ? 2.6 : 2}
          />
          <text
            x={pos.x}
            y={pos.y + 5.5}
            textAnchor="middle"
            fontSize={16}
            fontWeight={700}
            fill={phase === 'drag' ? '#1a72da' : '#66717f'}
          >
            V
          </text>
        </g>
      </svg>

      {/* ── 仪表盘：读数 + 分压条 ─────────────────────────
          这里**不用 sm: 断点** —— 手机框只有 390px 宽，sm 是 640px，
          在框里永远不会生效，两块会一直上下堆着白占 60px。 */}
      <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-2">
        {/* 读数 */}
        <div className="rounded-xl bg-ink-900 px-3 py-2 text-white">
          <div className="text-[10.5px] opacity-65">
            {probe ? `量的是 ${probe === 'L1' ? 'L₁' : 'L₂'}` : '电压表读数'}
          </div>
          <div className="text-[18px] font-bold leading-tight tabular-nums">
            {probe ? READING[probe] : '— —'}
          </div>
        </div>

        {/* 分压条：**固定不动**。
            它画的是「电源电压本来就怎么分的」，跟表接不接、接哪儿没关系 ——
            这正是一个理想电压表的性质：它不改变电路。
            学生看到的是「表在动、分压不变」，这本身就是一条要教给他的事实。 */}
        <div>
          <div className="mb-1 text-[10.5px] text-ink-400">电源电压 U 是怎么分的</div>
          <div className="flex h-7 overflow-hidden rounded-lg border border-ink-200">
            <div className="flex w-[38px] shrink-0 items-center justify-center bg-ink-100 text-[10.5px] text-ink-500">
              0 V
            </div>
            <div
              className={`flex flex-1 items-center justify-center text-[10.5px] font-semibold transition-colors ${
                probe === 'L2' ? 'bg-warm-100 text-warm-700' : 'bg-warm-50 text-warm-600'
              }`}
            >
              {probe === 'L2' ? '← 表在读这里' : 'U（全在断点上）'}
            </div>
          </div>
          <div className="mt-0.5 flex text-[10.5px] text-ink-400">
            <span className="w-[38px] shrink-0 text-center">L₁</span>
            <span className="flex-1 text-center">L₂</span>
          </div>
        </div>
      </div>

      <div className="mt-1.5 text-[11px] text-ink-400">
        回路电流始终是 0 —— 灯丝断了，接上电压表也不会让回路通，它只负责读数。
      </div>

      {/* ── 操作区：猜 / 拖 / 看结果，三态互斥 ─────────────── */}
      <div className="mt-2.5 border-t border-ink-100 pt-2.5">
        {phase === 'guess' && (
          <>
            <div className="mb-2 text-[13px] font-semibold text-ink-900">{hint}</div>
            <div className="flex flex-wrap gap-2">
              {GUESSES.map(g => (
                <button
                  key={g}
                  onClick={() => {
                    setGuess(g)
                    setPhase('drag')
                  }}
                  className="rounded-lg border border-ink-200 bg-white px-3.5 py-1.5 text-[13px] text-ink-700 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
                >
                  {g}
                </button>
              ))}
            </div>
          </>
        )}

        {phase === 'drag' && (
          <div className={`text-[13px] ${missed ? 'text-warm-700' : 'text-ink-500'}`}>
            {hint}
            <span className="ml-1 text-ink-400">（你猜的是「{guess}」，先记着）</span>
          </div>
        )}

        {phase === 'result' && (
          <div className="animate-fadeUp">
            <div className="text-[13px] leading-relaxed text-ink-700">
              <span className="font-semibold text-ink-900">读数是 {READING[target]}。</span>{' '}
              {guessedRight ? (
                <span className="text-cheer-700">猜对了。</span>
              ) : (
                <span className="text-warm-700">你猜的是「{guess}」—— 对不上，先记住这个数。</span>
              )}
            </div>

            {round === 1 ? (
              <div className="mt-1.5 text-[12.5px] text-ink-500">
                看下面那条分压条：电源电压全在 L₂ 上，L₁ 一点都没分到。
                这不是电压表造成的 —— 它接不接，电路都长这样。
              </div>
            ) : (
              <div className="mt-1.5 text-[12.5px] leading-relaxed text-ink-700">
                两段都量完了。看出来了吗 ——
                <span className="font-semibold text-ink-900">电源电压全部落在断开的那一段上</span>
                ，完好的那一段一点都分不到。
                所以读数等于电源电压的那段，就是断的那段。
                这不是口诀，是电源电压本来就全在断点上，你只是把它读出来了。
              </div>
            )}

            <button
              onClick={round === 1 ? nextRound : onDone}
              className="mt-2.5 rounded-lg bg-brand-600 px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-700"
            >
              {round === 1 ? '再量另一只 →' : '我明白了'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
