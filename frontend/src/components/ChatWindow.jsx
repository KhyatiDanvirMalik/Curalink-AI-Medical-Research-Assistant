import { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { sendMessage, loadHistory } from '../api/chat';

export default function ChatWindow({ sessionId, disease, patientName, location, onFirstMessage }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const isFirstMessage = useRef(true);
  const bottomRef = useRef(null);

  // Load history for this session
  useEffect(() => {
    setMessages([]);
    setHistoryLoaded(false);
    isFirstMessage.current = true;

    const fetchHistory = async () => {
      try {
        const data = await loadHistory(sessionId);
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
          isFirstMessage.current = false;
        }
      } catch (err) {
        console.log('No history found.');
      } finally {
        setHistoryLoaded(true);
      }
    };

    if (sessionId) fetchHistory();
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Update sidebar title with first message
    if (isFirstMessage.current && onFirstMessage) {
      onFirstMessage(sessionId, text);
      isFirstMessage.current = false;
    }

    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const data = await sendMessage({
        sessionId,
        userMessage: text,
        disease,
        patientName,
        location,
      });
      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      setError(
        err.response?.data?.error || 'Something went wrong. Is the backend running?'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!historyLoaded) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.loadingText}>Loading session...</div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.feed}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔬</div>
            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 18, marginBottom: 8 }}>
              Hello{patientName && patientName !== 'Anonymous' ? `, ${patientName}` : ''}
            </div>
            <div style={{ color: '#64748b', fontSize: 14, maxWidth: 340, lineHeight: 1.6 }}>
              Ask me anything about <strong>{disease}</strong>. I'll search the latest
              publications and clinical trials to give you research-backed answers.
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}

        {loading && (
          <div style={styles.typingWrap}>
            <div style={styles.typingBubble}>
              <span style={styles.dot} />
              <span style={styles.dot} />
              <span style={styles.dot} />
              <span style={{ marginLeft: 8, fontSize: 12, color: '#64748b' }}>
                Searching research & generating response...
              </span>
            </div>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Ask about ${disease || 'your condition'}...`}
          disabled={loading}
        />
        <button
          style={{
            ...styles.btn,
            opacity: loading || !input.trim() ? 0.5 : 1,
            cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
          }}
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#f8fafc',
  },
  feed: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px 20px',
  },
  loadingWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: { color: '#94a3b8', fontSize: 14 },
  empty: {
    textAlign: 'center',
    padding: '80px 20px 40px',
  },
  typingWrap: {
    display: 'flex',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  typingBubble: {
    display: 'flex',
    alignItems: 'center',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '18px 18px 18px 4px',
    padding: '10px 16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  dot: {
    width: 7,
    height: 7,
    background: '#4f46e5',
    borderRadius: '50%',
    margin: '0 2px',
    display: 'inline-block',
    animation: 'pulse 1s infinite',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    color: '#dc2626',
    padding: '10px 14px',
    fontSize: 13,
    marginTop: 8,
  },
  inputRow: {
    display: 'flex',
    gap: 8,
    padding: '12px 16px',
    background: '#ffffff',
    borderTop: '1px solid #e2e8f0',
  },
  input: {
    flex: 1,
    border: '1px solid #cbd5e1',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  },
  btn: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 20px',
    fontWeight: 600,
    fontSize: 14,
    fontFamily: 'inherit',
  },
};
