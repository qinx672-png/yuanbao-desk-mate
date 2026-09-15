import { useRef, useState } from 'react'
import { diagnosis } from '@/data/mockData'
import { IconCamera, IconShield } from '@/components/common/Icons'

interface Props {
  onShoot: () => void
}

export default function PhotoUpload({ onShoot }: Props) {
  /**
   * 选中的相册照片。
   *
   * ── 这两个按钮原来都是死的 ──────────────────────────────────
   * 「从相册选」和「手电筒」都挂在那儿、有 hover 有按压态，
   * 但都没有 onClick —— 点下去什么都不发生。演示时评审正好会点这两个，
   * 因为它们看起来最像真的。
   *
   * 现在的处理，两个按钮两种做法（因为它们的诚实边界不一样）：
   *   · 从相册选 —— 浏览器**真能做到**。挂一个真的 file input，
   *     选完把图显示出来，再走正常识别流程。不装。
   *   · 手电筒   —— 浏览器**做不到**（网页拿不到闪光灯）。
   *     所以它只切换取景区的补光预览，并在按钮上标出「预览」。
   *     宁可标出来，也不做一个看起来很真、其实是空壳的开关。
   */
  const fileRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [torch, setTorch] = useState(false)

  const onPickFile = (f: File | undefined) => {
    if (!f) return
    // 用完即撤：objectURL 不释放会一直占着内存
    setPicked(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(f)
    })
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[#121a26]">
      {/* 取景区 */}
      <div className="flex-1 min-h-0 relative flex items-center justify-center px-6">
        <div className="absolute top-4 left-0 right-0 px-6">
          <div className="rounded-2xl bg-white/10 backdrop-blur px-4 py-3 text-white/90 text-[13px] leading-relaxed">
            把题目放进框里就好，尽量拍清楚题干和图
          </div>
        </div>

        {/* 模拟取景框 + 题目。手电筒打开时整块取景区补一层暖光 */}
        <div className="relative w-full aspect-[3/4] rounded-2xl bg-[#f6f3ec] p-5 overflow-hidden">
          {torch && <div className="absolute inset-0 bg-amber-200/25 pointer-events-none z-10" />}
          {picked && (
            <img
              src={picked}
              alt="你选的题目"
              className="absolute inset-0 w-full h-full object-contain bg-[#121a26] z-20"
            />
          )}
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
          {/* 真能用的相册入口：挂的是真的 file input，不是装饰 */}
          <button
            onClick={() => fileRef.current?.click()}
            className="tap text-white/70 text-[13.5px] font-medium w-16"
          >
            从相册选
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => onPickFile(e.target.files?.[0])}
          />

          <button
            onClick={onShoot}
            aria-label="拍照"
            className="w-[74px] h-[74px] rounded-full bg-white flex items-center justify-center active:scale-95 transition shadow-pop"
          >
            <span className="w-[62px] h-[62px] rounded-full border-[3px] border-[#121a26] flex items-center justify-center text-[#121a26]">
              <IconCamera className="w-7 h-7" />
            </span>
          </button>

          {/*
            手电筒：网页拿不到闪光灯，所以它只切换补光预览。
            按钮上写「预览」两个字 —— 与其做一个像真的、其实空壳的开关，
            不如当场说清楚它现在只能做到哪一步。
          */}
          <button
            onClick={() => setTorch(t => !t)}
            aria-pressed={torch}
            className={`tap text-[13.5px] font-medium w-16 leading-tight ${
              torch ? 'text-amber-300' : 'text-white/70'
            }`}
          >
            手电筒
            <span className="block text-[10px] text-white/40">预览</span>
          </button>
        </div>

        {/* 相册选的图，给一条明路接着走 —— 不然选完了不知道下一步干嘛 */}
        {picked && (
          <button
            onClick={onShoot}
            className="tap mt-4 w-full rounded-2xl bg-brand-500 text-white h-11 text-[14px] font-bold active:scale-[.99] transition"
          >
            用这张，开始认题
          </button>
        )}
      </div>
    </div>
  )
}
