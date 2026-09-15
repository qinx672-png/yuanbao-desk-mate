/**
 * 同桌的声音 —— 试听小样（挑音色和语速用）
 *
 *   node scripts/voice-audition.mjs          只补缺的
 *   node scripts/voice-audition.mjs --force  全部重来
 *
 * 产出 public/voice/_try/index.html，浏览器打开点着听。
 *
 * ── 为什么要有这个脚本 ──────────────────────────────────────
 * gen-voice.mjs 一次要合成 107 句，换音色就是 107 次调用。
 * 但「这个音色像不像讲课」这件事，**代码判断不了**，只能人耳听。
 * 所以先用**同一句台词**把候选音色各合成一遍，挑定了再全量跑。
 * 反过来做（先全量跑再听）就是花 107 倍的钱试错。
 *
 * ⚠️ _try/ 是草稿，不进仓库（见 .gitignore），也不该拷进 dist/ 交付。
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadCreds, synthesize } from './tts-lib.mjs'

const TRY_DIR = join(ROOT, 'public', 'voice', '_try')
const FORCE = process.argv.slice(2).includes('--force')

/* ── 试听台词 ────────────────────────────────────────────────
 * 必须是**真实台词**，不能临时编一句「你好我是同桌」——
 * 短句听不出讲题时那种「一口气讲一段」的节奏，也听不出长句会不会塌。
 * 这句取自辅导脚本第 1 句，41 字，有破折号、有提问，够代表性。
 */
const SAMPLE = '一根线串两只灯，我伸手把其中一只拧下来 —— 另一只也灭了。你想想，这是为什么？'

/* ── 候选音色 ────────────────────────────────────────────────
 * recommend: true = 我建议先听这个（理由写在 note 里）
 *
 * 命名规则：2.0 模型只吃 *_uranus_bigtts 后缀。
 * ICL_uranus_* 在官方 2.0 音色表里有，但有的第三方实现把 ICL_ 路由到
 * 1.0，账号有没有授权**只能实测**。所以下面两个 ICL_ 的如果报错，
 * 不是脚本坏了，是这个账号没开。
 */
const VOICES = [
  {
    id: 'zh_female_wenrouxiaoya_uranus_bigtts',
    label: '温柔小雅',
    note: '现在用的。对照组 —— 秦肖说「不像讲课像书评」的就是它',
  },
  {
    id: 'zh_male_shaonianzixin_uranus_bigtts',
    label: '少年梓辛',
    note: '官方描述：明亮、自信、充满活力的少年男声。少年感最纯的一个',
    recommend: true,
  },
  {
    id: 'ICL_uranus_zh_male_tiancaitongzhuo_tob',
    label: '天才同桌',
    note: '名字直接就叫「同桌」，和产品撞名。ICL_ 前缀，账号未必有授权',
    recommend: true,
  },
  {
    id: 'ICL_uranus_zh_male_yuanqishaonian_tob',
    label: '元气少年',
    note: '元气系。对应形象库里 a5 小满「元气系」那条人设',
  },
  {
    id: 'zh_male_tiancaitongsheng_uranus_bigtts',
    label: '天才童声',
    note: '偏童声。可能太小孩 —— 初中生听「童声」会出戏，但值得听一下',
  },
  {
    id: 'zh_male_liangsangmengzai_uranus_bigtts',
    label: '亮嗓萌仔',
    note: '卡通感最重的一档。如果「青少年卡通」是这个意思，就是它',
  },
  {
    id: 'zh_female_mengyatou_uranus_bigtts',
    label: '萌丫头',
    note: '女声、卡通向。和第 2、3 条对比着听，先定性别再定音色',
  },
  {
    id: 'zh_female_yingtaowanzi_uranus_bigtts',
    label: '樱桃丸子',
    note: '女声、卡通向，比萌丫头更「动画片」',
  },
  {
    id: 'zh_female_vv_uranus_bigtts',
    label: 'VV',
    note: '通用女声，官方文档示例用的就是它 —— 通常是账号一定有授权的那一个',
  },
]

