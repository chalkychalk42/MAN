import styles from './loading.module.css';

export default function HistoryLoading() {
  return (
    <div className={styles.skeleton}>
      {/* Title skeleton */}
      <div className={styles.titleBar} />

      {/* Search skeleton */}
      <div className={styles.searchBar} />

      {/* Table skeleton */}
      <div className={styles.tableContainer}>
        <div className={styles.tableHeader} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.tableRow} />
        ))}
      </div>
    </div>
  );
}
