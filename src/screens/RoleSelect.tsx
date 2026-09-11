import { IconStudent, IconParent, IconShield } from '@/components/common/Icons'

interface Props {
  onPick: (role: 'student' | 'parent') => void
}

export default function RoleSelect({ onPick }: Props) {
  return (
    <div className="flex-1 min-h-0 flex flex-col bg-gradient-to-b from-brand-50 via-white to-white px-6 pt-6 pb-6 scroll-area">
      <div className="mb-7">
        <div className="inline-flex items-center gap-1.5 chip bg-brand-100 text-brand-700 mb-4">
          初中数学 · 物理
        </div>
        <h1 className="text-[26px] font-bold leading-[1.35] text-ink-900">
          每个孩子都能拥有的
          <br />
          <span className="text-brand-600">专属初中数理成长导师</span>
        </h1>
        <p className="text-sm text-ink-500 mt-3 leading-relaxed">
          启发式引导 + 知识强化，帮孩子掌握理科思维、夯实学科基础，也让家长看见成长轨迹。
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => onPick('student')}
          className="w-full text-left rounded-3xl bg-white p-5 shadow-card border-2 border-brand-100 active:scale-[.99] transition"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center shrink-0">
              <IconStudent className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-lg font-bold text-ink-900">我是学生</div>
              <div className="text-sm text-brand-700 font-semibold mt-0.5">元宝同桌</div>
              <p className="text-[13px] text-ink-500 leading-relaxed mt-2">
                不是说教的老师，像同桌一样陪你讨论、启发你自己想明白。
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onPick('parent')}
          className="w-full text-left rounded-3xl bg-white p-5 shadow-card border-2 border-ink-100 active:scale-[.99] transition"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-parent-600 text-white flex items-center justify-center shrink-0">
              <IconParent className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-ink-900">我是家长</span>
                <span className="chip bg-ink-100 text-ink-500 text-[11px]">需监护人验证</span>
              </div>
              <div className="text-sm text-parent-600 font-semibold mt-0.5">AI 家教</div>
              <p className="text-[13px] text-ink-500 leading-relaxed mt-2">
                每周 1 份学情报告，薄弱知识点、学习状态、进步曲线一目了然。
              </p>
            </div>
          </div>
        </button>
      </div>

      <div className="mt-auto pt-6">
        <div className="rounded-2xl bg-cheer-50 border border-cheer-100 p-4">
          <div className="flex items-center gap-2 text-cheer-700 font-bold text-sm mb-2">
            <IconShield className="w-4 h-4" />
            未成年人保护
          </div>
          <ul className="text-[12.5px] text-cheer-700/90 space-y-1.5 leading-relaxed">
            <li>· 学生端无广告、无付费、无社交、无排行榜</li>
            <li>· 只做初中数学与物理，不做泛学科承诺</li>
            <li>· 学情数据仅用于本人辅导，不与其他同学比较</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
