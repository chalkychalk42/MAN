'use client';

import React from 'react';
import clsx from 'clsx';
import styles from './Table.module.css';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  mono?: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface TableProps<T extends Record<string, unknown>> {
  columns: TableColumn[];
  data: T[];
  onSort?: (key: string) => void;
  sortBy?: string;
  sortDir?: SortDirection;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
  emptyMessage?: string;
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onSort,
  sortBy,
  sortDir,
  onRowClick,
  className,
  emptyMessage = 'No data available',
}: TableProps<T>) {
  const handleSort = (column: TableColumn) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    row: T,
    index: number
  ) => {
    if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onRowClick(row, index);
    }
  };

  return (
    <div className={clsx(styles.tableContainer, className)}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            {columns.map((col) => {
              const isActive = sortBy === col.key;
              return (
                <th
                  key={col.key}
                  className={clsx(
                    styles.th,
                    col.sortable && styles.sortable,
                    isActive && styles.sortActive
                  )}
                  onClick={() => handleSort(col)}
                  aria-sort={
                    isActive
                      ? sortDir === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <span className={styles.thInner}>
                    {col.label}
                    {col.sortable && (
                      <span className={styles.sortArrow}>
                        <span
                          className={clsx(
                            styles.arrowUp,
                            isActive && sortDir === 'desc' && styles.arrowDimmed
                          )}
                        >
                          &#9650;
                        </span>
                        <span
                          className={clsx(
                            styles.arrowDown,
                            isActive && sortDir === 'asc' && styles.arrowDimmed
                          )}
                        >
                          &#9660;
                        </span>
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {data.length === 0 ? (
            <tr>
              <td className={styles.emptyRow} colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={clsx(
                  styles.tr,
                  onRowClick && styles.clickableRow
                )}
                onClick={() => onRowClick?.(row, rowIndex)}
                onKeyDown={(e) => handleKeyDown(e, row, rowIndex)}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(styles.td, col.mono && styles.mono)}
                  >
                    {row[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

Table.displayName = 'Table';
