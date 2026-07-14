import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

const quietEndpoints = new Set(['adminNotifications', 'publicSettings']);

export function GlobalLoadingIndicator() {
  const apiState = useSelector((state) => state.api);
  const [visible, setVisible] = useState(false);

  const isBusy = useMemo(() => {
    const pendingQueries = Object.values(apiState?.queries || {}).some(
      (query) => query?.status === 'pending' && !quietEndpoints.has(query.endpointName),
    );
    const pendingMutations = Object.values(apiState?.mutations || {}).some((mutation) => mutation?.status === 'pending');
    return pendingQueries || pendingMutations;
  }, [apiState]);

  useEffect(() => {
    if (!isBusy) {
      setVisible(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setVisible(true), 350);
    return () => window.clearTimeout(timer);
  }, [isBusy]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80]">
      <div className="h-1 overflow-hidden bg-slate-950/60">
        <div className="h-full w-1/2 animate-[loading-slide_1.15s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-rose-300 via-sky-300 to-emerald-300 shadow-glow" />
      </div>
      <div className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-slate-200 shadow-panel backdrop-blur-xl">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-300" />
        Ma'lumotlar yuklanmoqda...
      </div>
    </div>
  );
}
