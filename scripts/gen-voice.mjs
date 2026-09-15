/**
 * 同桌的声音 —— 预渲染脚本
 *
 *   node scripts/gen-voice.mjs           只补缺的
 *   node scripts/gen-voice.mjs --force   全部重来（换了音色/情感参数时用）
 *   node scripts/gen-voice.mjs --dry     只列出会生成哪些，不花钱
 *
 * ── 为什么是「预渲染 + 内容寻址」而不是实时调 TTS ──────────────
 * 实时调要么把密钥塞进前端（绝对不行），要么挂个后端（静态站就没声音了）。
 * 而辅导脚本的台词**本来就是静态数据** —— 那就一次性合成成 mp3，
 * 当成普通静态资源发出去。于是：密钥不进前端、离线可用、零播放延迟、
 * 静态站（dist/ 拷到 GitHub Pages）照样有声音。
 *
 * ── 内容寻址是什么意思，它解决什么 ────────────────────────────
 * 文件名不是 01.mp3 / intro.mp3 这种，而是 **文本的哈希**：
 *     「断路点会被电压表测到电源电压」 → a3f9c1….mp3
 * 好处是**音文不一致在物理上不可能**：改了台词，哈希就变了，
 * 找不到文件 → 前端当场退回浏览器语音，并在控制台打出
 *     [voice] 缺音频：<新台词>
 * 而不是悄悄播一句过期的旧录音。这种「旧音频配新文案」的 bug，
 * 藏得深、还特别像真的，是这类方案最容易踩的坑，哈希从根上堵掉它。
 *
 * ── 凭据 ────────────────────────────────────────────────────
 * 读项目根目录的 .env.local（已在 .gitignore 里，不会进仓库）：
 *     DOUBAO_TTS_APPID=<火山方舟控制台的 APPID>
 *     DOUBAO_TTS_ACCESS_KEY=<Access Key>
 * 也可以直接用环境变量覆盖。密钥绝不写进本文件。
 */

import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { tmpdir } from 'node:os'
// 豆包 TTS 的调用细节（鉴权头 / 轮询 / 下载）全在 tts-lib.mjs，
// 试听脚本 voice-audition.mjs 用的是同一份
import { loadCreds, synthesize, clipName } from './tts-lib.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = join(ROOT, 'public', 'voice')

/* ── 音色 / 情感 / 语速 ──────────────────────────────────────
 * 2026-09-13 定稿：**VV + 语速 0**，秦肖听完 9 个音色 × 2 档语速的小样后定的。
 *
 * ── 为什么换掉温柔小雅 ──────────────────────────────────────
 * 原音色是温柔小雅，秦肖的原话是「语速太慢，不像讲课像书评」。
 * 实测（scripts/voice-audition.mjs + voice-rate-test.mjs）：
 *   温柔小雅 rate 0  = 4.5 字/秒（10 条长句平均）
 *   VV        rate 0  = 5.1 字/秒（同一段 139 字连续课文）
 * 「慢」的观感主要来自音色气质（散文朗诵腔），不是 speech_rate ——
 * 温柔小雅即便 +20 也只快 9%，几乎听不出来。换音色才解决问题。
 *
 * ── 为什么语速用 0 而不是秦肖最初选的 +20 ───────────────────
 * VV 本身就不慢：+0 已经 5.1 字/秒（≈新闻联播），+20 会到 6.1 字/秒，
 * 比新闻还快 —— 而后面有 73 句连续推导要跟着听。所以退回 +0。
 *
 * ⚠️ 这三个参数**机器判断不了好不好**，只能人戴耳机听。改之前先跑：
 *      node scripts/voice-audition.mjs     音色 A/B（9 个候选）
 *      node scripts/voice-rate-test.mjs    语速 A/B（真实课文连听 30 秒）
 *    别跳过试听直接改 —— 听不出差别就等于没改。
 *
 * ⚠️ 哈希只认文本、不认音色：改了音色/语速/码率**必须** --force，
 *    否则旧音频还在、manifest 也还在，新参数一点都不会生效。
 *
 * speech_rate 取值 [-50, 100]，100 = 2.0 倍速，0 = 常速。
 */
