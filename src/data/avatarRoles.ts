import type { AvatarRole } from '@/types'

/**
 * V2 · 虚拟形象角色库（定位说明 3.0-3）
 * 官方预设 8 个初中生形象，学生自选；换的是「外壳」，内核（引导逻辑）不变。
 * 不做自由生成形象、不做形象付费、不做形象社交。
 */
export const avatarRoles: AvatarRole[] = [
  {
    id: 'a1',
    name: '阿橙',
    style: '运动系',
    tone: '干脆利落，爱拿球场打比方',
    palette: { skin: '#f6d3b8', hair: '#2f2a26', jacket: '#ff9d4d', jacketDark: '#f3852c', accent: '#fff2e2' },
    extra: 'cap',
  },
  {
    id: 'a2',
    name: '小蓝',
    style: '文静系',
    tone: '语速慢，喜欢把步骤写清楚',
    palette: { skin: '#f7dcc4', hair: '#3b3733', jacket: '#59b0ff', jacketDark: '#2f90f5', accent: '#e8f4ff' },
    extra: 'glasses',
  },
  {
    id: 'a3',
    name: '豆豆',
    style: '幽默系',
    tone: '爱开小玩笑，气氛轻松',
    palette: { skin: '#f9d9bd', hair: '#4a3526', jacket: '#ffd45e', jacketDark: '#f0b929', accent: '#fff8e0' },
    extra: 'hoodie',
  },
  {
    id: 'a4',
    name: '青禾',
    style: '沉稳系',
    tone: '一步一确认，不催',
    palette: { skin: '#f4d2b6', hair: '#26221f', jacket: '#4fc08d', jacketDark: '#28a86a', accent: '#e6f8ef' },
    extra: 'glasses',
  },
  {
    id: 'a5',
    name: '小满',
    style: '元气系',
    tone: '正向反馈多，节奏偏快',
    palette: { skin: '#fbdcc6', hair: '#5a3a2a', jacket: '#ff8fa8', jacketDark: '#f2647f', accent: '#ffeef2' },
    extra: 'band',
  },
  {
    id: 'a6',
    name: '阿灰',
    style: '话少系',
    tone: '只在关键处提问，不多话',
    palette: { skin: '#f2d4bb', hair: '#1f1d1b', jacket: '#8a94a2', jacketDark: '#6b7683', accent: '#eef1f5' },
  },
  {
    id: 'a7',
    name: '星野',
    style: '好奇系',
    tone: '爱追问「为什么」，喜欢联系生活',
    palette: { skin: '#f7d6bd', hair: '#332a45', jacket: '#9b8cff', jacketDark: '#7a68f5', accent: '#efecff' },
    extra: 'hoodie',
  },
  {
    id: 'a8',
    name: '小野',
    style: '直球系',
    tone: '直接说重点，考前很好用',
    palette: { skin: '#f5d0b2', hair: '#2b2118', jacket: '#ff6f61', jacketDark: '#e9503f', accent: '#ffecea' },
    extra: 'cap',
  },
]
