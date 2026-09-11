import { useState } from 'react'
import { wrongProblems, weakPoints, progressCurve, classNote } from '@/data/mockData'
import { IconShield, IconCheck, IconArrowRight, IconClock } from '@/components/common/Icons'
import type { ScreenId } from '@/types'

type Tab = 'wrong' | 'weak' | 'curve'

export default function GrowthCenter({ onOpen }: { onOpen: (id: ScreenId) => void }) {
  const [tab, setTab] = useState<Tab>('wrong')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'wrong', label: '我的错题' },
    { key: 'weak', label: '薄弱知识点' },
    { key: 'curve', label: '进步曲线' },
  ]

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-ink-50">
      {/* 页签 */}
      <div className="shrink-0 bg-white px-4 pb-2.5 flex gap-1.5 border-b border-ink-100">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`tap flex-1 rounded-xl text-[14px] font-semibold transition ${
              tab === t.key ? 'bg-brand-500 text-white' : 'text-ink-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 scroll-area px-4 py-4 pb-6">
        {/* 课堂记录入口：手表端记的今天这节，课后和辅导对齐用 */}
        <button
          onClick={() => onOpen('stu-watch')}
          className="tap w-full card p-3.5 mb-4 flex items-center gap-3 text-left active:scale-[.99] transition"
        >
          <span className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <IconClock className="w-4.5 h-4.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-bold text-ink-900 truncate">
              今天 {classNote.period} · {classNote.subject} · {classNote.topic}
            </span>
            <span className="block text-[11.5px] text-ink-400 mt-0.5">
              课堂记录 · 手表端整理，课后辅导按它对齐进度
            </span>
          </span>
          <IconArrowRight className="w-4 h-4 text-ink-300 shrink-0" />
        </button>

        {tab === 'wrong' && <WrongList />}
        {tab === 'weak' && <WeakList />}
        {tab === 'curve' && <Curve />}

        <div className="mt-5 rounded-2xl bg-cheer-50 border border-cheer-100 p-4 flex gap-2.5">
          <IconShield className="w-4 h-4 text-cheer-600 shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-cheer-700 leading-relaxed">
            这里只有你自己的学习数据。我们不会拿你和其他同学比较，也不会把你的数据给任何人看。
          </p>
        </div>
      </div>
    </div>
  )
}

function WrongList() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between px-1 mb-1">
        <span className="text-[13px] text-ink-500">近 30 天，共 {wrongProblems.length} 道</span>
        <span className="text-[13px] text-cheer-600 font-semibold">
          已弄懂 {wrongProblems.filter(w => w.mastered).length} 道
        </span>
      </div>
      {wrongProblems.map(w => (
        <div key={w.id} className="card p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`chip text-[11px] ${
                w.subject === '物理' ? 'bg-brand-50 text-brand-700' : 'bg-cheer-50 text-cheer-700'
              }`}
            >
              {w.subject}
            </span>
            <span className="text-[12px] text-ink-400 tabular-nums">{w.date}</span>
            {w.mastered && (
              <span className="chip bg-cheer-50 text-cheer-700 text-[11px] ml-auto">
                <IconCheck className="w-3 h-3" />
                已弄懂
              </span>
            )}
            {!w.mastered && <span className="chip bg-warm-50 text-warm-700 text-[11px] ml-auto">待巩固</span>}
          </div>
          <div className="text-[14.5px] font-semibold text-ink-900 leading-snug mb-2">{w.title}</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12.5px]">
            <span className="text-ink-500">
              知识点：<span className="text-ink-700 font-medium">{w.knowledgePoint}</span>
            </span>
          </div>
          <div className="mt-2 rounded-xl bg-ink-50 px-3 py-2 text-[12.5px] text-ink-700 leading-relaxed">
            错误原因：{w.reason}
          </div>
        </div>
      ))}
    </div>
  )
}

function WeakList() {
  return (
    <div className="space-y-3">
      {weakPoints.map(w => (
        <div key={w.id} className="card p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`chip text-[11px] ${
                w.subject === '物理' ? 'bg-brand-50 text-brand-700' : 'bg-cheer-50 text-cheer-700'
              }`}
            >
              {w.subject}
            </span>
            <span className="text-[15.5px] font-bold text-ink-900">{w.name}</span>
          </div>
          <div className="text-[12px] text-ink-400 mb-3">📚 {w.chapter}</div>

          <div className="flex items-center gap-3 mb-2.5">
            <span className="text-[12.5px] text-ink-400 tabular-nums w-9">{w.from}%</span>
            <div className="flex-1 h-2.5 rounded-full bg-ink-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-warm-500 to-cheer-500 transition-all duration-1000"
                style={{ width: `${w.to}%` }}
              />
            </div>
            <span className="text-[13.5px] font-bold text-cheer-600 tabular-nums w-9 text-right">{w.to}%</span>
          </div>

          <div className="text-[12.5px] text-ink-500">近 30 天在这里出错 {w.errorCount} 次</div>

          {w.traceBack && (
            <div className="mt-3 rounded-xl bg-brand-50 border border-brand-100 px-3 py-2.5">
              <div className="text-[12.5px] font-bold text-brand-700 mb-0.5">建议先补基础</div>
              <p className="text-[12.5px] text-brand-700/90 leading-relaxed">
                这个知识点反复出错，可能是 {w.traceBack} 没打牢。我们先回去补一下，再往上学会轻松很多。
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function Curve() {
  const w = 310
  const h = 170
  const pad = { l: 30, r: 12, t: 16, b: 26 }
  const max = 45
  const pts = progressCurve.map((p, i) => {
    const x = pad.l + (i * (w - pad.l - pad.r)) / (progressCurve.length - 1)
    const y = pad.t + (h - pad.t - pad.b) * (1 - p.mastered / max)
    return { ...p, x, y }
  })
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x},${h - pad.b} L${pts[0].x},${h - pad.b} Z`
  const first = progressCurve[0].mastered
  const last = progressCurve[progressCurve.length - 1].mastered

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="text-[15.5px] font-bold text-ink-900">30 天掌握的知识点</h3>
          <span className="text-[13px] text-cheer-600 font-bold">+{last - first} 个</span>
        </div>
        <p className="text-[12.5px] text-ink-400 mb-2">和一个月前的自己比，你进步了</p>

        <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#59b0ff" stopOpacity=".28" />
              <stop offset="100%" stopColor="#59b0ff" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 15, 30, 45].map(v => {
            const y = pad.t + (h - pad.t - pad.b) * (1 - v / max)
            return (
              <g key={v}>
                <line x1={pad.l} y1={y} x2={w - pad.r} y2={y} stroke="#eef1f5" strokeWidth="1" />
                <text x={pad.l - 6} y={y + 3.5} fontSize="9" fill="#8a94a2" textAnchor="end">
                  {v}
                </text>
              </g>
            )
          })}
          <path d={area} fill="url(#g)" />
          <path d={line} fill="none" stroke="#2f90f5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === pts.length - 1 ? 4.5 : 3}
              fill={i === pts.length - 1 ? '#28a86a' : '#fff'}
              stroke={i === pts.length - 1 ? '#fff' : '#2f90f5'}
              strokeWidth="2"
            />
          ))}
          {pts.map((p, i) =>
            i % 2 === 0 || i === pts.length - 1 ? (
              <text key={`t${i}`} x={p.x} y={h - 8} fontSize="9" fill="#8a94a2" textAnchor="middle">
                {p.day}
              </text>
            ) : null,
          )}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {[
          ['主动学习', '3 次/周'],
          ['同类题再错率', '18%'],
          ['说「我会了」', '9 次'],
        ].map(([k, v]) => (
          <div key={k} className="card p-3 text-center">
            <div className="text-[17px] font-bold text-brand-600 tabular-nums">{v}</div>
            <div className="text-[11.5px] text-ink-400 mt-0.5">{k}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