const SPEAKER = 'zh_female_vv_uranus_bigtts'
const EMOTION = 'tender'
const EMOTION_SCALE = 3 // 1~5。同桌是讲题，不是哄睡，3 比 4 稳
const SPEECH_RATE = 0
/* 码率保持 64k。我提过降到 32k 可以把体积砍半（7.7MB→3.9MB），
 * 但秦肖没确认，而且降码率要重新试听音质 —— 没确认就不动。 */
const BIT_RATE = 64000

const argv = process.argv.slice(2)
const FORCE = argv.includes('--force')
const DRY = argv.includes('--dry')

/* ==================================================================
 * 一、把台词收集齐
 * ================================================================== */

/**
 * mockData.ts 是 TypeScript，Node 直接 import 不了。
 * 用 esbuild 转成临时的 .mjs 再 import —— 比正则去抠字符串靠谱得多
 * （正则抠不出模板串、转义引号、多行文本，抠漏了还不报错）。
 */
async function loadMockData() {
  const outfile = join(tmpdir(), `mockData.${process.pid}.mjs`)
  await build({
    entryPoints: [join(ROOT, 'src', 'data', 'mockData.ts')],
    outfile,
    format: 'esm',
    bundle: true,
    platform: 'node',
    // '@/types' 只是类型导入，esbuild 会整个抹掉；但保险起见给个别名
    alias: { '@': join(ROOT, 'src') },
    logLevel: 'warning',
  })
  const mod = await import(`file://${outfile.replace(/\\/g, '/')}`)
  return mod
}

