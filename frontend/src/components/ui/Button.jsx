import { Loader2 } from 'lucide-react';

export function Button({ children, loading, className = '', variant = 'primary', ...props }) {
  const styles = {
    primary: 'bg-gradient-to-r from-rose-400 to-fuchsia-500 text-white shadow-glow hover:from-rose-300 hover:to-fuchsia-400 active:scale-[0.98]',
    secondary: 'border border-white/10 bg-white/8 text-slate-200 hover:bg-white/12 active:scale-[0.98]',
    danger: 'bg-rose-500/90 text-white hover:bg-rose-500 active:scale-[0.98]',
    ghost: 'bg-transparent text-slate-300 hover:bg-white/10 active:scale-[0.98]',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
