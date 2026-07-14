import { Bell, CheckCheck, ExternalLink, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../../features/auth/authSlice';
import { useAdminNotificationsQuery, useLogoutMutation, useResolveNotificationMutation, useResolveSentNotificationsMutation, useSettingsQuery } from '../../services/api';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { Button } from '../ui/Button';

const titles = {
  '/': 'Dashboard',
  '/orders': 'Gul buyurtmalari',
  '/sales': 'Sovg‘a/tovarlar',
  '/debts': 'Qarzdorlik',
  '/reports': 'Hisobotlar',
  '/settings': 'Sozlamalar',
};

const searchablePaths = new Set(['/orders', '/sales', '/debts']);

const toneStyles = {
  danger: {
    label: 'Juda muhim',
    toast: 'border-rose-300/30 bg-rose-950/95 text-rose-50',
    toastAccent: 'bg-rose-400',
    item: 'border-rose-300/30 bg-rose-500/10 hover:bg-rose-500/15',
    badge: 'bg-rose-500/20 text-rose-100',
    title: 'text-rose-50',
    text: 'text-rose-100/80',
    meta: 'text-rose-100/65',
    action: 'border-rose-200/20 bg-rose-950/80 text-rose-100',
  },
  warning: {
    label: 'Muhim',
    toast: 'border-amber-300/30 bg-amber-950/95 text-amber-50',
    toastAccent: 'bg-amber-300',
    item: 'border-amber-300/30 bg-amber-400/10 hover:bg-amber-400/15',
    badge: 'bg-amber-400/20 text-amber-100',
    title: 'text-amber-50',
    text: 'text-amber-100/80',
    meta: 'text-amber-100/65',
    action: 'border-amber-200/20 bg-amber-950/80 text-amber-100',
  },
  success: {
    label: 'Bajarildi',
    toast: 'border-emerald-300/30 bg-emerald-950/95 text-emerald-50',
    toastAccent: 'bg-emerald-300',
    item: 'border-emerald-300/30 bg-emerald-400/10 hover:bg-emerald-400/15',
    badge: 'bg-emerald-400/20 text-emerald-100',
    title: 'text-emerald-50',
    text: 'text-emerald-100/80',
    meta: 'text-emerald-100/65',
    action: 'border-emerald-200/20 bg-emerald-950/80 text-emerald-100',
  },
  info: {
    label: 'Ma’lumot',
    toast: 'border-sky-300/30 bg-sky-950/95 text-sky-50',
    toastAccent: 'bg-sky-300',
    item: 'border-sky-300/25 bg-sky-400/10 hover:bg-sky-400/15',
    badge: 'bg-sky-400/20 text-sky-100',
    title: 'text-sky-50',
    text: 'text-sky-100/80',
    meta: 'text-sky-100/65',
    action: 'border-sky-200/20 bg-sky-950/80 text-sky-100',
  },
};

function notificationStyles(tone) {
  return toneStyles[tone] || toneStyles.info;
}

function readSeenNotificationToasts() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem('adminNotificationToastSeen') || '[]'));
  } catch {
    return new Set();
  }
}

function saveSeenNotificationToasts(seen) {
  sessionStorage.setItem('adminNotificationToastSeen', JSON.stringify([...seen]));
}

function isWritingFieldActive() {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName?.toLowerCase();
  return activeElement.isContentEditable || ['input', 'textarea', 'select'].includes(tagName);
}

function formatUzbekHeaderDate(date = new Date()) {
  const days = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
  const months = [
    'yanvar',
    'fevral',
    'mart',
    'aprel',
    'may',
    'iyun',
    'iyul',
    'avgust',
    'sentabr',
    'oktabr',
    'noyabr',
    'dekabr',
  ];

  return `${date.getDate()}-${months[date.getMonth()]}, ${days[date.getDay()]}`;
}

