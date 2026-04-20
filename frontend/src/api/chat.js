import axios from 'axios';

export const sendMessage = (payload) =>
  axios.post('/api/chat/message', payload).then((r) => r.data);

export const loadHistory = (sessionId) =>
  axios.get(`/api/chat/history/${sessionId}`).then((r) => r.data);
