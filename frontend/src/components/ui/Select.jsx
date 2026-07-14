import { ChevronDown } from 'lucide-react';
import { forwardRef } from 'react';

export const Select = forwardRef(function Select({ label, error, children, className = '', ...props }, ref) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="mb-1.5 block text-sm font-semibold text-slate-300">{label}</span>}
      <span className="relative block">
        <select
          ref={ref}
          className={`h-11 w-full appearance-none rounded-lg border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 pr-11 text-sm text-[#E5E7EB] outline-none transition hover:border-slate-600 focus:border-sky-300/80 focus:bg-slate-950/80 focus:ring-4 focus:ring-sky-400/10 active:bg-slate-950/80 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/70 disabled:text-slate-500 ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </span>
      {error && <span className="block pt-0.5 text-xs font-medium text-rose-300">{error}</span>}
    </label>
  );
});
