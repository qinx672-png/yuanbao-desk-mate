import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GuideDepth, ScreenId, WatchMark, FollowUp } from '@/types'
import { advance, seedFollowUps, isUnderReview, type ReviewOutcome } from '@/lib/followUp'
import PhoneFrame from '@/components/shell/PhoneFrame'
import ScreenNav from '@/components/shell/ScreenNav'
import DesignNotes from '@/components/shell/DesignNotes'
import WatchFace from '@/components/watch/WatchFace'
import { watchSeedMarks, nextMarkTime } from '@/data/watchDemo'
import { classNote, weakPoints } from '@/data/mockData'
import AppBar from '@/components/common/AppBar'
import TabBar from '@/components/common/TabBar'
import RestReminder from '@/components/common/RestReminder'
import { IconEye, IconClock, IconStudent, IconParent, IconCamera } from '@/components/common/Icons'

import RoleSelect from '@/screens/RoleSelect'
import Onboarding from '@/screens/student/Onboarding'
import StudentHome from '@/screens/student/StudentHome'
import PhotoUpload from '@/screens/student/PhotoUpload'
import Diagnosis from '@/screens/student/Diagnosis'
import TutorFlow from '@/screens/student/TutorFlow'
import SessionSummary from '@/screens/student/SessionSummary'
import GrowthCenter from '@/screens/student/GrowthCenter'
import ClassNote from '@/screens/student/ClassNote'
import ParentHome from '@/screens/parent/ParentHome'
import WeeklyReport from '@/screens/parent/WeeklyReport'
import WeakPointsReport from '@/screens/parent/WeakPointsReport'
import StateTrend from '@/screens/parent/StateTrend'
import ParentAssistant from '@/screens/parent/ParentAssistant'
import PlanSuggestionScreen from '@/screens/parent/PlanSuggestionScreen'

/** 演示用：每 3 秒记 1 分钟学习时长，便于观察 40 分钟护眼提醒 */
const TICK_MS = 3000
const REST_THRESHOLD = 40

/**
 * 拍照浮层当前开着哪种模式（null = 没开）。
 *
 * 两个入口拍的东西根本不是一回事，所以不能合成一个按钮：
 *  · newProblem —— 对话屏右上角那个常驻入口。学生手上另有一道不会的题。
 *  · myWork     —— 阶段3 里的「拍照上传」。拍的是**这道题**的解题过程，
 *                  同学看过程不看答案，拍完直接进入提交。
 */
type ShootKind = 'newProblem' | 'myWork'

/**
 * 演示动线里，辅导流程对应的就是首页说的那个薄弱点（weakPoints[0]）。
 *
 * ⚠️ 真机上这里应该是「这道题命中了哪个知识点」——由题目识别给出，
 * 而不是永远取第一条。原型里只有一条主线，所以写死；
 * 真接上知识点库之后，这个常量要换成从 diagnosis 结果里取。
 */
const DEMO_REVIEW_POINT = weakPoints[0].pointId

