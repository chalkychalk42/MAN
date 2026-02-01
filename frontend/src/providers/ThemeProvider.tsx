'use client';

import { type ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme provider placeholder.
 * Currently passes children through unchanged.
 * Future: will support light/dark mode toggling.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>;
}
