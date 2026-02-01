const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

/**
 * Validates whether a string is a plausible Solana address.
 * Checks for base58 encoding and appropriate length (32-44 characters).
 */
export function isValidSolanaAddress(address: string): boolean {
  if (!address || address.length < 32 || address.length > 44) {
    return false;
  }
  return BASE58_REGEX.test(address);
}

/**
 * Truncates a Solana address for display purposes.
 * Example: "AbCdEfGh...WxYz1234"
 */
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
