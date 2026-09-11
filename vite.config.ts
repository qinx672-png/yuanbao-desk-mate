import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import fs from 'fs'
import path from 'path'

/** 分享用的中文文件名，双击即可打开 */
const SHARE_NAME = '初中数理成长导师-可交互原型.html'

/**
 * 单文件模式的收尾处理：
 * 1. 把 <script type="module" crossorigin> 降级为普通 <script>
 *    —— 部分浏览器在 file:// 协议下会拦截 module 脚本，降级后双击必定能打开
 * 2. 额外拷贝一份中文名的 html，方便直接发微信 / 邮件
 */
function shareableSingleFile(): Plugin {
  let outDir = 'dist-single'
  return {
    name: 'shareable-single-file',
    enforce: 'post',
    configResolved(c) {
      outDir = c.build.outDir
    },
    closeBundle() {
      const src = path.resolve(outDir, 'index.html')
      if (!fs.existsSync(src)) return

      // singlefile 插件在 generateBundle 阶段才把脚本内联进来，
      // 因此降级动作必须放在这里对最终产物执行
      let html = fs.readFileSync(src, 'utf-8')
      html = html.replace(/<script\s+type="module"\s+crossorigin\s*>/g, '<script>')
      fs.writeFileSync(src, html)

      const dest = path.resolve(outDir, SHARE_NAME)
      fs.copyFileSync(src, dest)
      const kb = (fs.statSync(dest).size / 1024).toFixed(0)
      console.log(`\n  可分享单文件已生成：${outDir}/${SHARE_NAME}  (${kb} kB)`)
      console.log('  双击即可打开，无需联网、无需安装任何环境\n')
    },
  }
}

/**
 * 两种构建产物：
 * - npm run build         → dist/        常规多文件，用于 Vercel / Netlify / GitHub Pages 等托管
 * - npm run build:single  → dist-single/ 单个 HTML（JS/CSS 全部内联），可直接发微信/邮件，双击即开
 */
export default defineConfig(({ mode }) => {
  const single = mode === 'single'

  return {
    plugins: [react(), ...(single ? [viteSingleFile(), shareableSingleFile()] : [])],
    base: './',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: single ? 'dist-single' : 'dist',
      emptyOutDir: true,
      ...(single
        ? {
            assetsInlineLimit: 100_000_000,
            cssCodeSplit: false,
            reportCompressedSize: false,
          }
        : {}),
    },
    server: {
      port: 5180,
      host: true,
    },
  }
})
