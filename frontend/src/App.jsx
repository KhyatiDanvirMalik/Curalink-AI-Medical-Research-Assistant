import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatWindow from './components/ChatWindow';

const SESSIONS_KEY = 'curalink_sessions';
const CURRENT_KEY = 'curalink_current';

function getAllSessions() {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSession(session) {
  const all = getAllSessions();
  const existing = all.findIndex((s) => s.sessionId === session.sessionId);
  if (existing >= 0) {
    all[existing] = { ...all[existing], ...session };
  } else {
    all.unshift(session);
  }
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(all.slice(0, 50)));
}

export default function App() {
  const [step, setStep] = useState('setup');
  const [form, setForm] = useState({ patientName: '', disease: '', location: '' });
  const [currentSession, setCurrentSession] = useState(null);
  const [allSessions, setAllSessions] = useState(getAllSessions());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const startNewSession = (formData) => {
    const sessionId = uuidv4();
    const session = {
      sessionId,
      patientName: formData.patientName || 'Anonymous',
      disease: formData.disease,
      location: formData.location || '',
      title: `${formData.disease} session`,
      createdAt: new Date().toISOString(),
    };
    saveSession(session);
    setAllSessions(getAllSessions());
    setCurrentSession(session);
    localStorage.setItem(CURRENT_KEY, sessionId);
    setStep('chat');
  };

  const loadSession = (session) => {
    setCurrentSession(session);
    setForm({
      patientName: session.patientName,
      disease: session.disease,
      location: session.location,
    });
    setStep('chat');
  };

  const handleFirstMessage = (sessionId, firstMessage) => {
    const truncated = firstMessage.slice(0, 40) + (firstMessage.length > 40 ? '...' : '');
    const updated = { ...currentSession, title: truncated };
    saveSession(updated);
    setAllSessions(getAllSessions());
    setCurrentSession(updated);
  };

  const deleteSession = (sessionId, e) => {
    e.stopPropagation();
    const all = getAllSessions().filter((s) => s.sessionId !== sessionId);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
    setAllSessions(all);
    if (currentSession?.sessionId === sessionId) {
      setStep('setup');
      setCurrentSession(null);
    }
  };

  if (step === 'setup') {
    return (
      <div style={styles.root}>
        {/* Sidebar on setup screen too */}
        <div style={{ ...styles.sidebar, width: sidebarOpen ? 260 : 0, overflow: 'hidden', transition: 'width 0.2s' }}>
          <SidebarContent
            allSessions={allSessions}
            currentSession={currentSession}
            loadSession={loadSession}
            deleteSession={deleteSession}
            onNewSession={() => setStep('setup')}
          />
        </div>

        <div style={styles.setupWrap}>
          <button style={styles.sidebarToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <div style={styles.setupCard}>
            <div style={styles.logo}>🔬 Curalink</div>
            <div style={styles.tagline}>AI Medical Research Assistant</div>
            <input
              style={styles.field}
              placeholder="Your name (optional)"
              value={form.patientName}
              onChange={(e) => setForm({ ...form, patientName: e.target.value })}
            />
            <input
              style={{ ...styles.field, borderColor: '#4f46e5' }}
              placeholder="Disease or condition of interest *"
              value={form.disease}
              onChange={(e) => setForm({ ...form, disease: e.target.value })}
            />
            <input
              style={styles.field}
              placeholder="Location (optional)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <button
              style={styles.startBtn}
              onClick={() => {
                if (!form.disease.trim()) return alert('Please enter a disease or condition.');
                startNewSession(form);
              }}
            >
              Start New Research →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Sidebar */}
      <div style={{ ...styles.sidebar, width: sidebarOpen ? 260 : 0, overflow: 'hidden', transition: 'width 0.2s' }}>
        <SidebarContent
          allSessions={allSessions}
          currentSession={currentSession}
          loadSession={loadSession}
          deleteSession={deleteSession}
          onNewSession={() => {
            setStep('setup');
            setForm({ patientName: '', disease: '', location: '' });
            setCurrentSession(null);
          }}
        />
      </div>

      {/* Main chat area */}
      <div style={styles.main}>
        {/* Top bar */}
        <div style={styles.topBar}>
          <button style={styles.sidebarToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <div style={styles.topBarInfo}>
            <span style={styles.topBarDisease}>🔬 {currentSession?.disease}</span>
            {currentSession?.patientName && currentSession.patientName !== 'Anonymous' && (
              <span style={styles.topBarPatient}>· {currentSession.patientName}</span>
            )}
            {currentSession?.location && (
              <span style={styles.topBarPatient}>· 📍 {currentSession.location}</span>
            )}
          </div>
          <button
            style={styles.newSessionBtn}
            onClick={() => {
              setStep('setup');
              setForm({ patientName: '', disease: '', location: '' });
              setCurrentSession(null);
            }}
          >
            + New Session
          </button>
        </div>

        <ChatWindow
          key={currentSession?.sessionId}
          sessionId={currentSession?.sessionId}
          disease={currentSession?.disease}
          patientName={currentSession?.patientName}
          location={currentSession?.location}
          onFirstMessage={handleFirstMessage}
        />
      </div>
    </div>
  );
}

function SidebarContent({ allSessions, currentSession, loadSession, deleteSession, onNewSession }) {
  return (
    <div style={styles.sidebarInner}>
      <div style={styles.sidebarHeader}>
        <div style={styles.sidebarLogo}>🔬 Curalink</div>
      </div>

      <button style={styles.newChatBtn} onClick={onNewSession}>
        + New Session
      </button>

      <div style={styles.sidebarLabel}>Recent Sessions</div>

      <div style={styles.sessionList}>
        {allSessions.length === 0 && (
          <div style={styles.noSessions}>No sessions yet</div>
        )}
        {allSessions.map((s) => (
          <div
            key={s.sessionId}
            style={{
              ...styles.sessionItem,
              background: currentSession?.sessionId === s.sessionId
                ? 'rgba(255,255,255,0.15)'
                : 'transparent',
            }}
            onClick={() => loadSession(s)}
          >
            <div style={styles.sessionIcon}>💬</div>
            <div style={styles.sessionInfo}>
              <div style={styles.sessionTitle}>{s.title || s.disease}</div>
              <div style={styles.sessionMeta}>
                {s.disease} · {new Date(s.createdAt).toLocaleDateString()}
              </div>
            </div>
            <button
              style={styles.deleteBtn}
              onClick={(e) => deleteSession(s.sessionId, e)}
              title="Delete session"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    height: '100vh',
    fontFamily: 'system-ui, sans-serif',
    background: '#f8fafc',
  },
  sidebar: {
    background: '#1e1b4b',
    color: '#fff',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarInner: {
    width: 260,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '16px 0',
  },
  sidebarHeader: {
    padding: '0 16px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  sidebarLogo: {
    fontSize: 20,
    fontWeight: 700,
    color: '#a5b4fc',
  },
  newChatBtn: {
    margin: '12px 16px',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: '10px 16px',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'left',
    width: 'calc(100% - 32px)',
  },
  sidebarLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    color: '#a5b4fc',
    letterSpacing: 1,
    padding: '8px 16px 4px',
  },
  sessionList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 8px',
  },
  noSessions: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    padding: '12px 8px',
    textAlign: 'center',
  },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 8px',
    borderRadius: 8,
    cursor: 'pointer',
    marginBottom: 2,
    transition: 'background 0.15s',
  },
  sessionIcon: {
    fontSize: 14,
    flexShrink: 0,
  },
  sessionInfo: {
    flex: 1,
    minWidth: 0,
  },
  sessionTitle: {
    fontSize: 13,
    color: '#e0e7ff',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sessionMeta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.3)',
    cursor: 'pointer',
    fontSize: 11,
    padding: '2px 4px',
    borderRadius: 4,
    flexShrink: 0,
    lineHeight: 1,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 16px',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    flexShrink: 0,
  },
  sidebarToggle: {
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 12,
    color: '#64748b',
    flexShrink: 0,
  },
  topBarInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  topBarDisease: {
    fontWeight: 600,
    fontSize: 14,
    color: '#1e293b',
  },
  topBarPatient: {
    fontSize: 13,
    color: '#64748b',
  },
  newSessionBtn: {
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
  setupWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
    position: 'relative',
  },
  setupCard: {
    background: '#fff',
    borderRadius: 20,
    padding: '40px 36px',
    width: 420,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  logo: { fontSize: 28, fontWeight: 700, color: '#4f46e5', marginBottom: 4 },
  tagline: { color: '#64748b', fontSize: 14, marginBottom: 28 },
  field: {
    display: 'block',
    width: '100%',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    marginBottom: 12,
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
  },
  startBtn: {
    width: '100%',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '13px',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    marginTop: 8,
    fontFamily: 'inherit',
  },
};