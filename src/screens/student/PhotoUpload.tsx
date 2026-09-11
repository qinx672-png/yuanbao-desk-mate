import { diagnosis } from '@/data/mockData'
import { IconCamera, IconShield } from '@/components/common/Icons'

interface Props {
  onShoot: () => void
}

export default function PhotoUpload({ onShoot }: Props) {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#121a26]">
      {/* 取景区 */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center px-6">
        <div className="absolute top-4 left-0 right-0 px-6">
          <div className="rounded-2xl bg-white/10 backdrop-blur px-4 py-3 text-white/90 text-[13px] leading-relaxed">
            把题目放进框里就好，尽量拍清楚题干和图
          </div>
        </div>

        {/* 模拟取景框 + 题目 */}
        <div className="relative w-full aspect-[3/4] rounded-2xl bg-[#f6f3ec] p-5 overflow-hidden">
          <div className="text-[13.5px] text-ink-900 leading-[1.9] whitespace-pre-line font-serif">
            {diagnosis.ocrText}
          </div>
          <div className="mt-4 border border-ink-300/60 rounded-lg h-[120px] flex items-center justify-center">
            <svg className="w-[190px] h-[86px]" viewBox="0 0 190 86" fill="none" stroke="#3d4756" strokeWidth="1.6">
              <path d="M18 20h154v46H18z" />
              <circle cx="66" cy="20" r="9" fill="#f6f3ec" />
              <path d="M60 14l12 12M72 14L60 26" />
              <circle cx="128" cy="20" r="9" fill="#f6f3ec" />
              <path d="M122 14l12 12M134 14l-12 12" />
              <path d="M88 66v8M102 66v8" />
              <path d="M84 74h8M98 70h8" />
              <text x="60" y="42" fontSize="11" stroke="none" fill="#3d4756">L₁</text>
              <text x="122" y="42" fontSize="11" stroke="none" fill="#3d4756">L₂</text>
            </svg>
          </div>
          {/* 四角取景标记 */}
          <span className="absolute left-2 top-2 w-7 h-7 border-l-[3px] border-t-[3px] border-brand-400 rounded-tl-lg" />
          <span className="absolute right-2 top-2 w-7 h-7 border-r-[3px] border-t-[3px] border-brand-400 rounded-tr-lg" />
          <span className="absolute left-2 bottom-2 w-7 h-7 border-l-[3px] border-b-[3px] border-brand-400 rounded-bl-lg" />
          <span className="absolute right-2 bottom-2 w-7 h-7 border-r-[3px] border-b-[3px] border-brand-400 rounded-br-lg" />
        </div>
      </div>

      {/* 隐私声明 + 快门 */}
      <div className="shrink-0 px-6 pt-4 pb-6 bg-[#121a26]">
        <div className="flex items-start gap-2 text-white/70 text-[12px] leading-relaxed mb-5">
          <IconShield className="w-4 h-4 shrink-0 mt-0.5 text-cheer-500" />
          <span>
            照片只用来识别题目，不会公开、不会用于其他用途；我们不采集人脸、位置和通讯录。
          </span>
        </div>
        <div className="flex items-center justify-center gap-10">
          <button className="tap text-white/70 text-[13.5px] font-medium w-16">从相册选</button>
          <button
            onClick={onShoot}
            aria-label="拍照"
            className="w-[74px] h-[74px] rounded-full bg-white flex items-center justify-center active:scale-95 transition shadow-pop"
          >
            <span className="w-[62px] h-[62px] rounded-full border-[3px] border-[#121a26] flex items-center justify-center text-[#121a26]">
              <IconCamera className="w-7 h-7" />
            </span>
          </button>
          <button className="tap text-white/70 text-[13.5px] font-medium w-16">手电筒</button>
        </div>
      </div>
    </div>
  )
}
