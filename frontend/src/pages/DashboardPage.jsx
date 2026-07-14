import { AlertTriangle, Banknote, BarChart3, CalendarClock, CheckCircle2, ClipboardList, Clock3, Gift, RefreshCw, TrendingUp, WalletCards } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DashboardOrderList, DebtAside } from '../components/dashboard/DashboardOrderList';
import { DashboardStatCard } from '../components/dashboard/DashboardStatCard';
import { PageHeader } from '../components/layout/PageHeader';
import { OrderDetailsModal } from '../components/orders/OrderDetailsModal';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { CopyableText } from '../components/ui/CopyableText';
import { Modal } from '../components/ui/Modal';
import { useDashboardQuery } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';

const accents = {
  blue: { card: 'border-sky-300/10 bg-sky-400/8', icon: 'bg-sky-400/10 text-sky-200', line: 'bg-sky-300/80' },
  cyan: { card: 'border-cyan-300/10 bg-cyan-400/8', icon: 'bg-cyan-400/10 text-cyan-200', line: 'bg-cyan-300/80' },
  amber: { card: 'border-amber-300/10 bg-amber-400/8', icon: 'bg-amber-400/10 text-amber-200', line: 'bg-amber-300/80' },
  emerald: { card: 'border-emerald-300/10 bg-emerald-400/8', icon: 'bg-emerald-400/10 text-emerald-200', line: 'bg-emerald-300/80' },
  rose: { card: 'border-rose-300/10 bg-rose-400/8', icon: 'bg-rose-400/10 text-rose-200', line: 'bg-rose-300/80' },
  orange: { card: 'border-orange-300/10 bg-orange-400/8', icon: 'bg-orange-400/10 text-orange-200', line: 'bg-orange-300/80' },
};

const chartColors = ['#fb7185', '#34d399', '#38bdf8', '#fbbf24', '#a78bfa'];
const paymentLabels = {
  cash: 'Naqd',
  card: 'Karta',
  click: 'Click',
  payme: 'Payme',
  debt: 'Qarz',
};

function remainingTime(value) {
  const pickup = new Date(value);
  const now = new Date();
  const diff = pickup.getTime() - now.getTime();
  if (!value || Number.isNaN(pickup.getTime())) return '-';
  if (diff <= 0) return 'Vaqti o`tgan';

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  const sameDay = pickup.toDateString() === now.toDateString();

  if (hours > 0) return `${hours} soat ${restMinutes} daqiqa qoldi`;
  if (minutes > 0) return `${minutes} daqiqa qoldi`;
  if (sameDay) {
    return `Bugun ${String(pickup.getHours()).padStart(2, '0')}:${String(pickup.getMinutes()).padStart(2, '0')} da`;
  }
  return formatDate(value);
}

