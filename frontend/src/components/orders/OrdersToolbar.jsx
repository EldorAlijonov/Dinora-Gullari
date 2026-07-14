import { Grid2X2, List, Plus, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { orderStatuses } from './StatusBadge';

export function OrdersToolbar({ params, setParams, viewMode, setViewMode, onCreate }) {
  return (
    <Card>
      <div className="grid gap-3 xl:grid-cols-[1fr_auto_auto] xl:items-center">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Mijoz, telefon yoki gul buyurtmasi"
            value={params.search || ''}
            onChange={(e) => setParams((p) => ({ ...p, search: e.target.value || undefined }))}
            rightElement={params.search && (
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, search: undefined }))}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
                title="Qidiruvni tozalash"
                aria-label="Qidiruvni tozalash"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          />
          <Select value={params.status || ''} onChange={(e) => setParams((p) => ({ ...p, status: e.target.value || undefined }))}>
            <option value="">Barcha statuslar</option>
            {orderStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
          <Input type="date" value={params.date || ''} onChange={(e) => setParams((p) => ({ ...p, date: e.target.value || undefined }))} />
        </div>

        <div className="flex rounded-lg border border-white/10 bg-slate-950/30 p-1">
          <Button variant={viewMode === 'table' ? 'primary' : 'ghost'} className="px-3" onClick={() => setViewMode('table')}><List className="h-4 w-4" /> Ro'yxat</Button>
          <Button variant={viewMode === 'card' ? 'primary' : 'ghost'} className="px-3" onClick={() => setViewMode('card')}><Grid2X2 className="h-4 w-4" /> Card</Button>
        </div>

        <Button onClick={onCreate}><Plus className="h-4 w-4" /> Yangi gul buyurtmasi</Button>
      </div>
    </Card>
  );
}