export function Topbar({ collapsed, onToggleSidebar, onOpenMobile }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const { data: settings } = useSettingsQuery();
  const location = useLocation();
  const { pathname } = location;
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [topbarSearch, setTopbarSearch] = useState('');
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState(() => new Set());
  const seenToastIds = useRef(readSeenNotificationToasts());
  const { data: notifications = [], isFetching, refetch: refetchNotifications } = useAdminNotificationsQuery(undefined, {
    pollingInterval: 60_000,
  });
  const [resolveNotification] = useResolveNotificationMutation();
  const [resolveSentNotifications, resolveSentState] = useResolveSentNotificationsMutation();
  const [logoutRequest] = useLogoutMutation();

  const visibleNotifications = useMemo(
    () => notifications.filter((item) => !dismissedNotificationIds.has(item.id)),
    [dismissedNotificationIds, notifications],
  );
  const urgentCount = visibleNotifications.filter((item) => item.tone === 'danger' || item.tone === 'warning').length;
  const successNotificationIds = visibleNotifications.filter((item) => item.tone === 'success').map((item) => item.id);
  const successCount = successNotificationIds.length;
  const isSearchablePage = searchablePaths.has(pathname);

  const updatePageSearch = (value) => {
    const nextParams = new URLSearchParams(location.search);
    if (value.trim()) nextParams.set('search', value);
    else nextParams.delete('search');
    const query = nextParams.toString();
    navigate(`${pathname}${query ? `?${query}` : ''}${location.hash}`, { replace: true });
  };

  const changeTopbarSearch = (value) => {
    setTopbarSearch(value);
    if (isSearchablePage) updatePageSearch(value);
  };

  const clearTopbarSearch = () => {
    setTopbarSearch('');
    if (isSearchablePage) updatePageSearch('');
  };

  const submitTopbarSearch = () => {
    const value = topbarSearch.trim();
    if (!value || isSearchablePage) return;
    navigate(`/orders?search=${encodeURIComponent(value)}`);
  };

  const handleLogout = async () => {
    try {
      await logoutRequest().unwrap();
    } catch {
      // Local logout still protects the UI if the network is unavailable.
    }
    dispatch(logout());
  };

  const openNotification = useCallback(async (item) => {
    if (item.url) {
      const returnTo = `${location.pathname}${location.search}${location.hash}`;
      navigate(item.url, {
        state: {
          returnTo,
          returnLabel: returnTo === '/' ? 'Dashboardga qaytish' : 'Avvalgi bo‘limga qaytish',
        },
      });
    }
    if (!item.url && item.notificationId) {
      try {
        await resolveNotification(item.notificationId).unwrap();
        setDismissedNotificationIds((current) => new Set(current).add(item.id));
        refetchNotifications();
      } catch {
        toast.error('Bildirishnomani roвЂyxatdan olishda xatolik');
      }
    }
    setNotificationsOpen(false);
  }, [location.hash, location.pathname, location.search, navigate, refetchNotifications, resolveNotification]);

  const clearSuccessNotifications = async () => {
    if (successCount === 0) return;
    try {
      await resolveSentNotifications().unwrap();
      setDismissedNotificationIds((current) => new Set([...current, ...successNotificationIds]));
      refetchNotifications();
    } catch {
      toast.error('Yashil bildirishnomalarni tozalashda xatolik');
    }
  };

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setNotificationsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [notificationsOpen]);

  useEffect(() => {
    if (isSearchablePage) {
      setTopbarSearch(new URLSearchParams(location.search).get('search') || '');
    } else {
      setTopbarSearch('');
    }
  }, [isSearchablePage, location.search, pathname]);

  useEffect(() => {
    const importantNotifications = visibleNotifications
      .filter((item) => ['danger', 'warning'].includes(item.tone))
      .filter((item) => !seenToastIds.current.has(item.id));

    if (importantNotifications.length === 0) return;

    importantNotifications.forEach((item) => seenToastIds.current.add(item.id));
    saveSeenNotificationToasts(seenToastIds.current);

    if (isWritingFieldActive()) return;

    importantNotifications.slice(0, 2).forEach((item) => {
      const styles = notificationStyles(item.tone);

      toast.custom(
        (toastItem) => (
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              openNotification(item);
              toast.dismiss(toastItem.id);
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              openNotification(item);
              toast.dismiss(toastItem.id);
            }}
            className={`pointer-events-auto w-[min(92vw,380px)] overflow-hidden rounded-lg border text-left shadow-panel backdrop-blur-xl transition ${styles.toast}`}
          >
            <div className={`h-1 ${styles.toastAccent}`} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">{styles.label}</p>
                  <p className="mt-1 text-sm font-bold">{item.title}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.url && <ExternalLink className="h-4 w-4 opacity-70" />}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toast.dismiss(toastItem.id);
                    }}
                    className="grid h-7 w-7 place-items-center rounded-lg border border-white/10 bg-white/10 text-current transition hover:bg-white/15"
                    title="Yopish"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 line-clamp-3 text-xs leading-5 opacity-85">{item.message}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold opacity-75">
                {item.amount !== undefined && <span>{formatCurrency(item.amount)}</span>}
                <span>{formatDate(item.createdAt)}</span>
              </div>
            </div>
          </div>
        ),
        { duration: item.tone === 'danger' ? 9000 : 6500 },
      );
    });
  }, [openNotification, visibleNotifications]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/75 px-4 py-3 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" className="px-2 lg:hidden" onClick={onOpenMobile}><Menu className="h-5 w-5" /></Button>
        <Button variant="ghost" className="hidden px-2 lg:inline-flex" onClick={onToggleSidebar}>
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-200/80">{formatUzbekHeaderDate()}</p>
          <h1 className="truncate text-xl font-bold text-slate-100">{titles[pathname] || settings?.storeName || 'Dinora Gullari'}</h1>
        </div>

        <div className="ml-auto hidden w-full max-w-md items-center gap-2 rounded-lg border border-white/10 bg-slate-950/35 px-3 py-2 text-slate-400 md:flex">
          <Search className="h-4 w-4" />
          <input
            className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
            placeholder="Qidiruv..."
            value={topbarSearch}
            onChange={(event) => changeTopbarSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitTopbarSearch();
            }}
          />
          {topbarSearch && (
            <button
              type="button"
              onClick={clearTopbarSearch}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
              title="Qidiruvni tozalash"
              aria-label="Qidiruvni tozalash"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <Button variant="secondary" className="relative px-3" onClick={() => setNotificationsOpen((value) => !value)} title="Bildirishnomalar">
            <Bell className="h-4 w-4" />
            {urgentCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {urgentCount}
              </span>
            )}
          </Button>

          {notificationsOpen && (
            <div className="absolute right-0 top-12 z-50 w-[min(92vw,440px)] overflow-hidden rounded-lg border border-white/10 bg-slate-950/95 shadow-panel backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-slate-100">Admin bildirishnomalari</p>
                  <p className="text-xs text-slate-500">{isFetching ? 'Yangilanmoqda...' : `${visibleNotifications.length} ta vazifa`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/8 px-2 py-1 text-xs font-bold text-rose-200">{urgentCount} muhim</span>
                  <Button
                    variant="ghost"
                    className="px-2 py-2 text-emerald-200"
                    disabled={successCount === 0}
                    loading={resolveSentState.isLoading}
                    onClick={clearSuccessNotifications}
                    title="Yashil bildirishnomalarni tozalash"
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span className="hidden text-xs lg:inline">Tozalash</span>
                  </Button>
                  <Button variant="ghost" className="px-2 py-2" onClick={() => setNotificationsOpen(false)} title="Yopish">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-2">
                {visibleNotifications.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-slate-500">
                    Hozircha bildirishnoma yo‘q
                  </div>
                ) : (
                  <div className="space-y-2">
                    {visibleNotifications.map((item) => {
                      const styles = notificationStyles(item.tone);

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => openNotification(item)}
                          className={`w-full rounded-lg border p-3 text-left transition ${styles.item}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${styles.badge}`}>
                              {item.order}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm font-bold ${styles.title}`}>{item.title}</p>
                                {item.url && <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />}
                              </div>
                              <p className={`mt-1 line-clamp-2 text-xs leading-5 ${styles.text}`}>{item.message}</p>
                              <div className={`mt-2 flex flex-wrap gap-2 text-[11px] font-semibold ${styles.meta}`}>
                                {item.amount !== undefined && <span>{formatCurrency(item.amount)}</span>}
                                <span>{formatDate(item.createdAt)}</span>
                              </div>
                              <div className={`mt-3 inline-flex rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${styles.action}`}>
                                {item.url ? 'Ko‘rish va bartaraf etish' : 'Ro‘yxatdan olish'}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold text-slate-100">{user?.fullName || 'Admin'}</p>
          <p className="text-xs text-slate-400">{user?.role || 'admin'}</p>
        </div>
        {user?.avatarUrl && <img src={user.avatarUrl} alt="Profil" className="hidden h-10 w-10 rounded-full border border-white/10 object-cover sm:block" />}
        <Button variant="ghost" onClick={handleLogout} className="px-3" title="Chiqish">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
