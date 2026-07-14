import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';

function parseAnimatedValue(value) {
  if (typeof value === 'number') return { target: value, prefix: '', suffix: '' };

  const text = String(value ?? 0);
  const match = text.match(/^([^0-9-]*)([-0-9\s,.]+)(.*)$/);
  if (!match) return { staticText: text };

  const target = Number(match[2].replace(/[^\d-]/g, ''));
  if (!Number.isFinite(target)) return { staticText: text };
  return { target, prefix: match[1], suffix: match[3] };
}

function AnimatedValue({ value }) {
  const config = useMemo(() => parseAnimatedValue(value), [value]);
  const [current, setCurrent] = useState(config.target ?? 0);

  useEffect(() => {
    if (config.staticText) return;

    let frameId;
    const start = performance.now();
    const duration = 900;
    const target = config.target || 0;

    const tick = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };

    setCurrent(0);
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [config]);

  if (config.staticText) return config.staticText;
  return `${config.prefix}${new Intl.NumberFormat('uz-UZ').format(current)}${config.suffix}`;
}

export function DashboardStatCard({ title, value, description, icon: Icon, accent, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`group rounded-lg border p-5 text-left shadow-panel backdrop-blur transition hover:-translate-y-1 hover:bg-white/8 ${accent.card}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-slate-100">
            <AnimatedValue value={value ?? 0} />
          </p>
        </div>
        <div className={`grid h-12 w-12 place-items-center rounded-lg ${accent.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className="mt-4 text-sm leading-5 text-slate-500">{description}</p>
      <div className={`mt-4 h-1 overflow-hidden rounded-full bg-slate-950/50`}>
        <div className={`h-full w-2/3 rounded-full transition-all group-hover:w-full ${accent.line}`} />
      </div>
    </motion.button>
  );
}
