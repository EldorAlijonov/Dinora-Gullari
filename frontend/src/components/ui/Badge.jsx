const variants = {
  rose: 'border-rose-300/20 bg-rose-400/10 text-rose-200',
  emerald: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200',
  sky: 'border-sky-300/20 bg-sky-400/10 text-sky-200',
  violet: 'border-violet-300/20 bg-violet-400/10 text-violet-200',
  slate: 'border-white/10 bg-white/8 text-slate-300',
};

export function Badge({ children, variant = 'slate', className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
