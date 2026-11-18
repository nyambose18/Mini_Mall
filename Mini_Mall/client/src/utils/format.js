export function money(cents) {
  const value = Number(cents || 0) / 100;
  return `R ${value.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function dateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function dateOnly(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const LABELS = {
  // payment
  awaiting_eft: 'Awaiting EFT',
  awaiting_confirmation: 'Awaiting confirmation',
  confirmed: 'Payment confirmed',
  failed: 'Payment failed',
  expired: 'EFT expired',
  due_on_delivery: 'Cash due on delivery',
  paid: 'Paid',
  // fulfilment
  pending: 'Not dispatched',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  // product
  draft: 'Draft',
  changes_requested: 'Changes requested',
  approved: 'Approved',
  delisting_requested: 'Delisting requested',
  delisted: 'Delisted',
  // refund
  requested: 'Requested',
  awaiting_return: 'Awaiting return',
  rejected: 'Rejected',
  return_received: 'Return received',
  refunded: 'Refunded',
};

export function statusLabel(status, kind = 'generic') {
  if (kind === 'product' && status === 'pending') return 'In review';
  if (kind === 'fulfilment' && status === 'pending') return 'Ready to pack';
  return LABELS[status] || String(status || 'Unknown').replaceAll('_', ' ');
}

const TONES = {
  awaiting_eft: 'warn',
  awaiting_confirmation: 'warn',
  confirmed: 'success',
  failed: 'danger',
  expired: 'danger',
  due_on_delivery: 'warn',
  paid: 'success',
  pending: 'neutral',
  dispatched: 'info',
  delivered: 'success',
  draft: 'neutral',
  changes_requested: 'danger',
  approved: 'success',
  delisting_requested: 'warn',
  delisted: 'danger',
  requested: 'warn',
  awaiting_return: 'info',
  rejected: 'danger',
  return_received: 'info',
  refunded: 'success',
};

export function badgeTone(status, kind = 'generic') {
  if (kind === 'product' && status === 'pending') return 'warn';
  if (kind === 'fulfilment' && status === 'pending') return 'neutral';
  return TONES[status] || 'neutral';
}

export function roleLanding(role) {
  if (role === 'seller') return '/seller/products';
  if (role === 'admin') return '/admin/catalogue';
  return '/products';
}

export function roleLabel(role) {
  if (role === 'seller') return 'Seller';
  if (role === 'admin') return 'Administrator';
  return 'Buyer';
}