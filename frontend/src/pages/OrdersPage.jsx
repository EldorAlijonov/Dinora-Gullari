import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { DeleteConfirmModal } from '../components/orders/DeleteConfirmModal';
import { OrderCard } from '../components/orders/OrderCard';
import { OrderDetailsModal } from '../components/orders/OrderDetailsModal';
import { OrderFormModal } from '../components/orders/OrderFormModal';
import { OrdersTable } from '../components/orders/OrdersTable';
import { OrdersToolbar } from '../components/orders/OrdersToolbar';
import { StatusConfirmModal } from '../components/orders/StatusConfirmModal';
import { Button } from '../components/ui/Button';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import {
  useCreateOrderMutation,
  useDeleteOrderMutation,
  useOrdersQuery,
  useUpdateOrderMutation,
  useUpdateOrderStatusMutation,
} from '../services/api';

function isUnauthorized(error) {
  return error?.status === 401 || error?.originalStatus === 401;
}

function reportError(error) {
  if (!isUnauthorized(error)) toast.error('Xatolik yuz berdi. Qayta urinib ko‘ring');
}

export default function OrdersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');
  const returnTo = location.state?.returnTo || (location.state?.fromDashboard ? '/' : null);
  const returnLabel = location.state?.returnLabel || (returnTo === '/' ? 'Dashboardga qaytish' : 'Orqaga qaytish');
  const [params, setParams] = useState(() => ({
    filter: searchParams.get('filter') || undefined,
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
    date: searchParams.get('date') || undefined,
    page: 1,
    limit: 50,
  }));
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingSubmit, setPendingSubmit] = useState(null);
  const [viewMode, setViewModeState] = useState(() => {
    if (window.matchMedia('(max-width: 767px)').matches) return 'card';
    return localStorage.getItem('ordersViewMode') || 'table';
  });

  const { data: ordersResponse = [], isLoading, refetch } = useOrdersQuery(params);
  const data = Array.isArray(ordersResponse) ? ordersResponse : ordersResponse.items || [];
  const pagination = Array.isArray(ordersResponse)
    ? { page: 1, limit: data.length, total: data.length, totalPages: 1 }
    : ordersResponse;
  const [createOrder, createState] = useCreateOrderMutation();
  const [updateOrder, updateState] = useUpdateOrderMutation();
  const [deleteOrder, deleteState] = useDeleteOrderMutation();
  const [updateStatus, updateStatusState] = useUpdateOrderStatusMutation();

  useEffect(() => {
    localStorage.setItem('ordersViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams(location.search);
    setParams({
      filter: nextSearchParams.get('filter') || undefined,
      status: nextSearchParams.get('status') || undefined,
      search: nextSearchParams.get('search') || undefined,
      date: nextSearchParams.get('date') || undefined,
      page: 1,
      limit: 50,
    });
  }, [location.search]);

  const setFilterParams = (updater) => {
    setParams((current) => ({
      ...(typeof updater === 'function' ? updater(current) : updater),
      page: 1,
      limit: current.limit || 50,
    }));
  };

  const setViewMode = (mode) => setViewModeState(mode);

  const openCreate = () => {
    setEditingOrder(null);
    setModalOpen(true);
  };

  const openEdit = (order) => {
    setEditingOrder(order);
    setModalOpen(true);
  };

  const closeForm = () => {
    setModalOpen(false);
    setEditingOrder(null);
  };

  const submitOrder = async (values) => {
    setPendingSubmit(values);
  };

  const confirmSubmitOrder = async () => {
    try {
      if (editingOrder) {
        await updateOrder({ id: editingOrder._id, ...pendingSubmit }).unwrap();
        toast.success('Buyurtma muvaffaqiyatli yangilandi');
      } else {
        await createOrder(pendingSubmit).unwrap();
        toast.success('Buyurtma muvaffaqiyatli saqlandi');
      }
      setPendingSubmit(null);
      closeForm();
      refetch();
    } catch (error) {
      reportError(error);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteOrder(deletingOrder._id).unwrap();
      toast.success('Buyurtma o‘chirildi');
      setDeletingOrder(null);
      refetch();
    } catch (error) {
      reportError(error);
    }
  };

  const changeStatus = async (order, status) => {
    if (order.status === status) return;
    setPendingStatus({ order, status });
  };

  const confirmStatusChange = async () => {
    try {
      await updateStatus({ id: pendingStatus.order._id, status: pendingStatus.status }).unwrap();
      toast.success('Buyurtma statusi yangilandi');
      setPendingStatus(null);
      refetch();
    } catch (error) {
      reportError(error);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Gul buyurtmalari"
        description="Gul buketi va kompozitsiya buyurtmalari, olib ketish va Telegram xabarlarini boshqaring."
        action={returnTo && (
          <Button variant="secondary" onClick={() => navigate(returnTo)}>
            <ChevronLeft className="h-4 w-4" />
            {returnLabel}
          </Button>
        )}
      />
      <OrdersToolbar params={params} setParams={setFilterParams} viewMode={viewMode} setViewMode={setViewMode} onCreate={openCreate} />

      {highlightId && (
        <div className="rounded-lg border border-amber-300/20 bg-amber-400/10 p-4 text-sm font-semibold text-amber-100">
          Qarzdorlikdan ochilgan buyurtma ajratib ko‘rsatiladi.
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-white/10 bg-panel/70 p-8 text-center text-slate-400">Yuklanmoqda...</div>
      ) : data.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'table' ? (
        <>
          <OrdersTable orders={data} highlightId={highlightId} onView={setViewingOrder} onEdit={openEdit} onDelete={setDeletingOrder} onStatusChange={changeStatus} />
          <Pagination {...pagination} onPageChange={(page) => setParams((current) => ({ ...current, page }))} />
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.map((order) => (
              <OrderCard key={order._id} order={order} highlighted={order._id === highlightId} onView={setViewingOrder} onEdit={openEdit} onDelete={setDeletingOrder} onStatusChange={changeStatus} />
            ))}
          </div>
          <Pagination {...pagination} onPageChange={(page) => setParams((current) => ({ ...current, page }))} />
        </>
      )}

      <OrderDetailsModal order={viewingOrder} onClose={() => setViewingOrder(null)} />
      <OrderFormModal open={modalOpen} order={editingOrder} loading={createState.isLoading || updateState.isLoading} onClose={closeForm} onSubmit={submitOrder} />
      <ConfirmModal
        open={Boolean(pendingSubmit)}
        title={editingOrder ? 'Buyurtmani yangilash' : 'Buyurtmani saqlash'}
        description={editingOrder ? 'Ushbu gul buyurtmasidagi o‘zgarishlarni saqlashni tasdiqlaysizmi?' : 'Yangi gul buyurtmasini saqlashni tasdiqlaysizmi?'}
        loading={createState.isLoading || updateState.isLoading}
        onClose={() => setPendingSubmit(null)}
        onConfirm={confirmSubmitOrder}
      />
      <DeleteConfirmModal order={deletingOrder} loading={deleteState.isLoading} onClose={() => setDeletingOrder(null)} onConfirm={confirmDelete} />
      <StatusConfirmModal pending={pendingStatus} loading={updateStatusState.isLoading} onClose={() => setPendingStatus(null)} onConfirm={confirmStatusChange} />
    </div>
  );
}
