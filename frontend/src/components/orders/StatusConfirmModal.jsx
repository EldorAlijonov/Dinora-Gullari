import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { statusLabel } from './StatusBadge';

export function StatusConfirmModal({ pending, loading, onClose, onConfirm }) {
  return (
    <Modal open={Boolean(pending)} title="Statusni o'zgartirish" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-300">
          <span className="font-semibold text-slate-100">{pending?.order?.customerName}</span> buyurtmasi statusini{' '}
          <span className="font-semibold text-sky-200">{statusLabel(pending?.status)}</span> holatiga o'zgartirishni tasdiqlaysizmi?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onClose}>Bekor qilish</Button>
          <Button loading={loading} onClick={onConfirm}>Tasdiqlash</Button>
        </div>
      </div>
    </Modal>
  );
}
