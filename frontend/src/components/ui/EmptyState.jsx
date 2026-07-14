import { Inbox } from 'lucide-react';

export function EmptyState({ title = 'Ma’lumot topilmadi', text = 'Filtrlarni o‘zgartiring yoki yangi yozuv qo‘shing.' }) {
  return (
    <div className="rounded-lg border border-white/10 bg-panel/70 p-10 text-center shadow-panel">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-white/8 text-slate-300">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-bold text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{text}</p>
    </div>
  );
}