/** 收集所有该由同桌念出来的句子 */
function collectLines(mock) {
  const lines = new Set()
  const add = t => {
    if (typeof t !== 'string') return
    const s = t.trim()
    // 太短的（「嗯」「好」）不值得单独合一条音频，也没听感价值
    if (s.length < 2) return
    // 带 markdown 强调符的要去掉 —— TTS 会把星号念出来
    lines.add(s.replace(/\*\*/g, ''))
  }

  // ① 辅导脚本：所有 kind === 'ai' 的气泡
  if (mock.script) {
    for (const node of Object.values(mock.script)) {
      for (const b of node.bubbles ?? []) {
        if (b.kind === 'ai') add(b.text)
      }
      /*
       * 选项自带的「同桌接一句」（ChatOption.reply）—— 2026-09-14 合并 p2-known 时加的字段。
       *
       * ⚠️ 漏扫这里**不会有任何报错**：那句台词会静默地从待合成清单里消失。
       * 因为音频是内容寻址的，文件早就在磁盘上、哈希没变，对账照样显示「全部已有音频」，
       * 只有哪天改了这句文案，才会发现它永远停在旧录音上 —— 而且没人知道为什么。
       * 实测过：加完 reply 没加这段扫描，总数从 135 掉到 134，脚本一声不吭。
       *
       * 教训同 ⑤⑦⑧：**数据里新加一个能装台词的字段，就要同步加进这里。**
       */
      for (const o of node.options ?? []) {
        for (const b of o.reply ?? []) {
          if (b.kind === 'ai') add(b.text)
        }
      }
    }
  }

  // ② 退出弹窗里 AI 的回应（easier 那条；save/pause 是运行时现拼的，
  //    见 TutorFlow 的 doExit —— 那两句含变量，走下面的 extra 列表）
  for (const o of mock.exitOptions ?? []) add(o.reply)

  // ③ 容错四步闭环：由 error.quote / error.fix 现场拼出来，
  //    但输入是数据里的定值，所以可以在这里穷举出来
  if (mock.fallbackLoopFor) {
    for (const node of Object.values(mock.script ?? {})) {
      if (!node.error) continue
      for (const step of mock.fallbackLoopFor(node.error.quote, node.error.fix) ?? []) {
        // 界面上会加「【发现】」这类前缀，念的时候不带前缀
        add(String(step.text).replace(/^【[^】]*】/, ''))
      }
    }
  }

  // ④ 家长端「学习助手」的回答。这些是 mockData 里的定值，能直接枚举
  //    （问题由家长问出来，回答才是要念的）
  for (const a of mock.assistantQuickAsks ?? []) add(a.answer)

  // ⑤ 冷启动里由数据驱动的两句问话。
  //    ⚠️ 这两句一开始漏了 —— 结果秦肖第一次试听时，开场第一句就掉回机器音，
  //    被前端的缺句上报抓了出来（scripts/voice-extra.json）。
  //    自闭环兜住了，但更该一开始就收齐，所以补在这儿。
  for (const k of ['onboardInterest', 'onboardAvatar']) add(mock[k]?.ask)

  // ⑥ 学生首页那些**写在组件里**的台词（见 studentHomeLines，含变量，
  //    值从 mockData 现算）
  for (const t of studentHomeLines(mock)) add(t)

  // ⑦ 家长端答不上来时的诚实说明（写在 ParentAssistant.tsx 里）
  add(
    '这个问题原型里我答不上来 —— 我只准备了学情、教育方法、边界这三类。真实产品里我会基于学情数据回答，答不了的会直接说答不了。',
  )

  // ⑧ 兴趣标签那句是按 tag **现拼**的（`行，「${tag}」我记下了…`）。
  //    ⚠️ 2026-09-13 秦肖试到「休息」那条时掉回机器音才发现：
  //    这行既不在 mockData 的字段里（collectLines 扫不到），
  //    又含变量（scanOnboardingLiterals 的字面量扫描会跳过），
  //    **两道网都漏了它**。而 tag 只有四个取值，是能穷举的数据 ——
  //    所以按数据枚举，别指望扫描。
  const interestTags = new Set()
  for (const o of mock.onboardInterest?.options ?? []) if (o.tag) interestTags.add(o.tag)
  for (const tag of interestTags) add(`行，「${tag}」我记下了 —— 以后出题我就往这上面靠。`)

  // ⑨ 快问快答里「猜你选哪个」那句 —— 同一个坑。
  //    措辞取决于「第几题」和「上一题选了啥」，所以是一个小集合，不是一句话。
  //    拼装逻辑已经搬到 mockData 的 quickGuessLine()，这里直接调同一个函数，
  //    前端和脚本不可能再各拼各的。
  //    lastPick 只枚举 0/1：学生上一题一定答过，undefined 那条分支走不到。
  for (let i = 0; i < (mock.quickQuestions ?? []).length; i++) {
    if (!mock.quickQuestions[i]?.guess) continue
    for (const lastPick of [0, 1]) {
      const line = mock.quickGuessLine(i, lastPick)
      if (line) add(line)
    }
  }

  return lines
}

/**
 * 界面文案 —— 屏幕上要显示、但**不该念出来**的那些字。
 *
 * 从 mockData 现算，不手抄：凡是标着 sensing / system / cite / student 的，
 * 一律不是台词。理由见 TutorFlow.tsx 的 SPEAKABLE 注释。
 */
function collectNonSpoken(mock) {
  const out = new Set()
  const norm = t => String(t).trim().replace(/\*\*/g, '')
  for (const node of Object.values(mock.script ?? {})) {
    if (node.sensing) out.add(norm(node.sensing))
    for (const b of node.bubbles ?? []) {
      if (b?.kind === 'system' || b?.kind === 'cite' || b?.kind === 'student') out.add(norm(b.text))
    }
  }
  return out
}

/**
 * 学生首页（StudentHome.tsx）里写在组件内的台词。
 *
 * ── 为什么要在脚本里重抄一遍 ────────────────────────────────
 * 这些句子不是 mockData 的字段，是散在组件里的字面量和模板串，
 * import 不进来。所以只能在这儿重建 —— 代价是**文案改了两边要对齐**。
 *
 * 漏掉的后果不严重，因为兜底是自闭环的：改了文案 → 哈希变了 →
 * 前端取不到音频 → 退回浏览器语音，并上报进 voice-extra.json，
 * 下次跑本脚本就补上了，不会出现「新文案配旧录音」。
 * 但**面试现场第一次点到某句话会掉回机器音**，所以主流路径先在这儿铺齐。
 *
 * ⚠️ 变量值一律从 mockData 现算，不手抄数字 ——
 *    手抄过一次「36 分钟」，和顶栏的实时值对不上。
 */
