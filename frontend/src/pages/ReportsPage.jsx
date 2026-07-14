import { ChevronLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { useReportDailyQuery, useReportMonthlyQuery, useReportOverviewQuery, useReportWeeklyQuery, useReportYearlyQuery } from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';

const colors = ['#f43f5e', '#10b981', '#f59e0b', '#6366f1', '#14b8a6'];
const mapProfit = (data = []) => data.map((item) => ({ date: item._id, amount: item.amount, profit: item.profit }));

export default function ReportsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || (location.state?.fromDashboard ? '/' : null);
  const returnLabel = location.state?.returnLabel || (returnTo === '/' ? 'Dashboardga qaytish' : 'Orqaga qaytish');
  const daily = useReportDailyQuery();
  const weekly = useReportWeeklyQuery();
  const monthly = useReportMonthlyQuery();
  const yearly = useReportYearlyQuery();
  const overview = useReportOverviewQuery();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hisobotlar"
        description="Gul buyurtmalari va sovg‘a/tovar sotuvlari bo‘yicha tahlil."
        action={returnTo && (
          <Button variant="secondary" onClick={() => navigate(returnTo)}>
            <ChevronLeft className="h-4 w-4" />
            {returnLabel}
          </Button>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportLine title="Kunlik foyda" data={mapProfit(daily.data)} />
        <ReportLine title="Haftalik foyda" data={mapProfit(weekly.data)} />
        <ReportLine title="Oylik foyda" data={mapProfit(monthly.data)} />
        <ReportLine title="Yillik foyda" data={mapProfit(yearly.data)} />

        <Card>
          <h2 className="mb-4 text-lg font-bold">To‘lov turi bo‘yicha sotuv</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={overview.data?.paymentTypes?.map((item) => ({ name: item._id, value: item.amount })) || []} dataKey="value" nameKey="name" outerRadius={105}>
                  {(overview.data?.paymentTypes || []).map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-bold">Eng ko‘p qarzdor mijozlar</h2>
          {overview.data?.topDebtors?.length ? (
            <div className="space-y-3">
              {overview.data.topDebtors.map((item) => (
                <div key={item._id} className="flex items-center justify-between rounded-lg bg-white/65 p-3">
                  <div>
                    <p className="font-bold">{item.customerName}</p>
                    <p className="text-sm text-slate-500">{item.phone}</p>
                  </div>
                  <p className="font-bold text-rose-600">{formatCurrency(item.remainingAmount)}</p>
                </div>
              ))}
            </div>
          ) : <EmptyState />}
        </Card>
      </div>
    </div>
  );
}

function ReportLine({ title, data }) {
  return (
    <Card>
      <h2 className="mb-4 text-lg font-bold">{title}</h2>
      <div className="h-72">
        <ResponsiveContainer>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffe4e6" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Bar dataKey="amount" fill="#fecdd3" radius={[8, 8, 0, 0]} />
            <Line dataKey="profit" stroke="#10b981" strokeWidth={3} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
