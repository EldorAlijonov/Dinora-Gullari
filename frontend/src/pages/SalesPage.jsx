import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, Grid2X2, List, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { CopyableText } from '../components/ui/CopyableText';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { useCreateSaleMutation, useDeleteSaleMutation, useSalesQuery, useUpdateSaleMutation } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

const requiredText = 'Ushbu maydon majburiy';
const minNumberText = 'Qiymat 0 dan kichik bo‘lmasligi kerak';
const invalidPhoneText = 'Telefon raqam noto‘g‘ri kiritildi';

const paymentTypes = [
  ['cash', 'Naqd'],
  ['card', 'Karta'],
  ['click', 'Click'],
  ['payme', 'Payme'],
];

const numberField = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? 0 : Number(value)),
  z.number({ invalid_type_error: minNumberText }).min(0, minNumberText),
);

const optionalPhoneField = z
  .string()
  .optional()
  .transform((value) => value || '')
  .refine((value) => !value || /^\d{9}$/.test(value), invalidPhoneText);

const schema = z.object({
  productName: z.string({ required_error: requiredText }).trim().min(2, 'Tovar nomini kiriting'),
  customerName: z.string().optional(),
  phone: optionalPhoneField,
  telegramPhone: optionalPhoneField,
  amount: numberField,
  paidAmount: numberField,
  paymentType: z.string({ required_error: requiredText }).min(1, 'To‘lov turini tanlang'),
  note: z.string().optional(),
});

function stripPhone(value = '') {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('998') ? digits.slice(3) : digits.slice(-9);
}

function withUzPrefix(value = '') {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return `+998${digits.slice(-9)}`;
}

function buildDefaults(sale) {
  if (!sale) {
    return { productName: '', customerName: '', phone: '', telegramPhone: '', paymentType: 'cash', amount: '', paidAmount: '', note: '' };
  }
  return {
    productName: sale.productName || '',
    customerName: sale.customerName || '',
    phone: stripPhone(sale.phone),
    telegramPhone: stripPhone(sale.telegramPhone),
    paymentType: paymentTypes.some(([value]) => value === sale.paymentType) ? sale.paymentType : 'cash',
    amount: sale.amount ?? 0,
    paidAmount: sale.paidAmount ?? 0,
    note: sale.note || '',
  };
}

