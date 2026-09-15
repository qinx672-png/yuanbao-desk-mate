import type { AvatarRole } from '@/types'

/**
 * V2 · 虚拟形象角色库（定位说明 3.0-3）
 * 官方预设 8 个初中生形象，学生自选；换的是「外壳」，内核（引导逻辑）不变。
 * 不做自由生成形象、不做形象付费、不做形象社交。
 *
 * ── 2026-09-13 改动：删掉每个形象的名字 ──────────────────────
 * 原来这 8 个各有名字（阿橙/小蓝/豆豆/青禾/小满/阿灰/星野/小野），
 * 学生选了谁，同桌就叫谁 —— 等于**内核跟着外壳走**。
 * 秦肖定：同桌只有一个名字「小元」（见 mockData.ts 的 TONGZHUO_NAME），
 * 形象退成纯外壳，所以 name 字段连同类型定义一起删了，
 * tone（说话方式）也早已不在界面上出现，一并删掉不留死数据。
 */
export const avatarRoles: AvatarRole[] = [
  {
    id: 'a1',
    style: '运动系',
    palette: { skin: '#f6d3b8', hair: '#2f2a26', jacket: '#ff9d4d', jacketDark: '#f3852c', accent: '#fff2e2' },
    extra: 'cap',
  },
  {
    id: 'a2',
    style: '文静系',
    palette: { skin: '#f7dcc4', hair: '#3b3733', jacket: '#59b0ff', jacketDark: '#2f90f5', accent: '#e8f4ff' },
    extra: 'glasses',
  },
  {
    id: 'a3',
    style: '幽默系',
    palette: { skin: '#f9d9bd', hair: '#4a3526', jacket: '#ffd45e', jacketDark: '#f0b929', accent: '#fff8e0' },
    extra: 'hoodie',
  },
  {
    id: 'a4',
    style: '沉稳系',
    palette: { skin: '#f4d2b6', hair: '#26221f', jacket: '#4fc08d', jacketDark: '#28a86a', accent: '#e6f8ef' },
    extra: 'glasses',
  },
  {
    id: 'a5',
    style: '元气系',
    palette: { skin: '#fbdcc6', hair: '#5a3a2a', jacket: '#ff8fa8', jacketDark: '#f2647f', accent: '#ffeef2' },
    extra: 'band',
  },
  {
    id: 'a6',
    style: '话少系',
    palette: { skin: '#f2d4bb', hair: '#1f1d1b', jacket: '#8a94a2', jacketDark: '#6b7683', accent: '#eef1f5' },
  },
  {
    id: 'a7',
    style: '好奇系',
    palette: { skin: '#f7d6bd', hair: '#332a45', jacket: '#9b8cff', jacketDark: '#7a68f5', accent: '#efecff' },
    extra: 'hoodie',
  },
  {
    id: 'a8',
    style: '直球系',
    palette: { skin: '#f5d0b2', hair: '#2b2118', jacket: '#ff6f61', jacketDark: '#e9503f', accent: '#ffecea' },
    extra: 'cap',
  },
]
