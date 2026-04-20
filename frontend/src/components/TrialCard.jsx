export default function TrialCard({ trial, index }) {
  const statusColor = {
    RECRUITING: '#16a34a',
    ACTIVE_NOT_RECRUITING: '#d97706',
    COMPLETED: '#6366f1',
  };
  const color = statusColor[trial.status] || '#64748b';

  return (
    <div style={styles.card}>
      <div style={{ ...styles.badge, color, borderColor: color }}>
        {trial.status?.replace(/_/g, ' ')}
      </div>
      <a href={trial.url} target="_blank" rel="noreferrer" style={styles.title}>
        {trial.title}
      </a>
      <div style={styles.row}>
        <span>📍 {trial.location || 'N/A'}</span>
        <span>✉ {trial.contact || 'See listing'}</span>
      </div>
      {trial.eligibility && (
        <p style={styles.elig}>{trial.eligibility.slice(0, 250)}…</p>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 10,
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    border: '1px solid',
    borderRadius: 4,
    padding: '2px 8px',
    display: 'inline-block',
    marginBottom: 6,
  },
  title: {
    fontWeight: 600,
    fontSize: 14,
    color: '#14532d',
    display: 'block',
    textDecoration: 'none',
    marginBottom: 6,
  },
  row: { fontSize: 12, color: '#166534', display: 'flex', gap: 16, marginBottom: 6 },
  elig: { fontSize: 12, color: '#166534', margin: 0, lineHeight: 1.5 },
};