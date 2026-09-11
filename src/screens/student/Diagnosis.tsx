import { useEffect, useState } from 'react'
import { diagnosis } from '@/data/mockData'
import { IconCheck, IconBook } from '@/components/common/Icons'

interface Props {
  onStart: () => void
}

const steps = [
  { key: 'ocr', label: 'OCR 识别题目文字' },
  { key: 'tag', label: '标注学科 / 年级 / 知识点 / 题型' },
  { key: 'book', label: '匹配你的教材版本与章节' },
  { key: 'weak', label: '调取近 30 天记录，判断是否薄弱点' },
]

export default function Diagnosis({ onStart }: Props) {
  const [done, setDone] = useState(0)

  useEffect(() => {
    if (done >= steps.length) return
    const t = setTimeout(() => setDone(d => d + 1), done === 0 ? 500 : 700)
    return () => clearTimeout(t)
  }, [done])

  const finished = done >= steps.length

  return (
    <div className="flex-1 min-h-0 scroll-area bg-ink-50 px-5 py-5">
      {/* 识别进度 */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16.5px] font-bold">
            {finished ? '识别完成' : '正在看你的题目…'}
          </h2>
          <span className="text-[12px] text-ink-400">通常 5-10 秒</span>
        </div>
        <div className="space-y-3">
          {steps.map((s, i) => {
            const ok = i < done
            const doing = i === done
            return (
              <div key={s.key} className="flex items-center gap-3">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition ${
                    ok ? 'bg-cheer-500 text-white' : doing ? 'bg-brand-100 text-brand-600' : 'bg-ink-100 text-ink-400'
                  }`}
                >
                  {ok ? (
                    <IconCheck className="w-3.5 h-3.5" />
                  ) : (
                    <span className={`w-2 h-2 rounded-full bg-current ${doing ? 'animate-typing' : ''}`} />
                  )}
                </span>
                <span className={`text-[14px] ${ok ? 'text-ink-900 font-medium' : 'text-ink-400'}`}>{s.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {finished && (
        <div className="animate-fadeUp space-y-4">
          {/* 题目结构化信息 */}
          <div className="card p-5">
            <div className="text-[12px] font-bold text-ink-400 mb-3 tracking-wide">题目信息</div>
            <div className="grid grid-cols-2 gap-y-3.5 gap-x-3">
              {[
                ['学科', diagnosis.subject],
                ['年级', diagnosis.grade],
                ['题型', diagnosis.problemType],
                ['知识点', diagnosis.knowledgePoint],
              ].map(([k, v]) => (
                <div key={k}>
                  <div className="text-[12px] text-ink-400 mb-0.5">{k}</div>
                  <div className="text-[14.5px] font-semibold text-ink-900">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-ink-100 flex items-start gap-2">
              <IconBook className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-[12px] text-ink-400 mb-0.5">教材出处</div>
                <div className="text-[13.5px] font-medium text-ink-900 leading-snug">
                  {diagnosis.textbookChapter}
                </div>
              </div>
            </div>
          </div>

          {/* 薄弱点标签：暖橙中性表述，不使用红色警告 */}
          {diagnosis.isWeakPoint && (
            <div className="rounded-2xl bg-warm-50 border border-warm-100 p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="chip bg-warm-500 text-white text-[11px]">重点关注</span>
                <span className="text-[14.5px] font-bold text-warm-700">{diagnosis.knowledgePoint}</span>
              </div>
              <p className="text-[13px] text-warm-700/90 leading-relaxed">{diagnosis.weakPointNote}</p>
              <p className="text-[13px] text-warm-700/90 leading-relaxed mt-1">
                这次我们把它彻底弄明白，以后遇到就不慌了。
              </p>
            </div>
          )}

          {/* 题干回显 */}
          <div className="card p-5">
            <div className="text-[12px] font-bold text-ink-400 mb-2.5 tracking-wide">识别到的题目</div>
            <p className="text-[14px] text-ink-700 leading-[1.9] whitespace-pre-line">{diagnosis.ocrText}</p>
          </div>

          <button className="btn-primary py-3.5 text-[16px]" onClick={onStart}>
            好，我们一起分析
          </button>
          <p className="text-center text-[11.5px] text-ink-400">
            同学不会直接告诉你答案，我们一步一步来
          </p>
        </div>
      )}
    </div>
  )
}
