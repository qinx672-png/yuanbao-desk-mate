/**
 * 同桌的声音 —— 语速长样测试（定 speech_rate 用）
 *
 *   node scripts/voice-rate-test.mjs          只补缺的
 *   node scripts/voice-rate-test.mjs --force  全部重来
 *
 * 产出 public/voice/_try/rate.html
 *
 * ── 为什么不能只拿一句话试语速 ──────────────────────────────
 * 第一版试听每条只有 3~4 秒。4 秒能听出音色，**听不出语速** ——
 * 「太快了累」这种感觉是在连续听几分钟之后才出现的，一句话试不出来。
 * 所以这一版用**真实课文的连续 4 句**（≈144 字，25~35 秒），
 * 顺着自动播完，让他体验「跟着同桌听课」的真实节奏。
 *
 * 音色固定 VV（秦肖已定），只变 speech_rate 一个变量。
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, loadCreds, synthesize } from './tts-lib.mjs'

const TRY_DIR = join(ROOT, 'public', 'voice', '_try')
const FORCE = process.argv.slice(2).includes('--force')

const SPEAKER = 'zh_female_vv_uranus_bigtts'

/* ── 真实课文，连续 4 句 ─────────────────────────────────────
 * 从 public/voice/manifest.json 里挑的原文，一个字没改。
 * 必须是**真的台词**：临时编一段「大家好我是同桌」测不出讲题时的节奏，
 * 也测不出「破折号会不会拖半拍」这种只有真实文案才有的问题。
 */
const PASSAGE = [
  '这一串灯只有一条电线串着，中间被拧下一个灯泡，就等于电线断了个口子。电流还能通过去吗？',
  '这就是串联电路最关键的地方：电流只有一条路可以走，任何一处断开，整条电路都不通了。',
  '由此得到结论 —— 串联电路中，电流处处相等。',
  '这个结论要记牢。你用自己的话说一遍：串联电路里的电流有什么特点？',
]

/* 秦肖选了 +20。但 VV 是九个音色里最快的（+20 已到 6.3 字/秒，
 * 比原来的 4.5 快 40%，快过新闻联播），所以把 +0 和 +10 一起放进来对照，
 * 免得「调快了」变成「赶进度」。 */
const RATES = [0, 10, 20]

const esc = s =>
  String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

async function main() {
  await mkdir(TRY_DIR, { recursive: true })
  const creds = await loadCreds()

  const total = PASSAGE.reduce((n, t) => n + t.length, 0)
  console.log(`\n语速长样：音色 ${SPEAKER}`)
  console.log(`${RATES.length} 档语速 × ${PASSAGE.length} 句 = ${RATES.length * PASSAGE.length} 条`)
  console.log(`课文共 ${total} 字，每档连着听约 ${(total / 6).toFixed(0)}~${(total / 4.5).toFixed(0)} 秒\n`)

  const groups = []
  for (let ri = 0; ri < RATES.length; ri++) {
    const rate = RATES[ri]
    const items = []
    for (let si = 0; si < PASSAGE.length; si++) {
      const out = join(TRY_DIR, `rate${ri}_s${si}.mp3`)
      const tag = `[语速+${rate}] 第 ${si + 1}/${PASSAGE.length} 句`
      if (!FORCE && existsSync(out)) {
        console.log(`  ${tag} — 已有，跳过`)
        items.push({ file: `rate${ri}_s${si}.mp3`, text: PASSAGE[si] })
        continue
      }
      process.stdout.write(`  ${tag} `)
      const err = await synthesize(PASSAGE[si], out, creds, {
        speaker: SPEAKER,
        speechRate: rate,
        emotion: 'tender',
        emotionScale: 3,
      })
      if (err) {
        console.log(`✗ ${err}`)
      } else {
        console.log('✓')
        items.push({ file: `rate${ri}_s${si}.mp3`, text: PASSAGE[si] })
      }
    }
    groups.push({ rate, items })
  }

  await writeFile(join(TRY_DIR, 'rate.html'), render(groups, total), 'utf8')
  console.log(`\n打开这一页听：public/voice/_try/rate.html`)
  console.log('每档点一次 ▶，会**顺着播完 4 句**，别中途切 —— 要的就是连着听的感觉。\n')
}

