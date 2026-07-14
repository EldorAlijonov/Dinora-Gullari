import { forwardRef } from 'react';

export const Textarea = forwardRef(function Textarea({ label, error, className = '', ...props }, ref) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="mb-1.5 block text-sm font-semibold text-slate-300">{label}</span>}
      <textarea
        ref={ref}
        className={`min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-[#E5E7EB] outline-none transition placeholder:text-[#94A3B8] hover:border-slate-600 focus:border-rose-300/80 focus:bg-slate-950/80 focus:ring-4 focus:ring-rose-400/10 active:bg-slate-950/80 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/70 disabled:text-slate-500 ${className}`}
        {...props}
      />
      {error && <span className="block pt-0.5 text-xs font-medium text-rose-300">{error}</span>}
    </label>
  );
});
