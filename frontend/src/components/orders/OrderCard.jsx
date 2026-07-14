import { CalendarClock, Pencil, Phone, Send, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CopyableText } from '../ui/CopyableText';
import { Select } from '../ui/Select';
import { orderStatuses, StatusBadge } from './StatusBadge';

export function OrderCard({ order, highlighted, onView, onEdit, onDelete, onStatusChange }) {
  return (
    <Card className={`cursor-pointer ${highlighted ? 'bg-amber-400/10 ring-1 ring-amber-300/30' : ''}`} onClick={() => onView(order)} title="Buyurtma tavsilotlarini ko'rish">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-100">
            <CopyableText value={order.customerName} label="Mijoz ismini nusxalash" />
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-400">{order.orderText}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-300">
        <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-sky-300" /> <CopyableText value={order.phone} label="Telefon raqamni nusxalash" /></p>
        <p className="flex items-center gap-2"><Send className="h-4 w-4 text-emerald-300" /> <CopyableText value={order.telegramPhone || order.phone} label="Telegram raqamni nusxalash" /></p>
        <p className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-rose-300" /> {formatDate(order.pickupDate)}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-slate-950/25 p-3">
        <div>
          <p className="text-xs text-slate-500">Umumiy summa</p>
          <p className="font-bold text-slate-100">{formatCurrency(order.totalAmount)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Qolgan qarz</p>
          <p className="font-bold text-rose-200">{formatCurrency(order.debtAmount)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2" onClick={(event) => event.stopPropagation()}>
        <Select value={order.status} onChange={(event) => onStatusChange(order, event.target.value)} className="w-full">
          {orderStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => onEdit(order)}><Pencil className="h-4 w-4" /> Edit</Button>
          <Button variant="danger" onClick={() => onDelete(order)}><Trash2 className="h-4 w-4" /> Delete</Button>
        </div>
      </div>
    </Card>
  );
}
