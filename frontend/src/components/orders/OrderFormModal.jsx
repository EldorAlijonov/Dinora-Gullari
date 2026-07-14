import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { formatCurrency } from '../../utils/formatCurrency';
import { Button } from '../ui/Button';
import { DateTimePicker } from '../ui/DateTimePicker';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { orderStatuses } from './StatusBadge';

const requiredText = 'Ushbu maydon majburiy';
const minNumberText = 'Qiymat 0 dan kichik bo‘lmasligi kerak';
const invalidPhoneText = 'Telefon raqam noto‘g‘ri kiritildi';
const pastDateText = 'O‘tib ketgan sanaga buyurtma qo‘shib bo‘lmaydi';

const numberField = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? 0 : Number(value)),
  z.number({ invalid_type_error: minNumberText }).min(0, minNumberText),
);

const phoneField = z
  .string({ required_error: requiredText })
  .trim()
  .min(1, requiredText)
  .regex(/^\d{9}$/, invalidPhoneText);

const schema = z.object({
  customerName: z.string({ required_error: requiredText }).trim().min(2, 'Mijoz ismini kiriting'),
  phone: phoneField,
  telegramPhone: phoneField,
  orderText: z.string({ required_error: requiredText }).trim().min(3, 'Gul buyurtmasi tafsilotini kiriting'),
  totalAmount: numberField,
  prepaidAmount: numberField,
  pickupDate: z
    .string()
    .optional()
    .refine((value) => !value || new Date(value).getTime() >= Date.now() - 30_000, pastDateText),
  status: z.string({ required_error: requiredText }).min(1, requiredText),
  note: z.string().optional(),
});

function stripPhone(value = '') {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('998') ? digits.slice(3) : digits.slice(-9);
}

function withUzPrefix(value = '') {
  return `+998${value.replace(/\D/g, '').slice(-9)}`;
}

function buildDefaults(order) {
  if (!order) {
    return {
      customerName: '',
      phone: '',
      telegramPhone: '',
      orderText: '',
      totalAmount: '',
      prepaidAmount: '',
      pickupDate: '',
      status: 'new',
      note: '',
    };
  }

  return {
    customerName: order.customerName || '',
    phone: stripPhone(order.phone),
    telegramPhone: stripPhone(order.telegramPhone || order.phone),
    orderText: order.orderText || '',
    totalAmount: order.totalAmount ?? 0,
    prepaidAmount: order.prepaidAmount ?? 0,
    pickupDate: order.pickupDate || '',
    status: order.status || 'new',
    note: order.note || '',
  };
}

export function OrderFormModal({ open, order, loading, onClose, onSubmit }) {
  const { register, handleSubmit, reset, formState, setValue, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: buildDefaults(order),
  });

  const totalAmount = Number(watch('totalAmount') || 0);
  const prepaidAmount = Number(watch('prepaidAmount') || 0);
  const pickupDate = watch('pickupDate');
  const debtAmount = Math.max(totalAmount - prepaidAmount, 0);
  const debtTone = debtAmount > 0
    ? 'border-amber-300/20 bg-amber-400/10 text-amber-100'
    : 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100';

  useEffect(() => {
    reset(buildDefaults(order));
  }, [order, open, reset]);

  const enhanceNumberField = (name) => {
    const field = register(name);
    return {
      ...field,
      onFocus: (event) => {
        if (String(event.target.value) === '0') setValue(name, '', { shouldValidate: false });
      },
      onBlur: (event) => {
        if (event.target.value === '') setValue(name, 0, { shouldValidate: true });
        field.onBlur(event);
      },
    };
  };

  const submit = (values) => {
    const safePickupDate = values.pickupDate || new Date().toISOString();
    onSubmit({
      ...values,
      pickupDate: safePickupDate,
      phone: withUzPrefix(values.phone),
      telegramPhone: withUzPrefix(values.telegramPhone),
      totalAmount: Number(values.totalAmount || 0),
      prepaidAmount: Number(values.prepaidAmount || 0),
    });
  };

  return (
    <Modal open={open} title={order ? 'Gul buyurtmasini tahrirlash' : 'Yangi gul buyurtmasi'} onClose={onClose} maxWidth="max-w-4xl">
      <form onSubmit={handleSubmit(submit)} className="grid gap-5 sm:grid-cols-2">
        <Input label="Mijoz ismi" error={formState.errors.customerName?.message} {...register('customerName')} />
        <Input label="Aloqa telefoni" placeholder="901234567" inputMode="tel" leftElement={<span className="text-sm font-bold text-slate-300">+998</span>} error={formState.errors.phone?.message} {...register('phone')} />
        <Input label="Telegram telefon" placeholder="901234567" inputMode="tel" leftElement={<span className="text-sm font-bold text-slate-300">+998</span>} error={formState.errors.telegramPhone?.message} {...register('telegramPhone')} />
        <Select label="Status" error={formState.errors.status?.message} {...register('status')}>
          {orderStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <Input label="Gul buyurtma summasi" type="number" min="0" error={formState.errors.totalAmount?.message} {...enhanceNumberField('totalAmount')} />
        <Input label="Oldindan to'lov" type="number" min="0" error={formState.errors.prepaidAmount?.message} {...enhanceNumberField('prepaidAmount')} />
        <div className={`rounded-lg border p-3 ${debtTone}`}>
          <p className="text-sm font-semibold text-slate-300">Qolgan qarz</p>
          <p className="mt-1 text-xl font-bold">{formatCurrency(debtAmount)}</p>
        </div>
        <DateTimePicker label="Olib ketish sanasi" value={pickupDate} minDate={new Date()} onChange={(value) => setValue('pickupDate', value, { shouldValidate: true })} error={formState.errors.pickupDate?.message} />
        <Textarea label="Gul buyurtmasi tafsiloti" className="sm:col-span-2" error={formState.errors.orderText?.message} {...register('orderText')} />
        <Textarea label="Izoh" className="sm:col-span-2" {...register('note')} />
        <div className="sticky bottom-0 -mx-5 -mb-5 border-t border-white/10 bg-panel/95 p-5 sm:col-span-2">
          <Button loading={loading} disabled={loading} className="w-full">
            {loading ? 'Saqlanmoqda...' : order ? 'Yangilash' : 'Saqlash'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
