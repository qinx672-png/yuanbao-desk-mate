import { useState } from 'react'
import { planSuggestion, declineReasons, student } from '@/data/mockData'
import { IconSpark, IconCheck, IconClock } from '@/components/common/Icons'

interface Props {
  decided: '接受' | '暂不调整' | null
  onDecide: (d: '接受' | '暂不调整') => void
  onHome: () => void
}

export default function PlanSuggestionScreen({ decided, onDecide, onHome }: Props) {
  const [step, setStep] = useState<'choose' | 'reason' | 'done'>(decided ? 'done' : 'choose')
  const [reason, setReason] = useState<string | null>(null)
  const [choice, setChoice] = useState<'接受' | '暂不调整' | null>(decided)
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  const accept = () => {
    setChoice('接受')
    onDecide('接受')
    setStep('done')
  }
  const decline = () => {
    setChoice('暂不调整')
    setStep('reason')
  }
  const confirmDecline = () => {
    onDecide('暂不调整')
    setStep('done')
  }

  const finalItems = choice === '暂不调整' ? planSuggestion.fallbackItems : planSuggestion.items

  return (
    <div className="flex-1 min-h-0 scroll-area bg-ink-50 px-5 py-5 space-y-4">
      {/* AI 建议 */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-9 h-9 rounded-xl bg-parent-600 text-white flex items-center justify-center shrink-0">
            <IconSpark className="w-5 h-5" />
          </span>
          <div>
            <div className="text-[12px] text-ink-400">AI 生成的下周计划建议</div>
            <div className="text-[16.5px] font-bold text-ink-900">{planSuggestion.title}</div>
          </div>
        </div>

        <div className="rounded-2xl bg-ink-50 p-4 mb-4">
          <div className="text-[12.5px] font-bold text-ink-500 mb-1.5">为什么这样建议</div>
          <p className="text-[13px] text-ink-700 leading-relaxed">{planSuggestion.reason}</p>
        </div>

        <div className="text-[12.5px] font-bold text-ink-500 mb-2.5">具体安排</div>
        <ul className="space-y-2.5">
          {planSuggestion.items.map(i => (
            <li key={i} className="flex gap-2.5">
              <IconClock className="w-4 h-4 text-parent-500 shrink-0 mt-0.5" />
              <span className="text-[13.5px] text-ink-700 leading-relaxed">{i}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 家长选择 */}
      {step === 'choose' && (
        <div className="card p-5 animate-fadeUp">
          <div className="text-[15px] font-bold text-ink-900 mb-1">您觉得这个节奏合适吗？</div>
          <p className="text-[12.5px] text-ink-400 mb-4">选一个就好，不需要填写任何内容</p>
          <div className="space-y-3">
            <button
              onClick={accept}
              className="tap w-full rounded-2xl bg-parent-600 text-white py-3.5 text-[16px] font-semibold active:scale-[.98] transition"
            >
              接受这个安排
            </button>
            <button
              onClick={decline}
              className="tap w-full rounded-2xl border-2 border-ink-200 text-ink-700 py-3.5 text-[16px] font-semibold active:scale-[.98] transition"
            >
              暂不调整
            </button>
          </div>
        </div>
      )}

      {/* 暂不调整 → 记录原因 */}
      {step === 'reason' && (
        <div className="card p-5 animate-fadeUp">
          <div className="text-[15px] font-bold text-ink-900 mb-1">方便说说原因吗？</div>
          <p className="text-[12.5px] text-ink-400 mb-4">
            我会记下来，下次生成更贴合您期望的计划（可跳过）
          </p>
          <div className="space-y-2.5 mb-4">
            {declineReasons.map(r => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`w-full text-left rounded-2xl border-2 px-4 py-3 text-[14px] transition ${
                  reason === r
                    ? 'border-parent-500 bg-parent-50 text-parent-700 font-semibold'
                    : 'border-ink-100 text-ink-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={confirmDecline}
              className="tap flex-1 rounded-2xl border-2 border-ink-200 text-ink-500 py-3 text-[14.5px] font-semibold"
            >
              跳过
            </button>
            <button
              onClick={confirmDecline}
              className="tap flex-[2] rounded-2xl bg-parent-600 text-white py-3 text-[14.5px] font-semibold"
            >
              提交
            </button>
          </div>
        </div>
      )}

      {/* 结果 */}
      {step === 'done' && (
        <div className="animate-fadeUp space-y-4">
          <div
            className={`rounded-2xl p-5 border ${
              choice === '接受' ? 'bg-cheer-50 border-cheer-100' : 'bg-parent-50 border-parent-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-6 h-6 rounded-full text-white flex items-center justify-center shrink-0 ${
                  choice === '接受' ? 'bg-cheer-500' : 'bg-parent-500'
                }`}
              >
                <IconCheck className="w-3.5 h-3.5" />
              </span>
              <span className={`text-[15.5px] font-bold ${choice === '接受' ? 'text-cheer-700' : 'text-parent-700'}`}>
                已{choice}
              </span>
            </div>
            <p className={`text-[13.5px] leading-relaxed ${choice === '接受' ? 'text-cheer-700/90' : 'text-parent-700/90'}`}>
              {choice === '接受'
                ? `新计划从明天开始生效，${student.name}下次打开时会看到更新后的今日推荐。`
                : reason
                  ? `已记录您的顾虑「${reason}」。计划强度已自动放缓，后续建议也会参考这一点。`
                  : '计划强度已自动放缓，保持当前节奏。'}
            </p>
          </div>

          <div className="card p-5">
            <div className="text-[12.5px] font-bold text-ink-500 mb-2.5">下周实际执行的安排</div>
            <ul className="space-y-2.5">
              {finalItems.map(i => (
                <li key={i} className="flex gap-2.5">
                  <IconClock className="w-4 h-4 text-parent-500 shrink-0 mt-0.5" />
                  <span className="text-[13.5px] text-ink-700 leading-relaxed">{i}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 家长主动反馈入口（可选填，不强制） */}
          <div className="card p-5">
            <div className="text-[15px] font-bold text-ink-900 mb-1">还有什么想告诉我们的吗？</div>
            <p className="text-[12.5px] text-ink-400 mb-3">选填。您的每条留言我们都会看。</p>
            {sent ? (
              <div className="rounded-2xl bg-cheer-50 border border-cheer-100 px-4 py-3 text-[13.5px] text-cheer-700">
                留言已收到，我们会在 1 个工作日内回复您。
              </div>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  placeholder="例如：孩子最近对物理实验挺感兴趣，能多安排一些吗？"
                  className="w-full rounded-2xl border-2 border-ink-100 px-4 py-3 text-[14px] leading-relaxed resize-none focus:border-parent-500 outline-none mb-3"
                />
                <button
                  onClick={() => message.trim() && setSent(true)}
                  className="tap w-full rounded-2xl bg-ink-100 text-ink-700 py-3 text-[14.5px] font-semibold"
                >
                  发送给我们
                </button>
              </>
            )}
          </div>

          <button className="btn-ghost py-3.5 text-[16px] border-ink-200 text-ink-700" onClick={onHome}>
            返回报告首页
          </button>
        </div>
      )}
    </div>
  )
}