function SectionTitle({ title, description }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-100">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function DashboardCharts({ charts = {} }) {
  const weeklySales = charts.weeklySales || [];
  const paymentTypes = (charts.paymentTypes || []).map((item) => ({ ...item, name: paymentLabels[item.name] || item.name }));
  const orderStatuses = charts.orderStatuses || [];

  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
      <Card>
        <h3 className="mb-4 text-base font-semibold text-slate-100">7 kunlik sotuv va foyda</h3>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={weeklySales}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="amount" name="Sotuv" stroke="#fb7185" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="profit" name="Foyda" stroke="#34d399" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4">
        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-100">To'lov turlari</h3>
          <div className="h-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={paymentTypes} dataKey="value" nameKey="name" innerRadius={44} outerRadius={78}>
                  {paymentTypes.map((_, index) => <Cell key={index} fill={chartColors[index % chartColors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-base font-semibold text-slate-100">Buyurtma statuslari</h3>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={orderStatuses}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.08)" />
                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.12)', borderRadius: 8 }} />
                <Bar dataKey="value" fill="#38bdf8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <div className="h-4 w-32 rounded bg-white/10" />
            <div className="mt-4 h-8 w-16 rounded bg-white/10" />
            <div className="mt-5 h-3 w-full rounded bg-white/10" />
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="h-72 animate-pulse">
            <div className="h-4 w-48 rounded bg-white/10" />
            <div className="mt-6 space-y-3">
              <div className="h-14 rounded bg-white/10" />
              <div className="h-14 rounded bg-white/10" />
              <div className="h-14 rounded bg-white/10" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [viewingOrder, setViewingOrder] = useState(null);
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [selectedTradePeriod, setSelectedTradePeriod] = useState('daily');
  const { data, isLoading, isFetching, isError, refetch } = useDashboardQuery();

  useEffect(() => {
    if (isError) toast.error('Dashboard ma`lumotlarini yuklashda xatolik yuz berdi');
  }, [isError]);

  const stats = data?.stats || {};
  const tradePeriods = stats.tradePeriods || {};
  const dashboardReturnState = { returnTo: '/', returnLabel: 'Dashboardga qaytish' };
  const navigateFromDashboard = (to) => navigate(to, { state: dashboardReturnState });
  const periodTradeCards = [
    {
      key: 'daily',
      title: 'Bugungi savdo',
      value: formatCurrency(tradePeriods.daily || 0),
      description: 'Bugun yaratilgan gul buyurtmalari va sovga/tovar sotuvlari.',
      icon: CalendarClock,
      accent: accents.cyan,
      to: '/archive',
    },
    {
      key: 'weekly',
      title: 'Haftalik savdo',
      value: formatCurrency(tradePeriods.weekly || 0),
      description: 'Joriy hafta ichidagi umumiy savdo summasi.',
      icon: BarChart3,
      accent: accents.emerald,
      to: '/archive',
    },
    {
      key: 'monthly',
      title: 'Oylik savdo',
      value: formatCurrency(tradePeriods.monthly || 0),
      description: 'Joriy oy ichidagi umumiy savdo summasi.',
      icon: TrendingUp,
      accent: accents.amber,
      to: '/archive',
    },
    {
      key: 'total',
      title: 'Umumiy savdo',
      value: formatCurrency(tradePeriods.total || stats.totalTrade || 0),
      description: 'Barcha davrlardagi gul va sovga/tovar savdolari.',
      icon: Banknote,
      accent: accents.blue,
      to: '/reports',
    },
  ];
  const selectedTradeCard = periodTradeCards.find((item) => item.key === selectedTradePeriod) || periodTradeCards[0];
  const { key: selectedTradeKey, ...selectedTradeCardProps } = selectedTradeCard;
  const moneyCards = [
    {
      title: 'Umumiy savdo summasi',
      value: formatCurrency(stats.totalTrade || 0),
      description: 'Gul buyurtmalari va sovg‘a/tovar sotuvlari jami.',
      icon: Banknote,
      accent: accents.blue,
      to: '/reports',
    },
    {
      title: 'Gullardan tushum',
      value: formatCurrency(stats.flowerRevenue || 0),
      description: 'Gul buyurtmalaridan kelib tushgan to‘lovlar.',
      icon: TrendingUp,
      accent: accents.rose,
      to: '/orders',
    },
    {
      title: 'Sovg‘a/tovarlardan tushum',
      value: formatCurrency(stats.giftRevenue || 0),
      description: 'Nasiyadan tashqari sovg‘a va tovar sotuvlari tushumi.',
      icon: Gift,
      accent: accents.emerald,
      to: '/sales',
    },
  ];

  const operationCards = [
    {
      title: 'Bugungi buyurtmalar',
      value: stats.todayOrders || 0,
      description: 'Bugun yaratilgan buyurtmalar soni.',
      icon: CalendarClock,
      accent: accents.cyan,
      to: '/orders?filter=today',
    },
    {
      title: 'Bugun olib ketiladi',
      value: stats.pickupToday || 0,
      description: 'Bugun mijozga topshirilishi kerak bo‘lgan buyurtmalar.',
      icon: Clock3,
      accent: accents.amber,
      to: '/orders?filter=pickup_today',
    },
    {
      title: 'Umumiy buyurtmalar',
      value: stats.totalOrders || 0,
      description: 'Bekor qilinganlardan tashqari barcha buyurtmalar.',
      icon: ClipboardList,
      accent: accents.blue,
      to: '/orders',
    },
    {
      title: 'Tayyor buyurtmalar',
      value: stats.readyOrders || 0,
      description: 'Tayyor, lekin hali olib ketilmagan buyurtmalar.',
      icon: CheckCircle2,
      accent: accents.emerald,
      to: '/orders?status=ready',
    },
  ];

  const alertCards = [
    {
      title: 'Qarzdorligi bor',
      value: stats.debtOrders || 0,
      description: 'Qolgan qarzi mavjud aktiv buyurtmalar.',
      icon: WalletCards,
      accent: accents.rose,
      to: '/orders?filter=debt',
    },
    {
      title: 'Kechikkan buyurtmalar',
      value: stats.overdueOrders || 0,
      description: 'Olib ketish vaqti o`tib ketgan aktiv buyurtmalar.',
      icon: AlertTriangle,
      accent: accents.orange,
      to: '/orders?filter=overdue',
    },
    {
      title: 'Vaqti yaqinlashgan',
      value: stats.upcomingOrders || 0,
      description: 'Keyingi 24 soat ichida olib ketiladigan buyurtmalar.',
      icon: Clock3,
      accent: accents.amber,
      to: '/orders?filter=upcoming',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Dashboard" description="Buyurtmalar holatini tez nazorat qiling." />
        <Button variant="secondary" loading={isFetching && !isLoading} onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
          Yangilash
        </Button>
      </div>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section className="space-y-3">
            <SectionTitle title="Savdo davrlari" description="Kunlik, haftalik, oylik va umumiy savdo summasi." />
            <div className="grid gap-3 xl:grid-cols-[1fr_2fr] xl:items-stretch">
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-slate-950/25 p-2 md:grid-cols-4 xl:grid-cols-2">
                {periodTradeCards.map((item) => (
                  <Button
                    key={item.key}
                    variant={selectedTradePeriod === item.key ? 'primary' : 'secondary'}
                    className="justify-center"
                    onClick={() => setSelectedTradePeriod(item.key)}
                  >
                    {item.title.replace(' savdo', '')}
                  </Button>
                ))}
              </div>
              <DashboardStatCard key={selectedTradeKey} {...selectedTradeCardProps} onClick={() => navigateFromDashboard(selectedTradeCard.to)} />
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle title="Pul va tushum" description="Bugungi savdo holati va pul oqimi." />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {moneyCards.map((item) => (
                <DashboardStatCard key={item.title} {...item} onClick={() => navigateFromDashboard(item.to)} />
              ))}
              <DashboardStatCard
                title="Umumiy nasiya"
                value={formatCurrency(stats.debtBreakdown?.total || stats.totalDebt || 0)}
                description="Ustiga bosing: gul va tovardan qancha nasiya borligi ochiladi."
                icon={WalletCards}
                accent={accents.rose}
                onClick={() => setDebtModalOpen(true)}
              />
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle title="Bugungi ishlar" description="Admin kun davomida nazorat qilishi kerak bo‘lgan asosiy holatlar." />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {operationCards.map((item) => (
                <DashboardStatCard key={item.title} {...item} onClick={() => navigateFromDashboard(item.to)} />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle title="E'tibor talab qiladiganlar" description="Qarz, kechikish va yaqinlashgan topshirishlar." />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {alertCards.map((item) => (
                <DashboardStatCard key={item.title} {...item} onClick={() => navigateFromDashboard(item.to)} />
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle title="Tezkor ro'yxatlar" description="Bugun ishlash kerak bo‘lgan buyurtmalar ro‘yxati." />
            <div className="grid gap-4 xl:grid-cols-2">
              <DashboardOrderList
                title="Bugun olib ketiladigan buyurtmalar"
                icon={CalendarClock}
                orders={data?.pickupTodayOrders || []}
                emptyText="Bugun olib ketiladigan buyurtmalar yo'q"
                actionLabel="Ko'rish"
                onAction={setViewingOrder}
                renderMeta={(order) => (
                  <>
                    <span><CopyableText value={order.phone} label="Telefon raqamni nusxalash" /></span>
                    <span>{remainingTime(order.pickupDate)}</span>
                    <span>{formatDate(order.pickupDate)}</span>
                  </>
                )}
              />

              <DashboardOrderList
                title="Tayyor buyurtmalar"
                icon={CheckCircle2}
                orders={data?.readyOrders || []}
                emptyText="Tayyor buyurtmalar mavjud emas"
                actionLabel="Buyurtmani ochish"
                onAction={setViewingOrder}
                renderMeta={(order) => (
                  <>
                    <span>{formatDate(order.pickupDate)}</span>
                    <span className={order.isTelegramNotified ? 'text-emerald-300' : 'text-amber-300'}>
                      {order.isTelegramNotified ? 'Telegram yuborilgan' : 'Telegram yuborilmagan'}
                    </span>
                  </>
                )}
              />

            <DashboardOrderList
              title="Vaqti yaqinlashgan buyurtmalar"
              icon={Clock3}
              orders={data?.upcomingOrders || []}
              emptyText="Vaqti yaqinlashgan buyurtmalar mavjud emas"
              actionLabel="Ko'rish"
              onAction={setViewingOrder}
              renderMeta={(order) => (
                <>
                  <span><CopyableText value={order.phone} label="Telefon raqamni nusxalash" /></span>
                  <span>{remainingTime(order.pickupDate)}</span>
                  <span>{formatDate(order.pickupDate)}</span>
                </>
              )}
            />

            <DashboardOrderList
              title="Qarzdorligi bor buyurtmalar"
              icon={WalletCards}
              orders={data?.debtOrders || []}
              emptyText="Qarzdor buyurtmalar mavjud emas"
              actionLabel="To'lov kiritish"
              onAction={(order) => navigate(`/debts?search=${encodeURIComponent(order.phone)}`, { state: dashboardReturnState })}
              renderMeta={(order) => (
                <>
                  <span>{formatDate(order.pickupDate)}</span>
                  <span>Qolgan qarz: {formatCurrency(order.debtAmount)}</span>
                </>
              )}
              renderAside={(order) => <DebtAside order={order} />}
            />

            <DashboardOrderList
              title="Kechikkan buyurtmalar"
              icon={AlertTriangle}
              orders={data?.overdueOrders || []}
              emptyText="Kechikkan buyurtmalar mavjud emas"
              actionLabel="Ko'rish"
              onAction={setViewingOrder}
              renderMeta={(order) => (
                <>
                  <span><CopyableText value={order.phone} label="Telefon raqamni nusxalash" /></span>
                  <span className="text-orange-300">Olib ketish vaqti: {formatDate(order.pickupDate)}</span>
                </>
              )}
            />
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle title="Grafiklar" description="Trendlarni ko‘rish uchun qisqa tahlil." />
            <DashboardCharts charts={data?.charts} />
          </section>
        </>
      )}

      <OrderDetailsModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
      <Modal open={debtModalOpen} title="Nasiya savdo taqsimoti" onClose={() => setDebtModalOpen(false)} maxWidth="max-w-lg">
        <div className="space-y-3">
          <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-4">
            <p className="text-sm font-semibold text-slate-400">Gullardan nasiya savdo</p>
            <p className="mt-2 text-2xl font-bold text-rose-100">{formatCurrency(stats.debtBreakdown?.flowers || 0)}</p>
          </div>
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-4">
            <p className="text-sm font-semibold text-slate-400">Sovg‘a/tovarlardan nasiya savdo</p>
            <p className="mt-2 text-2xl font-bold text-emerald-100">{formatCurrency(stats.debtBreakdown?.gifts || 0)}</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-950/35 p-4">
            <p className="text-sm font-semibold text-slate-400">Jami nasiya</p>
            <p className="mt-2 text-3xl font-bold text-slate-100">{formatCurrency(stats.debtBreakdown?.total || 0)}</p>
          </div>
          <Button className="w-full" onClick={() => navigate('/debts', { state: dashboardReturnState })}>Qarzdorlik sahifasiga o‘tish</Button>
        </div>
      </Modal>
    </div>
  );
}
