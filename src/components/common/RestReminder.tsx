import { IconEye } from './Icons'

interface Props {
  minutes: number
  onContinue: () => void
  onRest: () => void
}

/**
 * 防沉迷 / 护眼提醒
 * 面向中小学生的安全使用规范：连续学习 40 分钟给出温和提醒，
 * 措辞为邀请而非训斥，且不强制中断（学习自主权仍在学生手上）。
 */
export default function RestReminder({ minutes, onContinue, onRest }: Props) {
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center bg-ink-900/35 backdrop-blur-[2px]">
      <div className="w-full bg-white rounded-t-[28px] p-6 pb-8 animate-fadeUp">
        <div className="w-14 h-14 rounded-2xl bg-cheer-50 text-cheer-600 flex items-center justify-center mb-4">
          <IconEye className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold mb-2">已经专注 {minutes} 分钟啦</h3>
        <p className="text-ink-700 mb-1">起来走动 5 分钟，看看远处，眼睛会舒服很多。</p>
        <p className="text-ink-500 text-sm mb-6">你的学习进度已经保存好了，回来接着学就行。</p>
        <div className="space-y-3">
          <button className="btn-primary h-12 bg-cheer-500 shadow-[0_4px_14px_rgba(40,168,106,.3)]" onClick={onRest}>
            好，我去休息一下
          </button>
          <button className="btn-ghost h-12 border-ink-200 text-ink-700" onClick={onContinue}>
            再学 10 分钟
          </button>
        </div>
      </div>
    </div>
  )
}
