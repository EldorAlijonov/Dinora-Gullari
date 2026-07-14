import { ArrowRight, Clock, WalletCards } from 'lucide-react';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CopyableText } from '../ui/CopyableText';
import { StatusBadge } from '../orders/StatusBadge';

function defaultMeta(order) {
  return (
    <>
      <span><CopyableText value={order.phone} label="Telefon raqamni nusxalash" /></span>
      <span>{formatDate(order.pickupDate)}</span>
    </>
  );
}

export function DashboardOrderList({ title, icon: Icon = Clock, orders = [], emptyText, actionLabel = "Ko'rish", onAction, renderMeta = defaultMeta, renderAside }) {
  return (
    <Card className="h-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/8 text-slate-200">
            <Icon className="h-4 w-4" />
          </div>
          <h2 className="text-base font-semibold text-slate-100">{title}</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-xs font-semibold text-slate-400">{orders.length}</span>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/10 bg-slate-950/25 p-6 text-center text-sm text-slate-500">{emptyText}</div>
      ) : (
        <div className="max-h-[35rem] space-y-3 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
          {orders.map((order) => (
            <div key={order._id} className="rounded-lg border border-white/10 bg-slate-950/25 p-3 transition hover:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-100">
                    <CopyableText value={order.customerName} label="Mijoz ismini nusxalash" />
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-400">{order.orderText}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {renderMeta(order)}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div>{renderAside?.(order)}</div>
                <Button variant="secondary" className="px-3 py-2" onClick={() => onAction?.(order)}>
                  {actionLabel === "To'lov kiritish" ? <WalletCards className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  {actionLabel}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function DebtAside({ order }) {
  return (
    <div className="text-xs text-slate-500">
      <span className="mr-3">Jami: {formatCurrency(order.totalAmount)}</span>
      <span className="mr-3">To'lov: {formatCurrency(order.prepaidAmount)}</span>
      <span className="font-semibold text-amber-200">Qarz: {formatCurrency(order.debtAmount)}</span>
    </div>
  );
}