export default function App() {
  const [screen, setScreen] = useState<ScreenId>('role')
  const [studyMinutes, setStudyMinutes] = useState(36)
  const [nextRestAt, setNextRestAt] = useState(REST_THRESHOLD)
  const [showRest, setShowRest] = useState(false)
  const [eyeCare, setEyeCare] = useState(false)
  const [mastered, setMastered] = useState(true)
  const [planDecided, setPlanDecided] = useState<'接受' | '暂不调整' | null>(null)
  const [tutorKey, setTutorKey] = useState(0)
  const [roleId, setRoleId] = useState('a2')
  const [guideDepth, setGuideDepth] = useState<GuideDepth>('标准')

  /*
   * ── 拍照浮层（对话屏）────────────────────────────────────
   * 它做成**盖在对话上的浮层**，而不是切到 stu-photo 那一屏。
   * 原因是切屏会让 TutorFlow 整个卸载，笔记本里刚聊过的内容全清空 ——
   * 那不叫「存断点」，那叫把学生的进度扔了。
   * 浮层留在原地，对话原封不动在下面，关掉就回到刚才那一步。
   */
  const [shootMode, setShootMode] = useState<ShootKind | null>(null)

  /*
   * ── 跨设备演示态（只在「课堂记录」屏用）──────────────────
   * 两台设备的状态放在这一层，是因为这条链路本身就是
   * 「一个动作跨两块屏」—— 状态不属于其中任何单独一块屏。
   */
  const [watchMarks, setWatchMarks] = useState<WatchMark[]>(watchSeedMarks)
  const [watchSynced, setWatchSynced] = useState(false)
  const [watchActive, setWatchActive] = useState<number | null>(null)

  /* 老师此刻讲到第几条 —— 手表靠它把打点自动挂到对应的知识点上 */
  const watchPoint = watchMarks.length % classNote.knowledgePoints.length

  /*
   * ── 薄弱点复查状态（跨屏）────────────────────────────────
   * 和 watchMarks 同一个理由放在这一层：这条链路本身就是
   * 「一个动作跨三块屏」—— 学生首页说「今天插一道复查」，
   * 辅导流程里做掉，成长中心和家长端看到结果。状态不属于任何单独一屏。
   *
   * 初值从 mockData 的种子里摊平；之后只能通过 advance() 改，
   * 规则写在 lib/followUp.ts 一处。
   */
  const [followUps, setFollowUps] = useState<Record<string, FollowUp>>(() => seedFollowUps(weakPoints))

  /** 推进一次复查。演示控制条和辅导流程走的是同一个入口，不存在两套规则 */
  const advanceFollowUp = useCallback((pointId: string, outcome: ReviewOutcome) => {
    setFollowUps(m => {
      const cur = m[pointId]
      if (!cur) return m
      return { ...m, [pointId]: advance(cur, outcome) }
    })
  }, [])

  /** 演示要反复走，得能回到初始状态（对照 resetWatch） */
  const resetFollowUps = useCallback(() => setFollowUps(seedFollowUps(weakPoints)), [])

  const isStudent = screen.startsWith('stu-')

  /* 学生端在学习过程中累计时长 */
  useEffect(() => {
    if (!isStudent) return
    const t = setInterval(() => setStudyMinutes(m => m + 1), TICK_MS)
    return () => clearInterval(t)
  }, [isStudent])

  useEffect(() => {
    if (isStudent && studyMinutes >= nextRestAt) setShowRest(true)
  }, [isStudent, studyMinutes, nextRestAt])

  const go = useCallback((id: ScreenId) => setScreen(id), [])

  const restartTutor = useCallback(() => {
    setShootMode(null)
    setTutorKey(k => k + 1)
    setScreen('stu-diagnosis')
  }, [])

  /** 手表上按一下「没听懂」：记一条，并让手机端对应的知识点当场亮起来 */
  const markOnWatch = useCallback(() => {
    const mark: WatchMark = {
      id: (watchMarks[watchMarks.length - 1]?.id ?? 0) + 1,
      at: nextMarkTime(watchMarks.length),
      /* 挂到老师此刻正在讲的那一条上 —— 学生不需要解释自己哪里没听懂 */
      index: watchMarks.length % classNote.knowledgePoints.length,
    }
    setWatchMarks(ms => [...ms, mark])
    setWatchActive(mark.index)
  }, [watchMarks])

  /** 演示要反复走，得能回到课前 */
  const resetWatch = useCallback(() => {
    setWatchMarks([...watchSeedMarks])
    setWatchSynced(false)
    setWatchActive(null)
  }, [])

  /* 顶部导航栏配置 */
  const bar = useMemo(() => {
    switch (screen) {
      case 'stu-photo':
        return { title: '拍照答疑', subtitle: '把不会的题拍给我看看', tone: 'dark' as const, back: () => go('stu-home') }
      case 'stu-onboard':
        return { title: '认识新同桌', subtitle: '冷启动画像', tone: 'student' as const, back: () => go('role') }
      case 'stu-diagnosis':
        return { title: '题目识别与诊断', subtitle: '阶段 1 / 6', tone: 'student' as const, back: () => go('stu-home') }
      case 'stu-tutor':
        /* 浮层盖上来时顶栏跟着变深色 —— 让「现在正在拍题」一眼可见 */
        return shootMode
          ? {
              title: shootMode === 'newProblem' ? '拍新题' : '拍解题过程',
              subtitle: shootMode === 'newProblem' ? '这一步已存成断点，关掉就回到刚才' : '我看的是过程，不是答案',
              tone: 'dark' as const,
              back: () => setShootMode(null),
            }
          : {
              title: '元宝同桌',
              subtitle: '我们一起把它想明白',
              tone: 'student' as const,
              back: () => go('stu-home'),
              right: <CameraEntry onClick={() => setShootMode('newProblem')} />,
            }
      case 'stu-summary':
        return { title: '本次学习小结', subtitle: '阶段 6 / 6', tone: 'student' as const, back: () => go('stu-home') }
      case 'stu-growth':
        return { title: '我的成长', subtitle: '只和过去的自己比较', tone: 'student' as const }
      case 'stu-watch':
        return { title: '课堂记录', subtitle: '手表端记录 · 老师授权后开启', tone: 'student' as const, back: () => go('stu-growth') }
      case 'par-home':
        return { title: '学情报告', subtitle: '家长端 · AI 家教', tone: 'parent' as const, back: () => go('role') }
      case 'par-weekly':
        return { title: '本周学习总结', tone: 'parent' as const, back: () => go('par-home') }
      case 'par-weak':
        return { title: '薄弱知识点分析', tone: 'parent' as const, back: () => go('par-home') }
      case 'par-trend':
        return { title: '学习状态趋势', subtitle: '只呈现信号，不给情绪结论', tone: 'parent' as const, back: () => go('par-home') }
      case 'par-assistant':
        return { title: '学习助手', subtitle: '家长端 · 独立通讯渠道', tone: 'parent' as const, back: () => go('par-home') }
      case 'par-plan':
        return { title: '下一步学习计划建议', tone: 'parent' as const, back: () => go('par-home') }
      default:
        return null
    }
  }, [screen, go, shootMode])

  const renderScreen = () => {
    switch (screen) {
      case 'role':
        return <RoleSelect onPick={r => go(r === 'student' ? 'stu-onboard' : 'par-home')} />
      case 'stu-onboard':
        return <Onboarding roleId={roleId} onPickRole={setRoleId} onDone={() => go('stu-home')} />
      case 'stu-home':
        return (
          <StudentHome
            studyMinutes={studyMinutes}
            roleId={roleId}
            onPhoto={() => go('stu-photo')}
            onStartTask={restartTutor}
            followUps={followUps}
          />
        )
      case 'stu-photo':
        return <PhotoUpload onShoot={restartTutor} />
      case 'stu-diagnosis':
        return <Diagnosis onStart={() => go('stu-tutor')} />
      case 'stu-tutor':
        return (
          <TutorFlow
            key={tutorKey}
            roleId={roleId}
            depth={guideDepth}
            onDepthChange={setGuideDepth}
            shoot={shootMode}
            onShoot={setShootMode}
            onShootNew={restartTutor}
            onFinish={r => {
              setMastered(r.mastered)

              /*
               * ── 复查闭环的写回点 ──────────────────────────────
               * 首页说过「今天正好又要做电路题，我先插一道复查」——
               * 这道题做完了，结果就得写回状态机，否则那句话说了等于没说。
               *
               * 两个「不写回」的分支，都是有理由的：
               *
               * ① 学生说「先停一下」主动退出（exited）→ **不写回**。
               *    这不能算「复查没通过」。同一个产品里 3.2 写得很清楚：
               *    体面退出、不留未完成标记。把主动休息记成失败，
               *    是自己打自己的脸。没查就没查，状态保持原样，
               *    下次做到同类题再插一道。
               *
               * ② 这个薄弱点已经不在复查循环里 → 不写回。
               *    首页插复查题的条件就是 isUnderReview，
               *    状态推进的条件必须是同一个 —— 否则会出现
               *    「没插复查题，状态却动了」这种对不上的情况。
               */
              if (!r.exited) {
                setFollowUps(m => {
                  const cur = m[DEMO_REVIEW_POINT]
                  if (!cur || !isUnderReview(cur)) return m
                  return { ...m, [DEMO_REVIEW_POINT]: advance(cur, r.mastered ? '通过' : '未通过') }
                })
              }

              go('stu-summary')
            }}
          />
        )
      case 'stu-summary':
        return <SessionSummary mastered={mastered} onGrowth={() => go('stu-growth')} onHome={() => go('stu-home')} />
      case 'stu-growth':
        return <GrowthCenter onOpen={go} followUps={followUps} />
      case 'stu-watch':
        return (
          <ClassNote
            marks={watchMarks}
            synced={watchSynced}
            activeIndex={watchActive}
            onSelectMark={m => setWatchActive(m.index)}
          />
        )
      case 'par-home':
        return <ParentHome onOpen={go} planDecided={planDecided} />
      case 'par-weekly':
        return <WeeklyReport onOpen={go} />
      case 'par-weak':
        /* 家长端和学生端读的是同一份复查状态 —— 两边各存一份，迟早对不上 */
        return <WeakPointsReport onOpen={go} followUps={followUps} />
      case 'par-trend':
        return <StateTrend />
      case 'par-assistant':
        return <ParentAssistant />
      case 'par-plan':
        return (
          <PlanSuggestionScreen decided={planDecided} onDecide={setPlanDecided} onHome={() => go('par-home')} />
        )
    }
  }

  const showTabBar = screen === 'stu-home' || screen === 'stu-growth'

  return (
    <div className="min-h-screen flex justify-center">
      <ScreenNav current={screen} onJump={go} />

      <main className="flex-1 min-w-0 flex flex-col items-center py-8 px-4 gap-5">
        {/* 只有「课堂记录」这一屏是两块屏：手表在左（记录），手机在右（回顾） */}
        <div className={screen === 'stu-watch' ? 'flex items-center gap-4' : ''}>
          {screen === 'stu-watch' && (
            <WatchFace
              synced={watchSynced}
              markCount={watchMarks.length}
              pointIndex={watchPoint}
              pointLabel={classNote.knowledgePoints[watchPoint]}
              onMark={markOnWatch}
              onSync={() => setWatchSynced(true)}
            />
          )}

          <PhoneFrame eyeCare={eyeCare} clock={eyeCare ? '21:38' : '16:20'}>
            {bar && <AppBar title={bar.title} subtitle={bar.subtitle} tone={bar.tone} onBack={bar.back} />}
            {renderScreen()}
            {showTabBar && (
              <TabBar
                active={screen === 'stu-growth' ? 'growth' : 'home'}
                onChange={t => go(t === 'growth' ? 'stu-growth' : 'stu-home')}
              />
            )}
            {showRest && (
              <RestReminder
                minutes={studyMinutes}
                onContinue={() => {
                  setShowRest(false)
                  setNextRestAt(studyMinutes + 10)
                }}
                onRest={() => {
                  setShowRest(false)
                  setStudyMinutes(0)
                  setNextRestAt(REST_THRESHOLD)
                  go('stu-home')
                }}
              />
            )}
          </PhoneFrame>
        </div>

        {/* 演示控制条（非产品界面，仅用于原型走查） */}
        <div className="w-[390px] rounded-2xl bg-white shadow-card p-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-ink-400 w-full">演示控制（非产品界面）</span>
          <DemoBtn onClick={() => setEyeCare(v => !v)} active={eyeCare}>
            <IconEye className="w-4 h-4" />
            夜间护眼
          </DemoBtn>
          <DemoBtn onClick={() => setShowRest(true)}>
            <IconClock className="w-4 h-4" />
            触发休息提醒
          </DemoBtn>
          <DemoBtn onClick={() => go('stu-home')}>
            <IconStudent className="w-4 h-4" />
            学生端
          </DemoBtn>
          <DemoBtn onClick={() => go('par-home')}>
            <IconParent className="w-4 h-4" />
            家长端
          </DemoBtn>
          <DemoBtn onClick={restartTutor}>重走辅导流程</DemoBtn>
          {screen === 'stu-watch' && <DemoBtn onClick={resetWatch}>重置手表演示</DemoBtn>}

          {/*
            ── 复查状态机 ────────────────────────────────────────
            两条路都能推进它，走的是同一个 advance()，不存在两套规则：

            ① 走一遍辅导流程（学生端说「接着讲」→ 做完）→ 真的推进 k1。
               这是「场景触发」那条路，也是产品的主路径。
            ② 这里的手动按钮。给的是「时间兜底」那条路：
               已巩固 → 已移出 靠的是 21 天后的定时抽查，
               日常做题流程本来就不该触发它，所以只能手动推。

            界面上的状态变化看这两处：成长中心 → 薄弱知识点；
            家长端 → 薄弱知识点分析。
          */}
          <div className="w-full mt-0.5 pt-2 border-t border-dashed border-ink-200">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[11px] font-bold text-ink-400">复查状态机</span>
              <button
                onClick={resetFollowUps}
                className="ml-auto shrink-0 text-[11px] text-brand-600 underline underline-offset-2"
              >
                重置复查
              </button>
            </div>
            <div className="space-y-1">
              {weakPoints.map(w => {
                const f = followUps[w.pointId]
                if (!f) return null
                return (
                  <div key={w.id} className="flex items-center gap-1.5">
                    <span className="w-[118px] shrink-0 truncate text-[11.5px] text-ink-700">{w.name}</span>
                    <span
                      className={`chip shrink-0 text-[10.5px] tabular-nums ${
                        f.needsReteach ? 'bg-warm-50 text-warm-700' : 'bg-ink-100 text-ink-600'
                      }`}
                    >
                      {f.needsReteach ? '先重讲 · ' : ''}
                      {f.status} · {f.round} 轮
                    </span>
                    {/* 已移出是终点：没有复查可做，按钮就不该还能按（别让界面承诺状态机做不到的事） */}
                    {f.status === '已移出' ? (
                      <span className="text-[11px] text-ink-400">已归档，不再排复查</span>
                    ) : (
                      <>
                        <DemoBtn onClick={() => advanceFollowUp(w.pointId, '通过')}>通过</DemoBtn>
                        <DemoBtn onClick={() => advanceFollowUp(w.pointId, '未通过')}>没通过</DemoBtn>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      <DesignNotes current={screen} />
    </div>
  )
}

/**
 * 对话屏右上角的常驻拍照入口。
 *
 * ── 为什么它必须常驻（这一版修的就是这件事）────────────────
 * 这个产品原本的设计原则是「动作长在生成物里，不是常驻按钮」——
 * AI 邀请你做的动作，就长在那条回答里。
 * 这对 **AI 发起** 的动作是对的。
 * 但拍照答疑是 **学生自己发起** 的：他今天就是拿到了一道不会的题，
 * 不该先等 AI 开口，才有地方把它拍进来。
 *
 * 一句话：AI 邀请的动作可以长在生成物里；学生随时可能发起的动作，
 * 必须有常驻入口。
 */
function CameraEntry({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="拍新题"
      className="tap gap-1.5 rounded-xl bg-brand-50 px-3 text-[12.5px] font-bold text-brand-700 active:scale-95 transition"
    >
      <IconCamera className="w-4 h-4" />
      拍新题
    </button>
  )
}

function DemoBtn({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`tap gap-1.5 rounded-xl px-3 text-[12.5px] font-semibold transition ${
        active ? 'bg-brand-500 text-white' : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
      }`}
    >
      {children}
    </button>
  )
}
