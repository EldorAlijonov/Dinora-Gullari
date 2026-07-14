import { Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CopyableText } from '../ui/CopyableText';
import { Select } from '../ui/Select';
import { orderStatuses, StatusBadge } from './StatusBadge';

export function OrdersTable({ orders, highlightId, onView, onEdit, onDelete, onStatusChange }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-left text-sm">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            {['#', 'Mijoz', 'Aloqa tel', 'Telegram tel', 'Gul buyurtmasi', 'Summa', 'Qarz', 'Yaratilgan', 'Olib ketish', 'Status', 'Amallar'].map((heading) => (
              <th key={heading} className="px-3 py-3">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {orders.map((order, index) => (
            <tr
              key={order._id}
              className={`cursor-pointer transition hover:bg-white/5 ${order._id === highlightId ? 'bg-amber-400/10 ring-1 ring-amber-300/30' : ''}`}
              onClick={() => onView(order)}
              title="Buyurtma tavsilotlarini ko'rish"
            >
              <td className="px-3 py-3 font-bold text-slate-500">{index + 1}</td>
              <td className="px-3 py-3 font-bold text-slate-100">
                <CopyableText value={order.customerName} label="Mijoz ismini nusxalash" />
              </td>
              <td className="px-3 py-3 text-slate-300">
                <CopyableText value={order.phone} label="Telefon raqamni nusxalash" />
              </td>
              <td className="px-3 py-3 text-slate-300">
                <CopyableText value={order.telegramPhone || order.phone} label="Telegram raqamni nusxalash" />
              </td>
              <td className="max-w-xs px-3 py-3 text-slate-300">{order.orderText}</td>
              <td className="px-3 py-3 text-slate-200">{formatCurrency(order.totalAmount)}</td>
              <td className="px-3 py-3 text-rose-200">{formatCurrency(order.debtAmount)}</td>
              <td className="px-3 py-3 text-slate-400">{formatDate(order.createdAt)}</td>
              <td className="px-3 py-3 text-slate-300">{formatDate(order.pickupDate)}</td>
              <td className="px-3 py-3">
                <div className="grid min-w-[260px] grid-cols-[72px_168px] items-center gap-3" onClick={(event) => event.stopPropagation()}>
                  <StatusBadge status={order.status} />
                  <Select value={order.status} onChange={(event) => onStatusChange(order, event.target.value)} className="w-[168px] py-1.5">
                    {orderStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </Select>
                </div>
              </td>
              <td className="px-3 py-3">
                <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                  <Button variant="secondary" onClick={() => onEdit(order)} className="px-3"><Pencil className="h-4 w-4" /></Button>
                  <Button variant="danger" onClick={() => onDelete(order)} className="px-3"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
