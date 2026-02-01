import styles from './loading.module.css';

export default function DashboardLoading() {
  return (
    <div className={styles.skeleton}>
      {/* Title skeleton */}
      <div className={styles.titleBar} />

      {/* CA Input skeleton */}
      <div className={styles.inputSkeleton}>
        <div className={styles.inputHeading} />
        <div className={styles.inputSubtext} />
        <div className={styles.inputField} />
      </div>

      {/* Quick Stats skeleton */}
      <div className={styles.statsRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.statCard} />
        ))}
      </div>

      {/* Recent Scans skeleton */}
      <div className={styles.sectionHeading} />
      <div className={styles.scanGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.scanCard} />
        ))}
      </div>
    </div>
  );
}