function studentHomeLines(mock) {
  const student = mock.student ?? {}
  const wp = (mock.weakPoints ?? [])[0] ?? {}
  const total = (mock.todayTasks ?? []).reduce((s, t) => s + (t.minutes ?? 0), 0)

  return [
    // ── 开场（intro）──
    `哈喽${student.name}同学，下午好啊。`,
    '接着上次那一步，还是从头讲一遍？你说了算。',
    `昨天你卡在「${wp.name}」这道题上，`,
    `近 30 天你错过了 ${wp.errorCount} 次，而且每次都是同一个环节。要不要接着弄明白？`,
    // 「持续跟进」那条闭环的两个分支
    '对了，上次说好要复查的——今天正好又要做电路题，我先插一道短的，看看是不是真记住了。',
    '这道电路的复查还没完。上一轮你过了，但过几天再看一次才算数 —— 我再插一道。',

    // ── 没听清（onSay）──
    '没听清，你再说一遍？',

    // ── plan() 六个分支 ──
    '今天状态一般，那就别硬撑。',
    '哪个都行，不选也没关系。',
    '昨天那节课你只记了一句话，我贴在这儿。',
    '就这一句，扫一眼就行。想动手做题随时说。',
    '行，我给你排三道。',
    `${total} 分钟，按你现在的水平排的，做不完也不算欠账。`,
    '给你在本子角上放个表。',
    '它不是考试倒计时，你想收起就收起。',
    '好，那我们把题拿出来，我陪你一步步理。',
    '我先把这道题的出处贴出来。',
    '把题拿过来就行 —— 拍给我，或者直接说。',

    // ── 三个台阶（GENTLE_REPLIES）──
    '行，先来个热身的。一根线串两只灯，取下一只，另一只还亮吗？',
    '存好了。下次打开我直接从这一步接着问你，不用重头讲。',
    '好，今天到这儿。你已经把「电压为 0 说明元件是好的」弄明白了，这个不会丢。',
  ]
}

/**
 * 冷启动（Onboarding.tsx）里能被念出来的静态台词 —— **扫源码**，不靠手抄。
 *
 * ── 为什么要有这个函数 ──────────────────────────────────────
 * collectLines 只认 mockData 的字段，扫不到写在组件里的字面量。
 * 而冷启动是最近改得最凶的一块，改了文案 → 哈希变了 → 前端取不到音频 →
 * **面试现场第一句就掉回浏览器机器音**。前两轮都是靠运行时上报才发现漏句的。
 *
 * 所以这里读一遍 Onboarding.tsx，把 `say('…')` / say(`…`) 的第一个参数捞出来，
 * 把 ${常量} / ${对象.字段} 展开，然后在 main 里跟收集到的句子对账：
 * 对不上的**当场打警告**，不再等运行时暴露。
 *
 * 扫不到动态拼的（`say(line, id)` 那种快问快答变体）—— 那些本来也穷举不完，
 * 继续走运行时的缺句上报。
 */
async function scanOnboardingLiterals(mock) {
  const file = join(ROOT, 'src', 'screens', 'student', 'Onboarding.tsx')
  if (!existsSync(file)) return { found: [], unresolved: [] }
  const src = await readFile(file, 'utf8')

  // 组件里的字符串常量，用来展开 ${X}
  const consts = {}
  for (const m of src.matchAll(/^const ([A-Za-z_][A-Za-z0-9_]*)\s*=\s*'((?:[^'\\]|\\.)*)'/gm)) {
    consts[m[1]] = m[2]
  }

  const found = []
  const unresolved = []
  const re = /\bsay\(\s*(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*')/g
  let m
  while ((m = re.exec(src))) {
    const raw = m[1].slice(1, -1)
    let ok = true
    const text = raw.replace(/\$\{([^}]+)\}/g, (_, expr) => {
      const e = expr.trim()
      if (consts[e] !== undefined) return consts[e]
      // ${onboardInterest.ask} 这类：从 mockData 现取，不手抄
      const [obj, field] = e.split('.')
      const v = field ? mock[obj]?.[field] : mock[e]
      if (typeof v === 'string') return v
      ok = false
      return ''
    })
    if (ok) found.push(text)
    else unresolved.push(raw)
  }
  return { found, unresolved }
}

