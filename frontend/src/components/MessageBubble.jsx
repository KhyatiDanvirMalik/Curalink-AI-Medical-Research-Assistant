import ReactMarkdown from 'react-markdown';
import SourceCard from './SourceCard';
import TrialCard from './TrialCard';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: 20 }}>
      <div style={{ maxWidth: '85%' }}>
        {/* Chat bubble */}
        <div
          style={{
            background: isUser ? '#4f46e5' : '#ffffff',
            color: isUser ? '#fff' : '#1e293b',
            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            padding: '12px 16px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          {isUser ? (
            <span>{message.content}</span>
          ) : (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={styles.sectionLabel}>📄 Research Sources</div>
            {message.sources.map((s, i) => (
              <SourceCard key={i} source={s} index={i} />
            ))}
          </div>
        )}

        {/* Trials */}
        {!isUser && message.trials?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={styles.sectionLabel}>🧪 Clinical Trials</div>
            {message.trials.map((t, i) => (
              <TrialCard key={i} trial={t} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  sectionLabel: {
    fontWeight: 600,
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
};