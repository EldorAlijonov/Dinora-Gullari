import { motion } from 'framer-motion';
import { BarChart3, CalendarDays, Flower2, Home, ReceiptText, Settings, ShoppingBag, WalletCards, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useSettingsQuery } from '../../services/api';
import { Button } from '../ui/Button';

const nav = [
  { to: '/', label: 'Dashboard', icon: Home },
  { to: '/orders', label: 'Gul buyurtmalari', icon: ShoppingBag },
  { to: '/sales', label: 'Sovg‘a/tovarlar', icon: ReceiptText },
  { to: '/debts', label: 'Qarzlar', icon: WalletCards },
  { to: '/archive', label: 'Tarix', icon: CalendarDays },
  { to: '/reports', label: 'Hisobotlar', icon: BarChart3 },
  { to: '/settings', label: 'Sozlamalar', icon: Settings },
];

export function Sidebar({ collapsed, mobileOpen, onClose }) {
  const { data: settings } = useSettingsQuery();
  const content = (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-rose-400 to-fuchsia-500 text-white shadow-glow">
            {settings?.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-cover" /> : <Flower2 className="h-6 w-6" />}
          </div>
          {!collapsed && (
            <div>
              <p className="text-lg font-bold text-slate-100">{settings?.storeName || 'Dinora Gullari'}</p>
              <p className="text-xs font-semibold text-rose-200/80">Florist CRM</p>
            </div>
          )}
        </div>
        <Button variant="ghost" className="px-2 lg:hidden" onClick={onClose}><X className="h-5 w-5" /></Button>
      </div>

      <nav className="mt-8 flex flex-col gap-2">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              title={item.label}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'border border-rose-300/20 bg-gradient-to-r from-rose-400/20 to-sky-400/10 text-white shadow-glow'
                    : 'text-slate-400 hover:bg-white/8 hover:text-slate-100'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      <motion.aside
        animate={{ width: collapsed ? 88 : 276 }}
        className="sticky top-0 hidden h-screen shrink-0 border-r border-white/10 bg-slate-950/45 p-5 backdrop-blur-xl lg:block"
      >
        {content}
      </motion.aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm lg:hidden" onClick={onClose}>
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="h-full w-72 border-r border-white/10 bg-slate-950 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            {content}
          </motion.aside>
        </div>
      )}
    </>
  );
}
