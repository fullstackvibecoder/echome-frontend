import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0A0E17',
          secondary: '#0F1419',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#E2E8F0',
          tertiary: '#94A3B8',
          muted: '#64748B',
        },
        accent: {
          DEFAULT: '#6366F1',
          light: '#818CF8',
          dark: '#4F46E5',
        },
        border: {
          DEFAULT: '#1E293B',
          light: '#334155',
        },
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'serif'],
        body: ['var(--font-karla)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
