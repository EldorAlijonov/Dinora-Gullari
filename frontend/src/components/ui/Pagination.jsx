import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function Pagination({ page, totalPages, total, limit, onPageChange }) {
  if (!total || totalPages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-panel/70 px-4 py-3 text-sm text-slate-400">
      <span>
        {start}-{end} / {total} ta yozuv
      </span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" className="px-3 py-2" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Oldingi
        </Button>
        <span className="rounded-lg border border-white/10 bg-slate-950/30 px-3 py-2 font-semibold text-slate-200">
          {page} / {totalPages}
        </span>
        <Button variant="secondary" className="px-3 py-2" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Keyingi <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