export default function SalesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const returnTo = location.state?.returnTo || (location.state?.fromDashboard ? '/' : null);
  const returnLabel = location.state?.returnLabel || (returnTo === '/' ? 'Dashboardga qaytish' : 'Orqaga qaytish');
  const [params, setParams] = useState(() => ({
    paymentType: searchParams.get('paymentType') || undefined,
    search: searchParams.get('search') || undefined,
    date: searchParams.get('date') || undefined,
    page: 1,
    limit: 50,
  }));
  const [formOpen, setFormOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [viewingSale, setViewingSale] = useState(null);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('salesViewMode') || 'table');
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [deletingSale, setDeletingSale] = useState(null);
  const { data: salesResponse = [], isLoading } = useSalesQuery(params);
  const data = Array.isArray(salesResponse) ? salesResponse : salesResponse.items || [];
  const pagination = Array.isArray(salesResponse)
    ? { page: 1, limit: data.length, total: data.length, totalPages: 1 }
    : salesResponse;
  const [createSale, createState] = useCreateSaleMutation();
  const [updateSale, updateState] = useUpdateSaleMutation();
  const [deleteSale] = useDeleteSaleMutation();
  const { register, handleSubmit, reset, watch, setValue, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(null),
  });

  const amount = Number(watch('amount') || 0);
  const paidAmount = Number(watch('paidAmount') || 0);
  const debtAmount = Math.max(amount - paidAmount, 0);

  useEffect(() => {
    localStorage.setItem('salesViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams(location.search);
    setParams((current) => ({
      ...current,
      paymentType: nextSearchParams.get('paymentType') || undefined,
      search: nextSearchParams.get('search') || undefined,
      date: nextSearchParams.get('date') || undefined,
      page: 1,
      limit: current.limit || 50,
    }));
  }, [location.search]);

  const openCreate = () => {
    setEditingSale(null);
    reset(buildDefaults(null));
    setFormOpen(true);
  };

  const openEdit = (sale) => {
    setEditingSale(sale);
    reset(buildDefaults(sale));
    setFormOpen(true);
  };

  const submit = async (values) => {
    const body = {
      ...values,
      phone: withUzPrefix(values.phone),
      telegramPhone: withUzPrefix(values.telegramPhone),
      amount: Number(values.amount || 0),
      paidAmount: Number(values.paidAmount || 0),
    };
    setPendingSubmit(body);
  };

  const confirmSubmit = async () => {
    if (editingSale) {
      await updateSale({ id: editingSale._id, ...pendingSubmit }).unwrap();
    } else {
      await createSale(pendingSubmit).unwrap();
    }
    setPendingSubmit(null);
    reset(buildDefaults(null));
    setEditingSale(null);
    setFormOpen(false);
  };

  const confirmDelete = async () => {
    await deleteSale(deletingSale._id).unwrap();
    setDeletingSale(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sovg‘a va tovar sotuvlari"
        description="Do‘kondagi sovg‘a, aksessuar va tayyor tovarlar sotuvini kiriting."
        action={returnTo && (
          <Button variant="secondary" onClick={() => navigate(returnTo)}>
            <ChevronLeft className="h-4 w-4" />
            {returnLabel}
          </Button>
        )}
      />

      {highlightId && (
        <Card className="border-amber-300/20 bg-amber-400/10">
          <p className="text-sm font-semibold text-amber-100">Bildirishnomadan ochilgan sotuv ajratib ko‘rsatiladi.</p>
        </Card>
      )}

      <Card>
        <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto] xl:items-center">
          <div className="grid gap-3 lg:grid-cols-3">
            <Input
              placeholder="Tovar, mijoz, telefon yoki izoh"
              value={params.search || ''}
              onChange={(event) => setParams((current) => ({ ...current, search: event.target.value || undefined, page: 1 }))}
              rightElement={params.search && (
                <button
                  type="button"
                  onClick={() => setParams((current) => ({ ...current, search: undefined, page: 1 }))}
                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
                  title="Qidiruvni tozalash"
                  aria-label="Qidiruvni tozalash"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            />
            <Select value={params.paymentType || ''} onChange={(event) => setParams((current) => ({ ...current, paymentType: event.target.value || undefined, page: 1 }))}>
              <option value="">Barcha to‘lovlar</option>
              {paymentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
            <Input type="date" value={params.date || ''} onChange={(event) => setParams((current) => ({ ...current, date: event.target.value || undefined, page: 1 }))} />
          </div>
          <div className="flex rounded-lg border border-white/10 bg-slate-950/30 p-1">
            <Button variant={viewMode === 'table' ? 'primary' : 'ghost'} className="px-3" onClick={() => setViewMode('table')}><List className="h-4 w-4" /> Ro‘yxat</Button>
            <Button variant={viewMode === 'card' ? 'primary' : 'ghost'} className="px-3" onClick={() => setViewMode('card')}><Grid2X2 className="h-4 w-4" /> Card</Button>
          </div>

          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Tovar sotish</Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="rounded-lg border border-white/10 bg-panel/70 p-8 text-center text-slate-400">Yuklanmoqda...</div>
      ) : data.length === 0 ? (
        <Card><EmptyState /></Card>
      ) : viewMode === 'table' ? (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>{['#', 'Sana', 'Tovar', 'Mijoz', 'Telefon', 'Jami summa', 'Qilingan to‘lov', 'Qolgan qarz', 'To‘lov turi', 'Amallar'].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {data.map((sale, index) => (
                <tr
                  key={sale._id}
                  className={`cursor-pointer transition hover:bg-white/5 ${sale._id === highlightId ? 'bg-amber-400/10 ring-1 ring-amber-300/30' : ''}`}
                  onClick={() => setViewingSale(sale)}
                >
                  <td className="px-3 py-3 font-bold text-slate-500">{index + 1}</td>
                  <td className="px-3 py-3 text-slate-400">{formatDate(sale.createdAt)}</td>
                  <td className="px-3 py-3 font-semibold text-slate-100">{sale.productName || 'Sovg‘a/tovar'}</td>
                  <td className="px-3 py-3 text-slate-300">
                    <CopyableText value={sale.customerName} label="Mijoz ismini nusxalash" />
                  </td>
                  <td className="px-3 py-3 text-slate-300">
                    <CopyableText value={sale.phone || sale.telegramPhone} label="Telefon raqamni nusxalash" />
                  </td>
                  <td className="px-3 py-3 font-bold text-slate-100">{formatCurrency(sale.amount)}</td>
                  <td className="px-3 py-3 text-emerald-300">{formatCurrency(sale.paidAmount || 0)}</td>
                  <td className="px-3 py-3 font-bold text-amber-200">{formatCurrency(sale.debtAmount || 0)}</td>
                  <td className="px-3 py-3">{paymentTypes.find(([value]) => value === sale.paymentType)?.[1] || sale.paymentType}</td>
                  <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => openEdit(sale)} className="px-3"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="danger" onClick={() => setDeletingSale(sale)} className="px-3"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((sale, index) => (
            <SaleCard key={sale._id} sale={sale} index={index} highlighted={sale._id === highlightId} onView={setViewingSale} onEdit={openEdit} onDelete={setDeletingSale} />
          ))}
        </div>
      )}

      <Modal open={formOpen} title={editingSale ? 'Sovg‘a/tovar sotuvini tahrirlash' : 'Sovg‘a/tovar sotish'} onClose={() => setFormOpen(false)}>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4 sm:grid-cols-2">
          <Input label="Tovar nomi" error={formState.errors.productName?.message} {...register('productName')} />
          <Select label="To‘lov turi" error={formState.errors.paymentType?.message} {...register('paymentType')}>{paymentTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
          <Input label="Mijoz ismi" {...register('customerName')} />
          <Input label="Telefon" placeholder="901234567" inputMode="tel" leftElement={<span className="text-sm font-bold text-slate-300">+998</span>} error={formState.errors.phone?.message} {...register('phone')} />
          <Input label="Telegram telefon" placeholder="901234567" inputMode="tel" leftElement={<span className="text-sm font-bold text-slate-300">+998</span>} error={formState.errors.telegramPhone?.message} {...register('telegramPhone')} />
          <Input label="Jami summa" type="number" min="0" error={formState.errors.amount?.message} {...register('amount')} />
          <Input label="Qilingan to‘lov" type="number" min="0" error={formState.errors.paidAmount?.message} {...register('paidAmount')} />
          <div className={`rounded-lg border p-3 ${debtAmount > 0 ? 'border-amber-300/20 bg-amber-400/10 text-amber-100' : 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'}`}>
            <p className="text-sm font-semibold text-slate-300">Qolgan qarz</p>
            <p className="mt-1 text-xl font-bold">{formatCurrency(debtAmount)}</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => setValue('paidAmount', amount, { shouldValidate: true })}>
            To‘liq to‘landi
          </Button>
          <Textarea label="Izoh" className="sm:col-span-2" {...register('note')} />
          <Button loading={createState.isLoading || updateState.isLoading} className="sm:col-span-2">{editingSale ? 'Yangilash' : 'Saqlash'}</Button>
        </form>
      </Modal>

      <ConfirmModal
        open={Boolean(pendingSubmit)}
        title={editingSale ? 'Sotuvni yangilash' : 'Sotuvni saqlash'}
        description={editingSale ? 'Sovg‘a/tovar sotuvini yangilashni tasdiqlaysizmi?' : 'Yangi sovg‘a/tovar sotuvini saqlashni tasdiqlaysizmi?'}
        loading={createState.isLoading || updateState.isLoading}
        onClose={() => setPendingSubmit(null)}
        onConfirm={confirmSubmit}
      />

      <ConfirmModal
        open={Boolean(deletingSale)}
        title="Sotuvni o‘chirish"
        description={`${deletingSale?.productName || 'Ushbu sotuv'} yozuvini o‘chirishni tasdiqlaysizmi?`}
        confirmText="O‘chirish"
        variant="danger"
        onClose={() => setDeletingSale(null)}
        onConfirm={confirmDelete}
      />

      {!isLoading && data.length > 0 && (
        <Pagination {...pagination} onPageChange={(page) => setParams((current) => ({ ...current, page }))} />
      )}

      <SaleDetailsModal sale={viewingSale} onClose={() => setViewingSale(null)} onEdit={openEdit} />
    </div>
  );
}

function SaleCard({ sale, index, highlighted, onView, onEdit, onDelete }) {
  return (
    <Card className={`cursor-pointer ${highlighted ? 'bg-amber-400/10 ring-1 ring-amber-300/30' : ''}`} onClick={() => onView(sale)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">#{index + 1}</p>
          <h3 className="mt-1 text-lg font-bold text-slate-100">{sale.productName || 'Sovg‘a/tovar'}</h3>
          <p className="mt-1 text-sm text-slate-400">
            <CopyableText value={sale.customerName} label="Mijoz ismini nusxalash">{sale.customerName || 'Mijoz kiritilmagan'}</CopyableText>
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-xs font-bold text-slate-200">
          {paymentTypes.find(([value]) => value === sale.paymentType)?.[1] || sale.paymentType}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-slate-950/25 p-3">
        <Info label="Jami" value={formatCurrency(sale.amount)} />
        <Info label="To‘langan" value={formatCurrency(sale.paidAmount || 0)} />
        <Info label="Qarz" value={formatCurrency(sale.debtAmount || 0)} danger />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-300">
            <CopyableText value={sale.phone} label="Telefon raqamni nusxalash" />
          </p>
          {sale.telegramPhone && (
            <p className="mt-1 text-xs text-sky-300">
              <CopyableText value={sale.telegramPhone} label="Telegram raqamni nusxalash">TG: {sale.telegramPhone}</CopyableText>
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">{formatDate(sale.createdAt)}</p>
        </div>
        <div className="flex shrink-0 gap-2" onClick={(event) => event.stopPropagation()}>
          <Button variant="secondary" onClick={() => onEdit(sale)} className="px-3"><Pencil className="h-4 w-4" /></Button>
          <Button variant="danger" onClick={() => onDelete(sale)} className="px-3"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>
    </Card>
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

function SaleDetailsModal({ sale, onClose, onEdit }) {
  return (
    <Modal open={Boolean(sale)} title="Sovg‘a/tovar tafsilotlari" onClose={onClose} maxWidth="max-w-2xl">
      {sale && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-slate-100">{sale.productName || 'Sovg‘a/tovar'}</h3>
              <p className="mt-1 text-sm text-slate-400">{formatDate(sale.createdAt)}</p>
            </div>
            <Button variant="secondary" onClick={() => onEdit(sale)}><Pencil className="h-4 w-4" /> Tahrirlash</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <InfoCard label="Jami summa" value={formatCurrency(sale.amount)} />
            <InfoCard label="Qilingan to‘lov" value={formatCurrency(sale.paidAmount || 0)} />
            <InfoCard label="Qolgan qarz" value={formatCurrency(sale.debtAmount || 0)} danger />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard label="Mijoz" value={sale.customerName || '-'} copyable />
            <InfoCard label="Telefon" value={sale.phone || '-'} copyable />
            <InfoCard label="Telegram telefon" value={sale.telegramPhone || sale.phone || '-'} copyable />
            <InfoCard label="To‘lov turi" value={paymentTypes.find(([value]) => value === sale.paymentType)?.[1] || sale.paymentType} />
            <InfoCard label="Izoh" value={sale.note || '-'} />
          </div>
        </div>
      )}
    </Modal>
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