/* ── 语速 ────────────────────────────────────────────────────
 * [-50, 100]，0 = 常速。现在用的是 0，秦肖说太慢。
 * 只试两档：跨度太小听不出区别，太大又可能直接听废（豆包极端值会不自然）。
 * 20 = 明显快一档但仍像讲课；40 = 快，接近「赶进度」。
 */
const RATES = [
  { value: 20, label: '语速 +20（稳一点）' },
  { value: 40, label: '语速 +40（快一点）' },
]

const EMOTION = 'tender' // 与正式脚本保持一致，好对比
const EMOTION_SCALE = 3

const esc = s =>
  String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

async function main() {
  await mkdir(TRY_DIR, { recursive: true })
  const creds = await loadCreds()

  const jobs = []
  VOICES.forEach((v, vi) => RATES.forEach((r, ri) => jobs.push({ v, r, key: `v${vi}_r${ri}`, vi, ri })))

  console.log(`\n试听小样：${VOICES.length} 个音色 × ${RATES.length} 档语速 = ${jobs.length} 条`)
  console.log(`台词：「${SAMPLE}」\n`)

  const failed = []
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i]
    const out = join(TRY_DIR, `${j.key}.mp3`)
    const tag = `[${i + 1}/${jobs.length}] ${j.v.label} · ${j.r.label}`

    if (!FORCE && existsSync(out)) {
      console.log(`  ${tag} — 已有，跳过`)
      j.file = `${j.key}.mp3`
      continue
    }
    process.stdout.write(`  ${tag} `)

    // 先带情感合成；不支持情感的（尤其 ICL_ 音色）退回不带情感
    let err = await synthesize(SAMPLE, out, creds, {
      speaker: j.v.id,
      speechRate: j.r.value,
      emotion: EMOTION,
      emotionScale: EMOTION_SCALE,
    })
    if (err) {
      process.stdout.write('（带情感失败，退回无情感）')
      err = await synthesize(SAMPLE, out, creds, {
        speaker: j.v.id,
        speechRate: j.r.value,
        emotion: '',
      })
      if (!err) j.noEmotion = true
    }

    if (err) {
      console.log(`✗ ${err}`)
      failed.push({ ...j, err })
    } else {
      console.log('✓')
      j.file = `${j.key}.mp3`
    }
  }

  const html = render(jobs, failed)
  await writeFile(join(TRY_DIR, 'index.html'), html, 'utf8')

  console.log(`\n成功 ${jobs.length - failed.length} / ${jobs.length}`)
  if (failed.length) {
    console.log('\n失败的（多半是这个账号没开该音色，不是脚本问题）：')
    for (const f of failed) console.log(`  · ${f.v.label} ${f.v.id} — ${f.err}`)
  }
  console.log(`\n打开这一页听：public/voice/_try/index.html`)
  console.log('挑定了告诉我音色名 + 语速档，我填进 gen-voice.mjs 再 --force 全量重跑。\n')
}

