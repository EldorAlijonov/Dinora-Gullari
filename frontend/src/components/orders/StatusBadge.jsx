import { Badge } from '../ui/Badge';

export const orderStatuses = [
  ['new', 'Yangi'],
  ['in_progress', 'Jarayonda'],
  ['ready', 'Tayyor'],
  ['picked_up', 'Olib ketildi'],
  ['cancelled', 'Bekor qilindi'],
];

const variants = {
  new: 'sky',
  in_progress: 'violet',
  ready: 'emerald',
  picked_up: 'slate',
  cancelled: 'rose',
};

export function statusLabel(status) {
  return orderStatuses.find(([value]) => value === status)?.[1] || status;
}

export function StatusBadge({ status }) {
  return <Badge variant={variants[status] || 'slate'} className="w-[72px] justify-center text-center">{statusLabel(status)}</Badge>;
}
