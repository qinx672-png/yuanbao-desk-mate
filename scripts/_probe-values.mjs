/** 一次性小工具：把模板台词里的变量取值打印出来，好写进 voice-extra.json。
 *  用完可删。跑法：node scripts/_probe-values.mjs */
import { build } from 'esbuild'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(tmpdir(), 'md-probe.mjs')

await build({
  entryPoints: [join(ROOT, 'src', 'data', 'mockData.ts')],
  outfile: out,
  format: 'esm',
  bundle: true,
  platform: 'node',
  alias: { '@': join(ROOT, 'src') },
  logLevel: 'error',
})

const m = await import(pathToFileURL(out).href)
const wp = m.weakPoints[0]

console.log('student.name     =', JSON.stringify(m.student?.name))
console.log('wp.name          =', JSON.stringify(wp?.name))
console.log('wp.errorCount    =', wp?.errorCount)
console.log('onboardInterest  =', JSON.stringify(m.onboardInterest?.ask))
console.log('onboardAvatar    =', JSON.stringify(m.onboardAvatar?.ask))
console.log('--- 含 VERDICT / QUICK / ONBOARD 的导出 ---')
for (const k of Object.keys(m)) {
  if (/VERDICT|QUICK|ONBOARD/i.test(k)) console.log(' ', k, '=', JSON.stringify(m[k]).slice(0, 200))
}
console.log('--- 导出总览（找找有没有漏的台词数组）---')
console.log(Object.keys(m).join(', '))
