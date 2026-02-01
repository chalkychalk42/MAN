import styles from './loading.module.css';

export default function WalletLoading() {
  return (
    <div className={styles.skeleton}>
      {/* Profile header skeleton */}
      <div className={styles.profileSkeleton}>
        <div className={styles.profileTitle} />
        <div className={styles.profileTags} />
        <div className={styles.statsRow}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.miniCard} />
          ))}
        </div>
      </div>

      {/* Charts grid skeleton */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard} />
        <div className={styles.chartCard} />
      </div>

      {/* Transaction history skeleton */}
      <div className={styles.tableSkeleton}>
        <div className={styles.tableHeading} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={styles.tableRow} />
        ))}
      </div>
    </div>
  );
}
