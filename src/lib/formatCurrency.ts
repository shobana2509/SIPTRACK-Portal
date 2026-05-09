/**
 * Format a number into Indian currency abbreviations (Cr, L, K).
 * Used across all admin views and Excel/CSV exports.
 */
export function formatIndianCurrency(value: number, useRs: boolean = true): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const symbol = useRs ? 'Rs. ' : '₹';

  if (abs >= 10000000) {
    return `${sign}${symbol}${(abs / 10000000).toFixed(2)} Cr`;
  } else if (abs >= 100000) {
    return `${sign}${symbol}${(abs / 100000).toFixed(2)} L`;
  } else if (abs >= 1000) {
    return `${sign}${symbol}${(abs / 1000).toFixed(2)} K`;
  }
  return `${sign}${symbol}${abs.toLocaleString('en-IN')}`;
}
