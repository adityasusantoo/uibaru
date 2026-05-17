import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#071426',
        'bg-secondary': '#0B1E35',
        'surface': 'rgba(15, 35, 60, 0.72)',
        'accent-blue': '#3B82F6',
        'neon-cyan': '#38BDF8',
        'text-primary': '#EAF4FF',
        'text-secondary': '#93A4C3',
      },
      fontFamily: {
        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
