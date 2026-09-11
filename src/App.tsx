import { useCallback, useEffect, useMemo, useState } from 'react'
import type { GuideDepth, ScreenId } from '@/types'
import PhoneFrame from '@/components/shell/PhoneFrame'
import ScreenNav from '@/components/shell/ScreenNav'
import DesignNotes from '@/components/shell/DesignNotes'
import AppBar from '@/components/common/AppBar'
import TabBar from '@/components/common/TabBar'
import RestReminder from '@/components/common/RestReminder'
import { IconEye, IconClock, IconStudent, IconParent } from '@/components/common/Icons'

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
    setTutorKey(k => k + 1)
    setScreen('stu-diagnosis')
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
        return { title: '元宝同桌', subtitle: '我们一起把它想明白', tone: 'student' as const, back: () => go('stu-home') }
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
  }, [screen, go])

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
            onFinish={r => {
              setMastered(r.mastered)
              go('stu-summary')
            }}
          />
        )
      case 'stu-summary':
        return <SessionSummary mastered={mastered} onGrowth={() => go('stu-growth')} onHome={() => go('stu-home')} />
      case 'stu-growth':
        return <GrowthCenter onOpen={go} />
      case 'stu-watch':
        return <ClassNote />
      case 'par-home':
        return <ParentHome onOpen={go} planDecided={planDecided} />
      case 'par-weekly':
        return <WeeklyReport onOpen={go} />
      case 'par-weak':
        return <WeakPointsReport onOpen={go} />
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
        </div>
      </main>

      <DesignNotes current={screen} />
    </div>
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
