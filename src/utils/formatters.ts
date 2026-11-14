export function formatCurrency(amount: number, currency = 'BDT', compact = false): string {
  const symbol = currency === 'USD' ? '$' : '৳';
  const converted = currency === 'USD' ? Math.round(amount / 110) : Math.round(amount);

  if (compact) {
    if (converted >= 10000000) {
      return `${symbol}${(converted / 1000000).toFixed(2)}M`;
    }
    if (converted >= 1000000) {
      return `${symbol}${(converted / 1000000).toFixed(2)}M`;
    }
    if (converted >= 1000) {
      return `${symbol}${(converted / 1000).toFixed(0)}K`;
    }
  }

  return `${symbol}${converted.toLocaleString('en-US')}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

export function formatDateShort(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
