import { zodResolver } from '@hookform/resolvers/zod';
import { Bell, ChevronLeft, ExternalLink, Grid2X2, List, Send, WalletCards, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/orders/StatusBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { CopyableText } from '../components/ui/CopyableText';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { useDebtsQuery, useDebtsStatsQuery, usePayOrderDebtMutation, usePaySaleDebtMutation, useSendOrderDebtReminderMutation, useSendSaleDebtReminderMutation } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

const paymentTypes = [
  ['cash', 'Naqd'],
  ['card', 'Karta'],
  ['click', 'Click'],
  ['payme', 'Payme'],
];

const schema = z.object({
  amount: z.coerce.number().min(1, 'To‘lov miqdori 0 dan katta bo‘lishi kerak'),
  paymentType: z.string().min(1, 'To‘lov turini tanlang'),
});

function debtTargetUrl(debt) {
  return debt.debtSource === 'gift' ? `/sales?highlight=${debt._id}` : `/orders?highlight=${debt._id}`;
}

function debtKey(debt) {
  return `${debt.debtSource}-${debt._id}`;
}

export default function DebtsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [params, setParams] = useState(() => ({
    status: searchParams.get('status') || 'active',
    search: searchParams.get('search') || undefined,
    source: searchParams.get('source') || 'all',
  }));
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('debtsViewMode') || 'table');
  const [paying, setPaying] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);
  const [pendingReminder, setPendingReminder] = useState(null);
  const [pendingBulkReminder, setPendingBulkReminder] = useState(null);
  const [selectedDebtIds, setSelectedDebtIds] = useState(() => new Set());
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const { data = [], isLoading, isError, refetch } = useDebtsQuery(params);
  const { data: stats } = useDebtsStatsQuery();
  const [payOrderDebt, orderPayState] = usePayOrderDebtMutation();
  const [paySaleDebt, salePayState] = usePaySaleDebtMutation();
  const [sendReminder] = useSendOrderDebtReminderMutation();
  const [sendSaleReminder] = useSendSaleDebtReminderMutation();
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { amount: '', paymentType: 'cash' } });
  const paymentAmount = Number(form.watch('amount') || 0);
  const remainingAfterPayment = Math.max((paying?.debtAmount || 0) - paymentAmount, 0);
  const paymentTooMuch = Boolean(paying && paymentAmount > paying.debtAmount);
  const returnTo = location.state?.returnTo || (location.state?.fromDashboard ? '/' : null);
  const returnLabel = location.state?.returnLabel || (returnTo === '/' ? 'Dashboardga qaytish' : 'Orqaga qaytish');
  const debtsReturnPath = `/debts?status=${encodeURIComponent(params.status || 'active')}&source=${encodeURIComponent(params.source || 'all')}${params.search ? `&search=${encodeURIComponent(params.search)}` : ''}`;

  useEffect(() => {
    localStorage.setItem('debtsViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    setParams((current) => ({
      ...current,
      status: searchParams.get('status') || current.status || 'active',
      source: searchParams.get('source') || current.source || 'all',
      search: searchParams.get('search') || undefined,
    }));
  }, [searchParams]);

  useEffect(() => {
    setSelectedDebtIds((current) => {
      const visibleKeys = new Set(data.map(debtKey));
      const next = new Set([...current].filter((key) => visibleKeys.has(key)));
      return next.size === current.size ? current : next;
    });
  }, [data]);

  useEffect(() => {
    if (isError) toast.error('Qarzdorlik ma’lumotlarini yuklashda xatolik');
  }, [isError]);

  const openPayment = (debt) => {
    setPaying(debt);
    form.reset({ amount: '', paymentType: 'cash' });
  };

  const submitPayment = async (values) => {
    if (Number(values.amount) > paying.debtAmount) {
      form.setError('amount', { message: 'To‘lov qolgan qarzdan katta bo‘lishi mumkin emas' });
      return;
    }
    setPendingPayment({ debt: paying, values });
  };

  const confirmPayment = async () => {
    try {
      const { debt, values } = pendingPayment;
      const payload = { id: debt._id, amount: Number(values.amount), paymentType: values.paymentType };
      const result = debt.debtSource === 'gift' ? await paySaleDebt(payload).unwrap() : await payOrderDebt(payload).unwrap();
      toast.success(result.debtAmount === 0 ? 'Qarzdorlik to‘liq yopildi' : 'To‘lov muvaffaqiyatli qabul qilindi');
      setPendingPayment(null);
      setPaying(null);
      refetch();
    } catch {
      toast.error('Xatolik yuz berdi. Qayta urinib ko‘ring');
    }
  };

  const remind = async (debt) => {
    setPendingReminder(debt);
  };

  const sendDebtReminderFor = (debt) => (
    debt.debtSource === 'gift' ? sendSaleReminder(debt._id).unwrap() : sendReminder(debt._id).unwrap()
  );

  const confirmReminder = async () => {
    setIsSendingReminder(true);
    try {
      await sendDebtReminderFor(pendingReminder);
      toast.success('Telegram eslatma yuborildi');
      setPendingReminder(null);
    } catch {
      toast.error('Xatolik yuz berdi. Qayta urinib ko‘ring');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const remindableDebts = data.filter((debt) => debt.debtAmount > 0);
  const selectedDebts = remindableDebts.filter((debt) => selectedDebtIds.has(debtKey(debt)));

  const toggleDebtSelection = (debt) => {
    setSelectedDebtIds((current) => {
      const next = new Set(current);
      const key = debtKey(debt);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedDebtIds(new Set(remindableDebts.map(debtKey)));
  };

  const clearSelection = () => {
    setSelectedDebtIds(new Set());
  };

  const openBulkReminder = (mode) => {
    const debts = mode === 'all' ? remindableDebts : selectedDebts;
    if (debts.length === 0) {
      toast.error(mode === 'all' ? 'Eslatma yuboriladigan aktiv qarzdor yoвЂq' : 'Avval qarzdorlarni tanlang');
      return;
    }
    setPendingBulkReminder({ mode, debts });
  };

  const confirmBulkReminder = async () => {
    const debts = pendingBulkReminder?.debts || [];
    setIsSendingReminder(true);
    try {
      await Promise.all(debts.map(sendDebtReminderFor));
      toast.success(`${debts.length} ta qarzdorga eslatma yuborildi`);
      setPendingBulkReminder(null);
      if (pendingBulkReminder?.mode === 'selected') clearSelection();
    } catch {
      toast.error('BaвЂ™zi eslatmalar yuborilmadi. Qayta urinib koвЂring');
    } finally {
      setIsSendingReminder(false);
    }
  };

  const isPaying = orderPayState.isLoading || salePayState.isLoading;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Qarzdorlik"
        description="Gul buyurtmalari va sovg‘a/tovar nasiyalari bo‘yicha umumiy qarzdorlik."
        action={returnTo && (
          <Button variant="secondary" onClick={() => navigate(returnTo)}>
            <ChevronLeft className="h-4 w-4" />
            {returnLabel}
          </Button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-slate-400">Aktiv qarzlar</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">{stats?.active || 0}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-400">Gul / sovg‘a qarzi</p>
          <p className="mt-2 text-lg font-bold text-slate-100">{formatCurrency(stats?.flowersDebt || 0)} / {formatCurrency(stats?.giftsDebt || 0)}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-400">Umumiy qolgan qarz</p>
          <p className="mt-2 text-2xl font-bold text-amber-200">{formatCurrency(stats?.totalDebt || 0)}</p>
        </Card>
      </div>

      <Card>
        <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto] xl:items-center">
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              placeholder="Mijoz, telefon, buyurtma yoki tovar"
              value={params.search || ''}
              onChange={(event) => setParams((current) => ({ ...current, search: event.target.value || undefined }))}
              rightElement={params.search && (
                <button
                  type="button"
                  onClick={() => setParams((current) => ({ ...current, search: undefined }))}
                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
                  title="Qidiruvni tozalash"
                  aria-label="Qidiruvni tozalash"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            />
            <Select value={params.status || 'active'} onChange={(event) => setParams((current) => ({ ...current, status: event.target.value }))}>
              <option value="active">Aktiv</option>
              <option value="paid">Yopilgan</option>
            </Select>
            <Select value={params.source || 'all'} onChange={(event) => setParams((current) => ({ ...current, source: event.target.value }))}>
              <option value="all">Umumiy ro‘yxat</option>
              <option value="flower">Faqat gul buyurtmalari</option>
              <option value="gift">Faqat sovg‘a/tovarlar</option>
            </Select>
          </div>

          <div className="flex rounded-lg border border-white/10 bg-slate-950/30 p-1">
            <Button variant={viewMode === 'table' ? 'primary' : 'ghost'} className="px-3" onClick={() => setViewMode('table')}><List className="h-4 w-4" /> Ro‘yxat</Button>
            <Button variant={viewMode === 'card' ? 'primary' : 'ghost'} className="px-3" onClick={() => setViewMode('card')}><Grid2X2 className="h-4 w-4" /> Card</Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <Button variant="secondary" disabled={remindableDebts.length === 0 || isSendingReminder} onClick={selectAllVisible}>
            Barchasini tanlash
          </Button>
          <Button variant="secondary" disabled={selectedDebts.length === 0 || isSendingReminder} onClick={() => openBulkReminder('selected')}>
            <Send className="h-4 w-4" />
            Tanlanganlarga yuborish ({selectedDebts.length})
          </Button>
          <Button disabled={remindableDebts.length === 0 || isSendingReminder} loading={isSendingReminder && pendingBulkReminder?.mode === 'all'} onClick={() => openBulkReminder('all')}>
            <Bell className="h-4 w-4" />
            Barchasiga yuborish ({remindableDebts.length})
          </Button>
          {selectedDebts.length > 0 && (
            <Button variant="ghost" disabled={isSendingReminder} className="px-3" onClick={clearSelection}>
              <X className="h-4 w-4" />
              Tanlovni tozalash
            </Button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <div className="rounded-lg border border-white/10 bg-panel/70 p-8 text-center text-slate-400">Yuklanmoqda...</div>
      ) : data.length === 0 ? (
        <EmptyState title="Qarzdorlik mavjud emas" text="" />
      ) : viewMode === 'table' ? (
        <DebtsTable debts={data} selectedDebtIds={selectedDebtIds} onToggleSelect={toggleDebtSelection} onView={setViewing} onPay={openPayment} onRemind={remind} navigate={navigate} returnTo={debtsReturnPath} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((debt, index) => (
            <DebtCard key={`${debt.debtSource}-${debt._id}`} debt={debt} index={index} selected={selectedDebtIds.has(debtKey(debt))} onToggleSelect={toggleDebtSelection} onView={setViewing} onPay={openPayment} onRemind={remind} navigate={navigate} returnTo={debtsReturnPath} />
          ))}
        </div>
      )}

      <DebtDetailsModal debt={viewing} onClose={() => setViewing(null)} onPay={openPayment} />

      <Modal open={Boolean(paying)} title="Qarzga to‘lov kiritish" onClose={() => setPaying(null)} maxWidth="max-w-md">
        <form onSubmit={form.handleSubmit(submitPayment)} className="space-y-4">
          <div className="rounded-lg border border-amber-300/20 bg-amber-400/10 p-3">
            <p className="text-sm text-slate-300">Qolgan qarz</p>
            <p className="mt-1 text-xl font-bold text-amber-100">{formatCurrency(paying?.debtAmount || 0)}</p>
          </div>
          <Input label="To‘lov summasi" type="number" min="1" error={form.formState.errors.amount?.message} {...form.register('amount')} />
          <div className={`rounded-lg border p-3 ${paymentTooMuch ? 'border-rose-300/30 bg-rose-400/10' : remainingAfterPayment > 0 ? 'border-amber-300/20 bg-amber-400/10' : 'border-emerald-300/20 bg-emerald-400/10'}`}>
            <p className="text-sm text-slate-300">To‘lovdan keyin qoladi</p>
            <p className={`mt-1 text-xl font-bold ${paymentTooMuch ? 'text-rose-200' : remainingAfterPayment > 0 ? 'text-amber-100' : 'text-emerald-100'}`}>
              {paymentTooMuch ? 'To‘lov qarzdan katta' : formatCurrency(remainingAfterPayment)}
            </p>
          </div>
          <Button type="button" variant="secondary" className="w-full" onClick={() => form.setValue('amount', paying?.debtAmount || 0, { shouldValidate: true })}>
            Qolgan qarzni to‘liq yopish
          </Button>
          <Select label="To‘lov turi" error={form.formState.errors.paymentType?.message} {...form.register('paymentType')}>
            {paymentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Button loading={isPaying} disabled={paymentTooMuch} className="w-full">{isPaying ? 'Saqlanmoqda...' : 'To‘lovni saqlash'}</Button>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(pendingPayment)}
        title="To‘lovni tasdiqlash"
        description={`${formatCurrency(Number(pendingPayment?.values?.amount || 0))} miqdoridagi to‘lovni saqlashni tasdiqlaysizmi?`}
        loading={isPaying}
        onClose={() => setPendingPayment(null)}
        onConfirm={confirmPayment}
      />

      <ConfirmModal
        open={Boolean(pendingReminder)}
        title="Telegram eslatma yuborish"
        description={`${pendingReminder?.customerName || 'Mijoz'}ga qarzdorlik eslatmasini yuborishni tasdiqlaysizmi?`}
        loading={isSendingReminder}
        onClose={() => setPendingReminder(null)}
        onConfirm={confirmReminder}
      />

      <ConfirmModal
        open={Boolean(pendingBulkReminder)}
        title="Telegram eslatmalar yuborish"
        description={`${pendingBulkReminder?.debts?.length || 0} ta qarzdorga qarzdorlik eslatmasini yuborishni tasdiqlaysizmi?`}
        loading={isSendingReminder}
        onClose={() => setPendingBulkReminder(null)}
        onConfirm={confirmBulkReminder}
      />
    </div>
  );
}

function SourceBadge({ debt }) {
  const label = debt.debtSource === 'gift' ? 'Sovg‘a/tovar' : 'Gul';
  return (
    <span className={`inline-flex min-w-[76px] items-center justify-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${debt.debtSource === 'gift' ? 'border-sky-300/20 bg-sky-400/10 text-sky-200' : 'border-rose-300/20 bg-rose-400/10 text-rose-200'}`}>
      {label}
    </span>
  );
}

function DebtsTable({ debts, selectedDebtIds, onToggleSelect, onView, onPay, onRemind, navigate, returnTo }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[1380px] text-left text-sm">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-3">Tanlash</th>
            {['#', 'Turi', 'Mijoz', 'Telefon', 'Nomi', 'Umumiy', 'To‘langan', 'Qolgan qarz', 'Sana', 'Status', 'Amallar'].map((heading) => (
              <th key={heading} className="px-3 py-3">{heading}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {debts.map((debt, index) => (
            <tr key={`${debt.debtSource}-${debt._id}`} className="cursor-pointer transition hover:bg-white/5" onClick={() => onView(debt)}>
              <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedDebtIds.has(debtKey(debt))}
                  disabled={debt.debtAmount <= 0}
                  onChange={() => onToggleSelect(debt)}
                  className="h-4 w-4 rounded border-white/20 bg-slate-950/60 accent-rose-400"
                  aria-label="Qarzdorni tanlash"
                />
              </td>
              <td className="px-3 py-3 font-bold text-slate-500">{index + 1}</td>
              <td className="w-28 px-3 py-3"><SourceBadge debt={debt} /></td>
              <td className="px-3 py-3 font-semibold text-slate-100">
                <CopyableText value={debt.customerName} label="Mijoz ismini nusxalash" />
              </td>
              <td className="px-3 py-3 text-slate-300">
                <CopyableText value={debt.phone || debt.telegramPhone} label="Telefon raqamni nusxalash" />
              </td>
              <td className="max-w-xs px-3 py-3 text-slate-300">{debt.title || debt.orderText || debt.productName}</td>
              <td className="px-3 py-3 text-slate-200">{formatCurrency(debt.totalAmount)}</td>
              <td className="px-3 py-3 text-emerald-300">{formatCurrency(debt.paidAmount)}</td>
              <td className="px-3 py-3 text-lg font-bold text-amber-200">{formatCurrency(debt.debtAmount)}</td>
              <td className="px-3 py-3 text-slate-400">{formatDate(debt.createdAt)}</td>
              <td className="px-3 py-3">{debt.debtSource === 'flower' ? <StatusBadge status={debt.status} /> : <span className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-1 text-xs font-bold text-amber-200">Nasiya</span>}</td>
              <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                <div className="flex justify-end gap-2">
                  {debt.debtAmount > 0 && <Button variant="secondary" onClick={() => onPay(debt)}><WalletCards className="h-4 w-4" /> To‘lov</Button>}
                  {debt.debtAmount > 0 && <Button variant="secondary" onClick={() => onRemind(debt)} className="px-3"><Bell className="h-4 w-4" /></Button>}
                  <Button variant="ghost" onClick={() => navigate(debtTargetUrl(debt), { state: { returnTo, returnLabel: "Qarzlar bo'limiga qaytish" } })} className="px-3"><ExternalLink className="h-4 w-4" /></Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function DebtCard({ debt, index, selected, onToggleSelect, onView, onPay, onRemind, navigate, returnTo }) {
  return (
    <Card className="cursor-pointer" onClick={() => onView(debt)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <input
            type="checkbox"
            checked={selected}
            disabled={debt.debtAmount <= 0}
            onClick={(event) => event.stopPropagation()}
            onChange={() => onToggleSelect(debt)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-slate-950/60 accent-rose-400"
            aria-label="Qarzdorni tanlash"
          />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-500">#{index + 1}</p>
            <h3 className="mt-1 text-lg font-bold text-slate-100">
              <CopyableText value={debt.customerName} label="Mijoz ismini nusxalash">{debt.customerName || debt.productName || 'Qarzdorlik'}</CopyableText>
            </h3>
            <p className="mt-1 line-clamp-2 text-sm text-slate-400">{debt.title}</p>
          </div>
        </div>
        <SourceBadge debt={debt} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-slate-950/25 p-3">
        <Info label="Jami" value={formatCurrency(debt.totalAmount)} />
        <Info label="To‘langan" value={formatCurrency(debt.paidAmount)} />
        <Info label="Qarz" value={formatCurrency(debt.debtAmount)} danger />
      </div>
      <div className="mt-4 flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
        {debt.debtAmount > 0 && <Button variant="secondary" onClick={() => onPay(debt)}><WalletCards className="h-4 w-4" /> To‘lov</Button>}
        {debt.debtAmount > 0 && <Button variant="secondary" onClick={() => onRemind(debt)} className="px-3"><Bell className="h-4 w-4" /></Button>}
        <Button variant="ghost" onClick={() => navigate(debtTargetUrl(debt), { state: { returnTo, returnLabel: "Qarzlar bo'limiga qaytish" } })} className="px-3"><ExternalLink className="h-4 w-4" /></Button>
      </div>
    </Card>
  );
}

function DebtDetailsModal({ debt, onClose, onPay }) {
  return (
    <Modal open={Boolean(debt)} title="Qarz tafsilotlari" onClose={onClose} maxWidth="max-w-2xl">
      {debt && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SourceBadge debt={debt} />
              <h3 className="mt-3 text-xl font-bold text-slate-100">
                <CopyableText value={debt.customerName} label="Mijoz ismini nusxalash">{debt.customerName || debt.productName || 'Qarzdorlik'}</CopyableText>
              </h3>
              <p className="mt-1 text-sm text-slate-400">{debt.title}</p>
            </div>
            {debt.debtAmount > 0 && <Button onClick={() => onPay(debt)}><WalletCards className="h-4 w-4" /> To‘lov kiritish</Button>}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoCard label="Umumiy summa" value={formatCurrency(debt.totalAmount)} />
            <InfoCard label="Qilingan to‘lov" value={formatCurrency(debt.paidAmount)} />
            <InfoCard label="Qolgan qarz" value={formatCurrency(debt.debtAmount)} danger />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard label="Telefon" value={debt.phone || '-'} copyable />
            <InfoCard label="Telegram raqam" value={debt.telegramPhone || debt.phone || '-'} copyable />
            <InfoCard label="Sana" value={formatDate(debt.createdAt)} />
            {debt.pickupDate && <InfoCard label="Olib ketish" value={formatDate(debt.pickupDate)} />}
            <InfoCard label="Izoh" value={debt.note || '-'} />
          </div>
        </div>
      )}
    </Modal>
  );
}

function Info({ label, value, danger }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`font-bold ${danger ? 'text-amber-200' : 'text-slate-100'}`}>{value}</p>
    </div>
  );
}

function InfoCard({ label, value, danger, copyable }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/25 p-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 font-bold ${danger ? 'text-amber-200' : 'text-slate-100'}`}>
        {copyable ? <CopyableText value={value} label={`${label}ni nusxalash`} /> : value}
      </p>
    </div>
  );
}
