import { clsx, type ClassValue } from 'clsx';

/**
 * Merges class names using clsx.
 * Handles conditional classes cleanly.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Promise-based delay utility.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates a random UUID using the Web Crypto API.
 */
export function generateId(): string {
  return crypto.randomUUID();
}