async function loadExtra() {
  const p = join(ROOT, 'scripts', 'voice-extra.json')
  if (!existsSync(p)) return []
  try {
    const j = JSON.parse(await readFile(p, 'utf8'))
    return Array.isArray(j) ? j : []
  } catch (e) {
    console.error('voice-extra.json 读不了（JSON 格式错了？）：', e.message)
    return []
  }
}

/* ==================================================================
/* ==================================================================
 * 二、豆包 TTS 2.0 —— 调用逻辑搬去了 scripts/tts-lib.mjs
 * ==================================================================
 * gen-voice（正式生成）和 voice-audition（试听小样）共用那一份。
 * 鉴权头用哪两个、query 只能传 task_id、additions 得是 JSON 字符串 ——
 * 这些坑只留一份，免得两个脚本里有一处先烂掉。
 */

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const mock = await loadMockData()
  const fromData = collectLines(mock)
  const fromScript = fromData.size // 合并前先记下来，不然下面的账算不平
  // ⚠️ 2026-09-14：voice-extra.json 是**前端运行时上报**的口子，它分不清
  //    「该念的句子缺了音频」和「这句话根本不该念」。TutorFlow 早先不过滤气泡
  //    类型，把界面文案（教研备注 sensing / 系统提示 system / 教材卡 cite）
  //    也送进了 speak()，于是被上报、被当成「待补台词」合成成了音频 ——
  //    一个 bug 被自愈机制洗成了正常数据。
  //    前端已加 SPEAKABLE 过滤，这里再设一道闸：mockData 里标着
  //    sensing / system / cite / student 的文字，永远不进台词表。
  const nonSpoken = collectNonSpoken(mock)
  const dropped = []
  const extra = (await loadExtra()).filter(t => {
    if (typeof t !== 'string' || t.trim().length < 2) return false
    if (nonSpoken.has(t.trim().replace(/\*\*/g, ''))) {
      dropped.push(t.trim())
      return false
    }
    return true
  })
  for (const t of extra) fromData.add(t.trim().replace(/\*\*/g, ''))
  if (dropped.length) {
    console.log(`\n按掉了 voice-extra.json 里 ${dropped.length} 句「不该念」的界面文案：`)
    dropped.forEach(t => console.log(`  · ${t.slice(0, 42)}${t.length > 42 ? '…' : ''}`))
    console.log('  （Sensing/系统提示/教材卡是给人看的，不出声。要改主意就改 TutorFlow 的 SPEAKABLE。）')
  }

  const all = [...fromData]
  const added = all.length - fromScript
  console.log(`\n台词共 ${all.length} 句（脚本 ${fromScript} + 补录新增 ${added}）`)
  if (extra.length > added) {
    console.log(`  （voice-extra.json 里有 ${extra.length - added} 句和脚本里的重复，已合并）`)
  }

  // 冷启动台词对账：改了文案没补进 voice-extra.json 的，在这儿当场抓出来
  const { found: obLines, unresolved: obDynamic } = await scanOnboardingLiterals(mock)
  const obMissing = obLines.filter(t => !fromData.has(t.replace(/\*\*/g, '')))
  if (obMissing.length) {
    console.log(`\n⚠️ 冷启动有 ${obMissing.length} 句台词没有对应音频（台词改了但没补进 voice-extra.json）：`)
    obMissing.forEach(t => console.log(`  · ${t}`))
    console.log('  这些句子上场时会掉回浏览器机器音。补齐 voice-extra.json 再跑一次。')
  } else {
    console.log(`冷启动台词对账：${obLines.length} 句全都有音频 ✓`)
  }
  if (obDynamic.length) {
    console.log(`  （另有 ${obDynamic.length} 句含变量扫不出来，靠运行时上报：${obDynamic[0].slice(0, 30)}…）`)
  }

  // 已经有音频的（按哈希查文件在不在，不信任任何索引文件）
  const have = new Set((await readdir(OUT_DIR).catch(() => [])).filter(f => f.endsWith('.mp3')))
  const todo = all.filter(t => FORCE || !have.has(clipName(t)))

  if (todo.length === 0) {
    console.log('全部已有音频，没什么要做的。\n')
  } else {
    console.log(`要生成 ${todo.length} 句${FORCE ? '（--force，全部重来）' : '（只补缺的）'}\n`)
  }

  if (DRY) {
    todo.forEach((t, i) => console.log(`  ${String(i + 1).padStart(3)}. ${t.slice(0, 44)}`))
    console.log('\n--dry：没有真的调用接口，也没花钱。\n')
    return
  }

  let ok = 0
  const failed = []
  if (todo.length) {
    const creds = await loadCreds()
    for (let i = 0; i < todo.length; i++) {
      const t = todo[i]
      const name = clipName(t)
      process.stdout.write(`  [${i + 1}/${todo.length}] ${t.slice(0, 26)}… `)

      /*
       * 每一句都重试 3 次，单句失败**绝不能掀掉整轮**。
       *
       * 2026-09-13 全量重跑时实测：跑到第 12 句撞上一次 TCP 连接超时
       * （UND_ERR_CONNECT_TIMEOUT），因为 fetch 抛的异常没人接，
       * 整个脚本当场结束 —— 前面 11 句白跑，后面 120 句一句没动。
       * 132 句要跑十几分钟，中途必有一次网络抖，所以这里必须兜住：
       *   ① synthesize 内部把网络错误变成返回字符串，不往外抛
       *   ② 外面再包一层 try/catch，防止别的意外（写盘失败等）掀桌子
       *   ③ 重试之间退避，给网络一点恢复时间
       */
      let err = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          err = await synthesize(t, join(OUT_DIR, name), creds, {
            speaker: SPEAKER,
            speechRate: SPEECH_RATE,
            emotion: EMOTION,
            emotionScale: EMOTION_SCALE,
            bitRate: BIT_RATE,
          })
        } catch (e) {
          err = `抛异常：${e?.message ?? e}`
        }
        if (!err) break
        if (attempt < 3) {
          process.stdout.write(`⟳${attempt} `)
          await new Promise(r => setTimeout(r, 1500 * attempt))
        }
      }

      if (err) {
        console.log(`✗ ${err}`)
        failed.push({ text: t, err })
      } else {
        console.log('✓')
        ok++
      }
      // 接口有频率限制，句与句之间喘一口
      await new Promise(r => setTimeout(r, 260))
    }
  }

  // ── manifest：文本 → 文件名 ──────────────────────────────────
  // 前端只读这一个文件判断「这句有没有音频」。哈希其实前端自己也能算，
  // 但 manifest 让「有哪些」一目了然，也方便人工抽查。
  //
  // 判据只有一条：**文件此刻在不在磁盘上**。
  // 早先写的是「本次没失败就算在册」，但 --force 跑挂一句时它照样登记，
  // manifest 就说谎了（前端拿到 404 再退回浏览器语音）。查盘最笨也最准。
  const manifest = {}
  for (const t of all) {
    const n = clipName(t)
    if (existsSync(join(OUT_DIR, n))) manifest[t] = n
  }
  await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')

  // 试听页：把全部音频排在一页里，点一下就听。
  // 为的是**快速判断音色/情感/语速对不对** —— 走完整演示听 73 句要点十分钟，
  // 这里三十秒扫完。改 EMOTION / EMOTION_SCALE 之后尤其该先听这个。
  await writeAudition(manifest)

  // 改过台词之后，旧文案的音频就成了没人引用的孤儿文件。不自动删
  // （删文件这种事不该脚本背着你干），但要说出来 —— 它会一直占体积，
  // 将来要往单文件版里内联音频时，这些就是纯浪费。
  const used = new Set(Object.values(manifest))
  const orphans = [...have].filter(f => !used.has(f))
  if (orphans.length) {
    console.log(`\n另有 ${orphans.length} 个旧文案留下的孤儿音频（没有台词再引用它们）：`)
    orphans.slice(0, 8).forEach(f => console.log(`  · ${f}`))
    if (orphans.length > 8) console.log(`  …… 还有 ${orphans.length - 8} 个`)
    console.log('  删不删你自己定 —— 我不替你删文件。确认没用再动手。')
  }

  console.log(`\n成功 ${ok} 句，失败 ${failed.length} 句。`)
  console.log(`音频目录：public/voice/  共 ${Object.keys(manifest).length} 条在册`)
  if (failed.length) {
    console.log('\n失败的（改完再跑一次就会只补这些）：')
    failed.forEach(f => console.log(`  · ${f.text.slice(0, 40)}\n    ${f.err}`))
  }
  console.log(
    '\n提醒：改了台词就要重跑本脚本。忘了也不要紧 —— 前端按哈希取文件，\n' +
      '取不到会退回浏览器语音，并在浏览器控制台打出「[voice] 缺音频：…」，\n' +
      '不会出现「新文案配旧录音」。\n',
  )
}

