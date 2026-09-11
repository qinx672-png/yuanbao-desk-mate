/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 学生端主色：明亮不刺眼的天青蓝，青少年友好
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8ecdff',
          400: '#59b0ff',
          500: '#2f90f5',
          600: '#1a72da',
          700: '#175bb0',
          800: '#194e8d',
          900: '#1a4374',
        },
        // 家长端主色：稳重深蓝
        parent: {
          50: '#f1f5f9',
          100: '#e2e8f0',
          500: '#3f5b8b',
          600: '#324a72',
          700: '#283c5e',
          800: '#1f2f4a',
        },
        // 正向激励：暖绿
        cheer: {
          50: '#eefbf3',
          100: '#d6f5e3',
          500: '#28a86a',
          600: '#1f8d58',
          700: '#186f46',
        },
        // 需巩固：暖橙（替代红色警告，避免打击学生）
        warm: {
          50: '#fff6ec',
          100: '#ffe9d2',
          500: '#f08a24',
          600: '#d4711a',
          700: '#a85614',
        },
        ink: {
          900: '#1d2430',
          700: '#3d4756',
          500: '#66717f',
          400: '#8a94a2',
          200: '#dde3ea',
          100: '#eef1f5',
          50: '#f7f9fc',
        },
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', '"Hiragino Sans GB"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // 基础字号提升至 16px，符合中小学生易读性要求
        base: ['16px', '1.7'],
        sm: ['14px', '1.65'],
        xs: ['12.5px', '1.6'],
        lg: ['18px', '1.65'],
        xl: ['20px', '1.5'],
      },
      boxShadow: {
        card: '0 2px 12px rgba(29,36,48,0.06)',
        pop: '0 8px 32px rgba(29,36,48,0.14)',
        phone: '0 24px 70px rgba(23,40,70,0.28)',
      },
      borderRadius: {
        xl2: '20px',
      },
      keyframes: {
        popIn: {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        cheerPulse: {
          '0%,100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
        },
        typing: {
          '0%,60%,100%': { opacity: '.25' },
          '30%': { opacity: '1' },
        },
        /* 手绘边框自己画出来：界面不是"弹出来"，是"被画出来" */
        drawLine: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        /* 逐字写出来（同桌往本子上写字） */
        writeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        /* 按住说话时的声波 */
        wave: {
          '0%,100%': { transform: 'scaleY(.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        /* 麦克风的呼吸圈：邀请孩子开口，但不催促 */
        breathe: {
          '0%,100%': { transform: 'scale(1)', opacity: '.5' },
          '50%': { transform: 'scale(1.35)', opacity: '0' },
        },
      },
      animation: {
        popIn: 'popIn .28s ease-out both',
        fadeUp: 'fadeUp .34s ease-out both',
        cheerPulse: 'cheerPulse 1.1s ease-in-out 2',
        typing: 'typing 1.2s infinite',
        drawLine: 'drawLine .68s ease-in-out both',
        writeIn: 'writeIn .18s ease-out both',
        wave: 'wave .85s ease-in-out infinite',
        breathe: 'breathe 2.4s ease-out infinite',
      },
    },
  },
  plugins: [],
}
