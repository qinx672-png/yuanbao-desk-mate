/// <reference types="vite/client" />

/*
 * Vite 的标准类型声明（脚手架本来就会生成，这个项目当初漏了）。
 * 有它才有 import.meta.env 的类型 —— voiceClip.ts 用 import.meta.env.DEV
 * 判断「是不是开发模式」，没这个文件 tsc 会报 env 不存在。
 */
