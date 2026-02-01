import styles from './loading.module.css';

export default function AnalysisLoading() {
  return (
    <div className={styles.skeleton}>
      {/* Two-panel skeleton */}
      <div className={styles.panelRow}>
        <div className={styles.canvasSkeleton} />
        <div className={styles.feedSkeleton}>
          <div className={styles.feedHeading} />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.feedItem} />
          ))}
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className={styles.tabsSkeleton}>
        <div className={styles.tabBar}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.tabItem} />
          ))}
        </div>
        <div className={styles.tabContent}>
          <div className={styles.statGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.statCard} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
