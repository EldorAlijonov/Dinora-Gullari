export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        ink: '#0F172A',
        inkSoft: '#111827',
        panel: '#1E293B',
        panelSoft: '#22304A',
        muted: '#94A3B8',
      },
      boxShadow: {
        glow: '0 22px 70px rgba(244, 114, 182, 0.14)',
        panel: '0 18px 60px rgba(0,0,0,0.22)',
      },
    },
  },
  plugins: [],
};
