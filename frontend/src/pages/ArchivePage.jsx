import { CalendarDays, ChevronLeft, Gift, Search, ShoppingBag, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CopyableText } from '../components/ui/CopyableText';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { useOrdersQuery, useSalesQuery } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

const periodOptions = [
  ['day', 'Kunlik'],
  ['week', 'Haftalik'],
  ['month', 'Oylik'],
  ['year', 'Yillik'],
];

function inputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateRange(period, anchorValue) {
  const anchor = anchorValue ? new Date(anchorValue) : new Date();
  const start = new Date(anchor);
  const end = new Date(anchor);

  if (period === 'week') {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
  } else if (period === 'month') {
    start.setDate(1);
    end.setFullYear(start.getFullYear(), start.getMonth() + 1, 0);
  } else if (period === 'year') {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  }

  return { dateFrom: inputDate(start), dateTo: inputDate(end) };
}

export default function ArchivePage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('day');
  const [anchorDate, setAnchorDate] = useState(inputDate(new Date()));
  const [search, setSearch] = useState('');
  const range = useMemo(() => dateRange(period, anchorDate), [period, anchorDate]);
  const params = useMemo(() => ({ ...range, search: search || undefined }), [range, search]);
  const orders = useOrdersQuery(params);
  const sales = useSalesQuery(params);

  const orderItems = (orders.data || []).map((item) => ({ type: 'order', createdAt: item.createdAt, item }));
  const saleItems = (sales.data || []).map((item) => ({ type: 'sale', createdAt: item.createdAt, item }));
  const items = [...orderItems, ...saleItems].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const totalAmount = items.reduce((sum, row) => sum + (row.type === 'order' ? row.item.totalAmount : row.item.amount), 0);
  const totalDebt = items.reduce((sum, row) => sum + (row.item.debtAmount || 0), 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Buyurtmalar tarixi"
        description="Gul buyurtmalari va sovg'a/tovar sotuvlarini kunlik, haftalik, oylik yoki yillik ko'ring."
        action={(
          <Button variant="secondary" onClick={() => navigate('/')}>
            <ChevronLeft className="h-4 w-4" />
            Dashboardga qaytish
          </Button>
        )}
      />

      <Card>
        <div className="grid gap-3 xl:grid-cols-[auto_180px_1fr] xl:items-center">
          <div className="flex flex-wrap gap-2">
            {periodOptions.map(([value, label]) => (
              <Button key={value} variant={period === value ? 'primary' : 'secondary'} onClick={() => setPeriod(value)}>
                <CalendarDays className="h-4 w-4" /> {label}
              </Button>
            ))}
          </div>
          <Input type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} />
          <Input
            placeholder="Mijoz, telefon, buyurtma yoki tovar nomi"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            leftElement={<Search className="h-4 w-4 text-slate-500" />}
            rightElement={search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
                title="Qidiruvni tozalash"
                aria-label="Qidiruvni tozalash"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Summary label="Davr" value={`${range.dateFrom} - ${range.dateTo}`} />
          <Summary label="Yozuvlar" value={items.length} />
          <Summary label="Umumiy summa" value={formatCurrency(totalAmount)} />
          <Summary label="Qolgan qarz" value={formatCurrency(totalDebt)} danger />
        </div>
      </Card>

      <Card className="overflow-x-auto">
        {orders.isLoading || sales.isLoading ? (
          <div className="p-8 text-center text-slate-400">Yuklanmoqda...</div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full min-w-[1060px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                {['#', 'Turi', 'Sana', 'Mijoz', 'Telefon', 'Nomi', 'Umumiy', 'Qarz', 'Status'].map((heading) => (
                  <th key={heading} className="px-3 py-3">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {items.map((row, index) => (
                <ArchiveRow key={`${row.type}-${row.item._id}`} row={row} index={index} />
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function ArchiveRow({ row, index }) {
  const item = row.item;
  const isOrder = row.type === 'order';
  const name = isOrder ? item.customerName : item.customerName || '-';
  const phone = item.phone || item.telegramPhone || '-';
  const title = isOrder ? item.orderText : item.productName || 'Sovga/tovar';
  const amount = isOrder ? item.totalAmount : item.amount;
  const status = isOrder ? item.status : item.paymentType;

  return (
    <tr className="transition hover:bg-white/5">
      <td className="px-3 py-3 font-bold text-slate-500">{index + 1}</td>
      <td className="px-3 py-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-bold ${isOrder ? 'border-rose-300/20 bg-rose-400/10 text-rose-100' : 'border-sky-300/20 bg-sky-400/10 text-sky-100'}`}>
          {isOrder ? <ShoppingBag className="h-3.5 w-3.5" /> : <Gift className="h-3.5 w-3.5" />}
          {isOrder ? 'Gul' : 'Sovga/tovar'}
        </span>
      </td>
      <td className="px-3 py-3 text-slate-400">{formatDate(item.createdAt)}</td>
      <td className="px-3 py-3 font-semibold text-slate-100">
        <CopyableText value={name} label="Mijoz ismini nusxalash" />
      </td>
      <td className="px-3 py-3 text-slate-300">
        <CopyableText value={phone} label="Telefon raqamni nusxalash" />
      </td>
      <td className="max-w-xs px-3 py-3 text-slate-300">
        <span className="line-clamp-2">{title}</span>
      </td>
      <td className="px-3 py-3 font-bold text-slate-100">{formatCurrency(amount)}</td>
      <td className="px-3 py-3 font-bold text-amber-200">{formatCurrency(item.debtAmount || 0)}</td>
      <td className="px-3 py-3 text-slate-300">{status}</td>
    </tr>
  );
}

function Summary({ label, value, danger }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/25 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className={`mt-1 font-bold ${danger ? 'text-amber-200' : 'text-slate-100'}`}>{value}</p>
    </div>
  );
}
