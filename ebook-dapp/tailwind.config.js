/** @type {import('tailwindcss').Config} */
import colors from 'tailwindcss/colors'; // 导入 Tailwind 默认颜色

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // 如果您有其他需要扫描的目录，可以添加在这里，例如：
    // "./public/**/*.html",
    // "./components/**/*.{js,ts,jsx,tsx}", // 如果组件在项目根目录的 components 文件夹下
  ],
  theme: {
    extend: {
      fontSize: {
        '2xl': ['24px', { lineHeight: '32px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'xs': ['12px', { lineHeight: '16px' }],
        '4xl': ['48px', { lineHeight: '56px' }],
      },
      colors: {
        ...colors, // 展开所有 Tailwind 默认颜色，以确保内置颜色（如 red-500, gray-900）可用
        // 将 src/index.css 中定义的 CSS 变量映射到 Tailwind 的颜色主题中
        // 确保这些名称与您的 CSS 变量名称一致，但移除了前缀 '--'
        // 使用 hsl() 包装是为了更好的兼容性，特别是当原始变量值是 oklch 时
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          // 根据 src/index.css，似乎没有 --destructive-foreground 变量
          // foreground: "hsl(var(--destructive-foreground))", 
        },
        "chart-1": "hsl(var(--chart-1))",
        "chart-2": "hsl(var(--chart-2))",
        "chart-3": "hsl(var(--chart-3))",
        "chart-4": "hsl(var(--chart-4))",
        "chart-5": "hsl(var(--chart-5))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: {
            DEFAULT: "hsl(var(--sidebar-primary))",
            foreground: "hsl(var(--sidebar-primary-foreground))",
          },
          accent: {
            DEFAULT: "hsl(var(--sidebar-accent))",
            foreground: "hsl(var(--sidebar-accent-foreground))",
          },
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      }
    },
  },
  plugins: [], // 您可能需要为 Shadcn UI 添加特定的 Tailwind 插件，例如 tailwindcss-animate
}
