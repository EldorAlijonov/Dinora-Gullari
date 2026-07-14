import { Button } from './Button';
import { Modal } from './Modal';

export function ConfirmModal({
  open,
  title = 'Amalni tasdiqlash',
  description,
  confirmText = 'Tasdiqlash',
  cancelText = 'Bekor qilish',
  variant = 'primary',
  loading,
  onClose,
  onConfirm,
}) {
  return (
    <Modal open={open} title={title} onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm leading-6 text-slate-300">{description}</p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" onClick={onClose}>{cancelText}</Button>
          <Button variant={variant} loading={loading} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
}
