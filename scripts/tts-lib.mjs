/**
 * 豆包 TTS 2.0 —— 两个脚本共用的那一段
 *
 *   gen-voice.mjs      正式生成（107 句，内容寻址）
 *   voice-audition.mjs 试听小样（几个候选音色各来一句，挑完再全量跑）
 *
 * ── 为什么单独抽出来 ────────────────────────────────────────
 * 下面这些坑全是踩出来的，写在两个地方就一定会有一处先烂掉：
 *   · 鉴权头是 X-Api-App-Id / X-Api-Access-Key，不是 X-Api-Key
 *   · query 只能传 task_id，多带一个 user 会报 add unmapped key
 *   · additions 是 JSON **字符串**，不是对象
 * 所以只留一份，两边 import。
 */

import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const SUBMIT_URL = 'https://openspeech.bytedance.com/api/v3/tts/submit'
const QUERY_URL = 'https://openspeech.bytedance.com/api/v3/tts/query'
const UID = 'qinxiao-yuanbao-tongzhuo'

/** 文件名 = 文本的 SHA-1 前 16 位。见 gen-voice.mjs 顶部关于内容寻址的说明 */
export const clipName = text =>
  createHash('sha1').update(text, 'utf8').digest('hex').slice(0, 16) + '.mp3'

/** 从项目根目录的 .env.local 读凭据（已在 .gitignore 里）。密钥绝不写进代码 */
export async function loadCreds() {
  const envPath = join(ROOT, '.env.local')
  const env = {}
  if (existsSync(envPath)) {
    for (const line of (await readFile(envPath, 'utf8')).split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
  const appid = process.env.DOUBAO_TTS_APPID || env.DOUBAO_TTS_APPID || ''
  const key = process.env.DOUBAO_TTS_ACCESS_KEY || env.DOUBAO_TTS_ACCESS_KEY || ''
  if (!appid || !key) {
    console.error(
      '\n缺凭据。在项目根目录建一个 .env.local（已在 .gitignore 里），写两行：\n' +
        '  DOUBAO_TTS_APPID=<火山方舟控制台的 APPID>\n' +
        '  DOUBAO_TTS_ACCESS_KEY=<管线/scripts/doubao_tts_key.txt 里的 appkey>\n' +
        '（该文件在 短故事-抖音运营/管线/scripts/ 下，别复制进这个仓库）\n',
    )
    process.exit(1)
  }
  return { appid, key }
}

const headers = creds => ({
  'Content-Type': 'application/json',
  // ⚠️ 是 X-Api-App-Id / X-Api-Access-Key 这两个旧版头。
  //    换成 X-Api-Key 会直接报 Invalid X-Api-Key（踩过，别再改）
  'X-Api-App-Id': creds.appid,
  'X-Api-Access-Key': creds.key,
  // 2.0 才有 *_uranus_bigtts 和情感参数；1.0 未授权
  'X-Api-Resource-Id': 'seed-tts-2.0',
  'X-Api-Request-Id': createHash('md5').update(String(Math.random())).digest('hex'),
})

/**
 * POST 一个 JSON，带超时。
 *
 * ⚠️ fetch 默认**没有超时** —— 套接字卡住就是无限等，脚本一声不吭地挂在那儿，
 * 看起来跟「正在合成」一模一样。全量重跑要十几分钟，挂死一次很难察觉，
 * 所以这里一律 15 秒掐断，让失败变成一条看得见的错误。
 * 超时是可重试的失败（返回字符串，不抛异常），不会把整轮跑废。
 */
async function post(url, body, creds) {
  let r
  try {
    r = await fetch(url, {
      method: 'POST',
      headers: headers(creds),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    })
  } catch (e) {
    return { _http_error: e.name === 'TimeoutError' ? '超时(15s)' : e.message }
  }
  const txt = await r.text()
  if (!r.ok) return { _http_error: r.status, _body: txt.slice(0, 300) }
  try {
    return JSON.parse(txt)
  } catch {
    return { _bad_json: txt.slice(0, 300) }
  }
}

/**
 * 合成一句，写到 outPath。
 * @returns {Promise<string|null>} null = 成功；字符串 = 失败原因
 *
 * opts:
 *   speaker      音色 ID（必填）
 *   speechRate   [-50, 100]，100 = 2.0 倍速，0 = 常速
 *   emotion      情感名，如 'tender' / 'happy'；空字符串 = 不带情感
 *   emotionScale  1~5
 *   bitRate      码率，64000 或 32000
 */
export async function synthesize(text, outPath, creds, opts) {
  const { speaker, speechRate = 0, emotion = '', emotionScale = 3, bitRate = 64000 } = opts
  const req_params = {
    text,
    speaker,
    sample_rate: 24000,
    audio_params: { format: 'mp3', speech_rate: speechRate, loudness_rate: 0, bit_rate: bitRate },
  }
  if (emotion) {
    // additions 是**JSON 字符串**，不是对象
    req_params.additions = JSON.stringify({ emotion, emotion_scale: emotionScale })
  }

  const resp = await post(SUBMIT_URL, { user: { uid: UID }, req_params }, creds)
  if (resp._http_error) return `submit HTTP ${resp._http_error} ${resp._body}`
  if (![0, 20000000].includes(resp.code)) {
    return `submit code ${JSON.stringify(resp).slice(0, 200)}`
  }
  const taskId = resp.data?.task_id
  if (!taskId) return `没有 task_id：${JSON.stringify(resp).slice(0, 200)}`

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000))
    // ⚠️ query 只传 task_id。多传一个 user 键会报 add unmapped key user（踩过）
    const q = await post(QUERY_URL, { task_id: taskId }, creds)
    if (q._http_error) return `query HTTP ${q._http_error} ${q._body}`
    const url = q.data?.audio_url || q.data?.audio || ''
    if (url) {
      // 下载走的是 CDN，同样要超时兜底，理由见上面 post()
      let audio
      try {
        audio = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(30000),
        })
      } catch (e) {
        return `下载出错：${e.name === 'TimeoutError' ? '超时(30s)' : e.message}`
      }
      if (!audio.ok) return `下载失败 HTTP ${audio.status}`
      const buf = Buffer.from(await audio.arrayBuffer())
      if (buf.length < 500) return `音频太小（${buf.length} 字节），多半是空的`
      await writeFile(outPath, buf)
      return null // null = 成功
    }
    if ([3, 4, -1].includes(q.data?.task_status)) {
      return `合成失败：${JSON.stringify(q).slice(0, 200)}`
    }
  }
  return '等 audio_url 超时'
}