function render(jobs, failed) {
  const ok = jobs.filter(j => j.file)
  const byVoice = VOICES.map((v, vi) => ({ v, items: ok.filter(j => j.vi === vi) })).filter(g => g.items.length)

  const rows = byVoice
    .map(({ v, items }) => {
      const players = items
        .map(
          j => `
        <div class="take">
          <button class="play" data-src="${esc(j.file)}">▶ ${esc(j.r.label)}</button>
          <span class="meta">${j.noEmotion ? '无情感（该音色不支持 tender）' : '情感 tender 3'}</span>
        </div>`,
        )
        .join('')
      return `
      <section class="card${v.recommend ? ' rec' : ''}">
        <div class="head">
          <h2>${esc(v.label)}${v.recommend ? ' <span class="badge">建议先听</span>' : ''}</h2>
          <code>${esc(v.id)}</code>
        </div>
        <p class="note">${esc(v.note)}</p>
        ${players}
      </section>`
    })
    .join('')

  const failBlock = failed.length
    ? `<section class="card fail"><h2>没合成出来</h2><ul>${failed
        .map(f => `<li><code>${esc(f.v.id)}</code> — ${esc(f.err)}</li>`)
        .join('')}</ul><p class="note">这通常是账号没授权该音色（ICL_ 前缀的尤其可能），不是脚本坏了。</p></section>`
    : ''

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>同桌的声音 · 试听</title>
<style>
  :root { --ink:#1f2429; --dim:#5d6871; --line:#dde3e8; --bg:#f6f8f9; --card:#fff; --brand:#1f6f5c; --warn:#b4531f; }
  * { box-sizing:border-box; }
  body { margin:0; padding:32px 20px 64px; background:var(--bg); color:var(--ink);
         font:15px/1.7 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif; }
  .wrap { max-width:820px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 6px; font-weight:600; }
  .sub { color:var(--dim); margin:0 0 4px; font-size:14px; }
  .quote { background:#eef4f2; border-left:3px solid var(--brand); padding:10px 14px;
           margin:18px 0 26px; font-size:14px; color:#2c3a36; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:10px;
          padding:16px 18px; margin-bottom:12px; }
  .card.rec { border-color:#9fc9bd; box-shadow:0 0 0 3px #e6f2ee; }
  .card.fail { border-color:#e8c4a8; background:#fdf7f2; }
  .head { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; }
  h2 { font-size:16px; margin:0; font-weight:600; }
  .badge { font-size:11px; font-weight:500; color:#fff; background:var(--brand);
           padding:1px 7px; border-radius:20px; vertical-align:2px; }
  code { font-size:12px; color:var(--dim); background:#f2f5f6; padding:1px 6px; border-radius:4px;
         font-family:ui-monospace,Consolas,monospace; }
  .note { color:var(--dim); font-size:13px; margin:6px 0 12px; }
  .take { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
  .play { font:inherit; font-size:14px; padding:7px 16px; border-radius:7px; cursor:pointer;
          border:1px solid var(--line); background:#fbfcfc; color:var(--ink); min-width:190px; text-align:left; }
  .play:hover { background:#eef4f2; border-color:#9fc9bd; }
  .play.on { background:var(--brand); border-color:var(--brand); color:#fff; }
  .meta { font-size:12px; color:var(--dim); }
  .fail ul { margin:8px 0; padding-left:20px; font-size:13px; }
  footer { margin-top:28px; color:var(--dim); font-size:13px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>同桌的声音 · 试听</h1>
  <p class="sub">${VOICES.length} 个音色 × ${RATES.length} 档语速，同一句台词。点 ▶ 播，再点一下停。</p>
  <p class="sub">挑音色时先定一件事：<strong>同桌是男声还是女声</strong>。定完再在那一组里挑。</p>
  <div class="quote">${esc(SAMPLE)}</div>
  ${rows}
  ${failBlock}
  <footer>这是草稿页（public/voice/_try/），不进仓库、不进交付包。挑完告诉我音色 + 语速，我全量重跑。</footer>
</div>
<script>
  // 单例播放：点新的自动掐掉旧的，避免两条叠在一起分不清是谁
  var cur = null, curBtn = null;
  document.querySelectorAll('.play').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (curBtn === btn && cur && !cur.paused) { cur.pause(); cur.currentTime = 0; btn.classList.remove('on'); return; }
      if (cur) { cur.pause(); cur.currentTime = 0; }
      if (curBtn) curBtn.classList.remove('on');
      var a = new Audio(btn.dataset.src);
      a.play().catch(function (e) { alert('播不了：' + e.message); });
      a.onended = function () { btn.classList.remove('on'); };
      cur = a; curBtn = btn; btn.classList.add('on');
    });
  });
</script>
</body>
</html>`
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
