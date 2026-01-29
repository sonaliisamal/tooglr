import styles from '../styles/Dashboard.module.css';

export default function DashboardPage() {
  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.monthHeader}>
        <h2>JANUARY</h2>
      </header>
      
      {/* Visual Placeholder for the Habit Table */}
      <section className={styles.sheetSection}>
        <div className={styles.placeholderTable}>
          Habit Tracking Grid Placeholder (Week 1, 2, 3)
        </div>
      </section>

      {/* Visual Placeholder for the Graphs */}
      <section className={styles.graphSection}>
        <div className={styles.placeholderGraph}>
          Consistency Graph & Progress Stats Placeholder
        </div>
      </section>
    </div>
  );
}