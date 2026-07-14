import { CalendarClock, CreditCard, FileText, Phone, Send, UserRound } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { CopyableText } from '../ui/CopyableText';
import { Modal } from '../ui/Modal';
import { StatusBadge } from './StatusBadge';

function DetailItem({ icon: Icon, label, value, copyable }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-4 w-4 text-rose-300" />
        {label}
      </p>
      <p className="break-words text-sm font-medium text-slate-100">
        {copyable ? <CopyableText value={value} label={`${label}ni nusxalash`} /> : value || '-'}
      </p>
    </div>
  );
}

export function OrderDetailsModal({ order, onClose }) {
  return (
    <Modal open={Boolean(order)} title="Buyurtma tavsilotlari" onClose={onClose} maxWidth="max-w-3xl">
      {order && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/30 p-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mijoz</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-100">
                <CopyableText value={order.customerName} label="Mijoz ismini nusxalash" />
              </h3>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <DetailItem icon={Phone} label="Aloqa telefoni" value={order.phone} copyable />
            <DetailItem icon={Send} label="Telegram telefoni" value={order.telegramPhone || order.phone} copyable />
            <DetailItem icon={CalendarClock} label="Yaratilgan sana" value={formatDate(order.createdAt)} />
            <DetailItem icon={CalendarClock} label="Olib ketish sanasi" value={formatDate(order.pickupDate)} />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <DetailItem icon={CreditCard} label="Umumiy summa" value={formatCurrency(order.totalAmount)} />
            <DetailItem icon={CreditCard} label="Oldindan to'lov" value={formatCurrency(order.prepaidAmount)} />
            <DetailItem icon={CreditCard} label="Qolgan qarz" value={formatCurrency(order.debtAmount)} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-slate-950/30 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <FileText className="h-4 w-4 text-sky-300" />
                Buyurtma matni
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{order.orderText || '-'}</p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-950/30 p-4">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <UserRound className="h-4 w-4 text-emerald-300" />
                Izoh
              </p>
              <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">{order.note || 'Izoh kiritilmagan'}</p>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
