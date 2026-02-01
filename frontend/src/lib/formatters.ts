/**
 * Formats a number with commas and appropriate decimal places.
 * Numbers >= 1 get 2 decimals; numbers < 1 get up to 6 significant decimals.
 */
export function formatNumber(n: number): string {
  if (n === 0) return '0';

  const abs = Math.abs(n);

  if (abs >= 1) {
    return n.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  // For very small numbers, show up to 6 decimal places
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}

/**
 * Formats a number as currency.
 * Example: formatCurrency(1234.5) => "$1,234.50"
 */
export function formatCurrency(n: number, currency: string = 'USD'): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a number as a percentage with a sign prefix.
 * Example: formatPercentage(123.456) => "+123.45%"
 *          formatPercentage(-12.34)  => "-12.34%"
 */
export function formatPercentage(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

/**
 * Formats a number as SOL with 3 decimal places.
 * Example: formatSol(1.2345) => "1.234 SOL"
 */
export function formatSol(n: number): string {
  return `${n.toLocaleString('en-US', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })} SOL`;
}

/**
 * Formats an ISO date string as a relative time string.
 * Examples: "just now", "2m ago", "3h ago", "5d ago", "2w ago"
 */
export function formatTimeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffSeconds = Math.floor((now - then) / 1000);

  if (diffSeconds < 60) return 'just now';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  const diffYears = Math.floor(diffDays / 365);
  return `${diffYears}y ago`;
}

/**
 * Formats a duration given in hours into a human-readable string.
 * Examples: formatDuration(0.5)  => "30m"
 *           formatDuration(2.5)  => "2h 30m"
 *           formatDuration(75)   => "3d 3h"
 */
export function formatDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes}m`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  const remainingMinutes = Math.round((hours % 1) * 60);

  if (days > 0) {
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  return remainingMinutes > 0
    ? `${remainingHours}h ${remainingMinutes}m`
    : `${remainingHours}h`;
}
