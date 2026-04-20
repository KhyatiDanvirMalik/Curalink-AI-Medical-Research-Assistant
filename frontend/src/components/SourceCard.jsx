export default function SourceCard({ source, index }) {
  return (
    <div style={styles.card}>
      <div style={styles.badge}>PUB{index + 1} · {source.platform}</div>
      <a href={source.url} target="_blank" rel="noreferrer" style={styles.title}>
        {source.title}
      </a>
      <div style={styles.meta}>
        {source.authors?.slice(0, 3).join(', ')}
        {source.authors?.length > 3 ? ' et al.' : ''} · {source.year}
      </div>
      {source.snippet && <p style={styles.snippet}>{source.snippet}…</p>}
    </div>
  );
}

const styles = {
  card: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 10,
  },
  badge: {
    fontSize: 11,
    fontWeight: 600,
    color: '#4f46e5',
    background: '#ede9fe',
    borderRadius: 4,
    padding: '2px 8px',
    display: 'inline-block',
    marginBottom: 6,
  },
  title: {
    fontWeight: 600,
    fontSize: 14,
    color: '#1e293b',
    display: 'block',
    textDecoration: 'none',
    marginBottom: 4,
  },
  meta: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  snippet: { fontSize: 12, color: '#475569', margin: 0, lineHeight: 1.5 },
};