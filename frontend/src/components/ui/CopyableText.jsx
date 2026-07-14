import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

export function CopyButton({ value, label = 'Nusxalash', className = '' }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  const handleCopy = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const text = String(value || '').trim();
    if (!text || text === '-') return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Nusxalandi');
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Nusxalab bo'lmadi");
    }
  };

  const Icon = copied ? Check : Copy;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-400 transition hover:border-sky-300/40 hover:bg-sky-400/10 hover:text-sky-200 ${copied ? 'border-emerald-300/40 bg-emerald-400/10 text-emerald-200' : ''} ${className}`}
      title={label}
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

export function CopyableText({ value, children, className = '', textClassName = '', label }) {
  const text = value || children || '-';
  const canCopy = Boolean(String(value || '').trim()) && String(value || '').trim() !== '-';

  return (
    <span className={`inline-flex min-w-0 max-w-full items-center gap-1.5 ${className}`}>
      <span className={`min-w-0 truncate ${textClassName}`}>{children || text}</span>
      {canCopy && <CopyButton value={value} label={label} />}
    </span>
  );
}