/**
 * 写一个试听页。
 * 纯静态、无依赖 —— 双击就能开，不需要起服务器。
 */
async function writeAudition(manifest) {
  const rows = Object.entries(manifest)
    .map(([text, file]) => {
      const esc = text.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
      return `    <li><button onclick="p('${file}',this)">▶</button><span>${esc}</span></li>`
    })
    .join('\n')

  const html = `<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<title>同桌的声音 · 试听</title>
<style>
  body{margin:0;padding:24px 20px 60px;background:#f4f7fb;color:#1b2733;
       font:15px/1.7 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif}
  h1{font-size:17px;margin:0 0 4px}
  p.sub{margin:0 0 20px;color:#5b6b7c;font-size:13px}
  ul{list-style:none;margin:0;padding:0;max-width:760px}
  li{display:flex;gap:10px;align-items:flex-start;background:#fff;border:1px solid #e3e9f0;
     border-radius:10px;padding:10px 12px;margin-bottom:8px}
  li.on{border-color:#2f90f5;box-shadow:0 0 0 3px rgba(47,144,245,.15)}
  button{flex:0 0 auto;width:30px;height:30px;border-radius:50%;border:0;cursor:pointer;
         background:#2f90f5;color:#fff;font-size:12px;line-height:1}
  button:active{transform:scale(.94)}
  span{flex:1;min-width:0}
  code{background:#eef3f9;padding:1px 5px;border-radius:4px;font-size:12.5px}
</style>
<h1>同桌的声音 · 全部 ${Object.keys(manifest).length} 句</h1>
<p class="sub">音色 <code>${SPEAKER}</code> · 情感 <code>${EMOTION} ${EMOTION_SCALE}</code> —— 点 ▶ 逐句听。改参数后跑 <code>--force</code> 重来。</p>
<ul>
${rows}
</ul>
<script>
  var cur = null, curBtn = null
  function p(file, btn) {
    if (curBtn) {
      curBtn.parentNode.classList.remove('on')
      if (cur && cur.dataset.f === file) { cur.pause(); cur = null; curBtn = null; return }
      if (cur) cur.pause()
    }
    var a = new Audio(file)
    a.dataset.f = file
    a.onended = function () { btn.parentNode.classList.remove('on'); cur = null; curBtn = null }
    btn.parentNode.classList.add('on')
    a.play()
    cur = a
    curBtn = btn
  }
</script>
</html>
`
  await writeFile(join(OUT_DIR, '_audition.html'), html, 'utf8')
}

main().catch(e => {
  console.error('\n脚本挂了：', e)
  process.exit(1)
})