function render(groups, total) {
  const rows = groups
    .map(
      (g, gi) => `
    <section class="card">
      <div class="head">
        <h2>语速 +${g.rate}</h2>
        <span class="meta">${g.items.length} 句 · 共 ${total} 字</span>
      </div>
      <button class="play" data-g="${gi}">▶ 连着听一遍</button>
      <span class="status" id="st${gi}"></span>
      <ol class="lines">${g.items.map(it => `<li>${esc(it.text)}</li>`).join('')}</ol>
    </section>`,
    )
    .join('')

  // 每档的播放列表塞进 data 属性，省一次请求
  const data = JSON.stringify(groups.map(g => g.items.map(i => i.file)))

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>同桌的声音 · 语速长样</title>
<style>
  :root { --ink:#1f2429; --dim:#5d6871; --line:#dde3e8; --bg:#f6f8f9; --card:#fff; --brand:#1f6f5c; }
  * { box-sizing:border-box; }
  body { margin:0; padding:32px 20px 64px; background:var(--bg); color:var(--ink);
         font:15px/1.7 -apple-system,"Segoe UI","Microsoft YaHei",sans-serif; }
  .wrap { max-width:820px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 6px; font-weight:600; }
  .sub { color:var(--dim); margin:0 0 4px; font-size:14px; }
  .warn { background:#fdf7f2; border-left:3px solid #b4531f; padding:10px 14px; margin:16px 0 24px;
          font-size:14px; color:#5b3a22; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:10px;
          padding:16px 18px; margin-bottom:12px; }
  .head { display:flex; align-items:baseline; gap:10px; }
  h2 { font-size:16px; margin:0; font-weight:600; }
  .meta { font-size:12px; color:var(--dim); }
  .play { font:inherit; font-size:14px; padding:8px 18px; border-radius:7px; cursor:pointer;
          border:1px solid var(--line); background:#fbfcfc; color:var(--ink); margin-top:10px; }
  .play:hover { background:#eef4f2; border-color:#9fc9bd; }
  .play.on { background:var(--brand); border-color:var(--brand); color:#fff; }
  .status { font-size:13px; color:var(--brand); margin-left:12px; }
  .lines { margin:12px 0 0; padding-left:22px; color:var(--dim); font-size:13px; line-height:1.8; }
  .lines li.cur { color:var(--ink); font-weight:600; }
  footer { margin-top:28px; color:var(--dim); font-size:13px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>同桌的声音 · 语速长样</h1>
  <p class="sub">音色固定 <code>${SPEAKER}</code>，只变语速。真实课文连续 4 句。</p>
  <div class="warn">
    <strong>听法：</strong>每档点一次 ▶，让它自己播完 4 句（约 25~35 秒），别中途切。
    语速的疲劳感是连着听才出来的 —— 单句试不出来，上一版就是栽在这儿。
    <br>判断标准不是「够不够快」，是<strong>「跟到最后一句时，还想不想听下一句」</strong>。
  </div>
  ${rows}
  <footer>草稿页（public/voice/_try/），不进仓库、不进交付包。</footer>
</div>
<script>
  var DATA = ${data};
  var cur = null, curBtn = null, curGi = -1, seq = 0;

  function stopAll() {
    if (cur) { cur.pause(); cur.onended = null; }
    if (curBtn) curBtn.classList.remove('on');
    if (curGi >= 0) {
      var ol = document.querySelectorAll('.lines')[curGi];
      if (ol) Array.prototype.forEach.call(ol.children, function (li) { li.classList.remove('cur'); });
      var st = document.getElementById('st' + curGi);
      if (st) st.textContent = '';
    }
    cur = null; curBtn = null; curGi = -1; seq++;
  }

  function playFrom(gi, idx) {
    var my = ++seq;
    var files = DATA[gi];
    var ol = document.querySelectorAll('.lines')[gi];
    var st = document.getElementById('st' + gi);
    if (idx >= files.length) {
      if (curBtn) curBtn.classList.remove('on');
      if (st) st.textContent = '✓ 播完了 —— 就到这儿，回想一下跟得累不累';
      Array.prototype.forEach.call(ol.children, function (li) { li.classList.remove('cur'); });
      cur = null; curGi = -1;
      return;
    }
    Array.prototype.forEach.call(ol.children, function (li, i) { li.classList.toggle('cur', i === idx); });
    if (st) st.textContent = '第 ' + (idx + 1) + ' / ' + files.length + ' 句…';
    var a = new Audio(files[idx]);
    a.play().catch(function (e) { if (st) st.textContent = '播不了：' + e.message; });
    a.onended = function () { if (my === seq) playFrom(gi, idx + 1); };
    cur = a; curGi = gi;
  }

  document.querySelectorAll('.play').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var gi = +btn.dataset.g;
      var wasMine = curGi === gi && cur && !cur.paused;
      stopAll();
      if (wasMine) return; // 再点一次 = 停
      seq++; curBtn = btn; btn.classList.add('on');
      playFrom(gi, 0);
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
