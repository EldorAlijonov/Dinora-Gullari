import { CalendarDays, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { formatDate } from '../../utils/formatDate';

const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const weekDays = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'];

function dateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function buildDays(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function DateTimePicker({ label, value, onChange, error, minDate }) {
  const selectedDate = value ? new Date(value) : null;
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate && !Number.isNaN(selectedDate.getTime()) ? selectedDate : new Date());
  const [time, setTime] = useState(() => {
    const date = selectedDate && !Number.isNaN(selectedDate.getTime()) ? selectedDate : new Date();
    return { hour: String(date.getHours()).padStart(2, '0'), minute: String(date.getMinutes()).padStart(2, '0') };
  });

  const days = useMemo(() => buildDays(viewDate), [viewDate]);
  const selectedKey = selectedDate && !Number.isNaN(selectedDate.getTime()) ? dateKey(selectedDate) : '';
  const minDay = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : null;

  useEffect(() => {
    const nextDate = value ? new Date(value) : null;
    if (nextDate && !Number.isNaN(nextDate.getTime())) {
      setTime({ hour: String(nextDate.getHours()).padStart(2, '0'), minute: String(nextDate.getMinutes()).padStart(2, '0') });
      setViewDate(nextDate);
    }
  }, [value]);

  const commit = (date, nextTime = time) => {
    const next = new Date(date);
    next.setHours(Number(nextTime.hour), Number(nextTime.minute), 0, 0);
    if (minDate && next.getTime() < minDate.getTime()) return;
    onChange(next.toISOString());
  };

  const changeMonth = (offset) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const changeTime = (part, nextValue) => {
    const nextTime = { ...time, [part]: nextValue };
    setTime(nextTime);
    if (selectedDate && !Number.isNaN(selectedDate.getTime())) commit(selectedDate, nextTime);
  };

  return (
    <div className="relative">
      {label && <span className="mb-1.5 block text-sm font-semibold text-slate-300">{label}</span>}
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-slate-950/35 px-3.5 py-2.5 text-left text-sm text-slate-100 outline-none transition hover:border-rose-300/40 focus:border-rose-300/70 focus:ring-4 focus:ring-rose-400/10"
        onClick={() => setOpen((state) => !state)}
      >
        <span>{selectedDate && !Number.isNaN(selectedDate.getTime()) ? formatDate(selectedDate) : 'Kun, oy, yil va vaqt tanlang'}</span>
        <CalendarDays className="h-4 w-4 text-rose-300" />
      </button>
      {error && <span className="mt-1 block text-xs font-medium text-rose-300">{error}</span>}

      {open && (
        <div className="absolute z-30 mt-2 w-full min-w-[320px] rounded-lg border border-white/10 bg-panel/95 p-3 shadow-panel backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-white/8 hover:text-rose-200" onClick={() => changeMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-bold text-slate-100">{months[viewDate.getMonth()]} {viewDate.getFullYear()}</p>
            <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-white/8 hover:text-rose-200" onClick={() => changeMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500">
            {weekDays.map((day) => <span key={day} className="py-1">{day}</span>)}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isCurrentMonth = day.getMonth() === viewDate.getMonth();
              const isSelected = dateKey(day) === selectedKey;
              const isPast = minDay && new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() < minDay.getTime();
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={isPast}
                  className={`h-9 rounded-md text-sm font-semibold transition disabled:cursor-not-allowed disabled:text-slate-700 ${isSelected ? 'bg-rose-400 text-white shadow-glow' : isCurrentMonth ? 'text-slate-200 hover:bg-white/8 hover:text-rose-200' : 'text-slate-600 hover:bg-white/5'}`}
                  onClick={() => commit(day)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3 text-sm font-semibold text-slate-200">
            <Clock className="h-4 w-4 text-emerald-300" />
            <select className="rounded-md border border-white/10 bg-slate-950/60 px-2 py-1 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-300/20" value={time.hour} onChange={(e) => changeTime('hour', e.target.value)}>
              {Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0')).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
            </select>
            <span>:</span>
            <select className="rounded-md border border-white/10 bg-slate-950/60 px-2 py-1 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-300/20" value={time.minute} onChange={(e) => changeTime('minute', e.target.value)}>
              {Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0')).map((minute) => <option key={minute} value={minute}>{minute}</option>)}
            </select>
            <button type="button" className="ml-auto rounded-md bg-white/10 px-3 py-1 text-xs font-bold text-emerald-100 hover:bg-white/15" onClick={() => setOpen(false)}>
              Tayyor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
