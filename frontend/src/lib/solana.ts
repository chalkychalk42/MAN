const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]+$/;

/** One SOL expressed in lamports. */
const LAMPORTS_PER_SOL = 1_000_000_000;

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

/**
 * Converts lamports (the smallest Solana denomination) to SOL.
 * 1 SOL = 1,000,000,000 lamports.
 */
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Converts SOL to lamports.
 */
export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}
