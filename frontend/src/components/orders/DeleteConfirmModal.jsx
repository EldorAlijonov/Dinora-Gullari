import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function DeleteConfirmModal({ order, loading, onClose, onConfirm }) {
  return (
    <Modal open={Boolean(order)} title="Buyurtmani o'chirish" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-300">
          <span className="font-bold text-slate-100">{order?.customerName}</span> buyurtmasini o'chirishni tasdiqlaysizmi?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onClose}>Bekor qilish</Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>O'chirish</Button>
        </div>
      </div>
    </Modal>
  );
}
