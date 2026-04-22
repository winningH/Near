import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 暗黑模式颜色
        dark: {
          bg: {
            primary: '#1a1a2e',
            secondary: '#16213e',
            sidebar: '#0f0f23',
            input: '#1e1e3a',
            hover: '#252545',
            active: '#2a2a50',
            code: '#0d1117',
          },
          text: {
            primary: '#e8e8f0',
            secondary: '#a0a0c0',
            muted: '#6a6a8e',
          },
          border: '#2a2a50',
          accent: {
            DEFAULT: '#6c63ff',
            hover: '#7b73ff',
            glow: 'rgba(108, 99, 255, 0.3)',
          },
        },
        // 明亮模式颜色
        light: {
          bg: {
            primary: '#ffffff',
            secondary: '#f8fafc',
            sidebar: '#f1f5f9',
            input: '#ffffff',
            hover: '#e2e8f0',
            active: '#cbd5e1',
            code: '#f1f5f9',
          },
          text: {
            primary: '#1e293b',
            secondary: '#475569',
            muted: '#94a3b8',
          },
          border: '#e2e8f0',
          accent: {
            DEFAULT: '#6366f1',
            hover: '#4f46e5',
            glow: 'rgba(99, 102, 241, 0.2)',
          },
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        mono: ['Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'typing': 'typing 1.4s infinite ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        typing: {
          '0%, 80%, 100%': { opacity: '0.25', transform: 'scale(0.85)' },
          '40%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
