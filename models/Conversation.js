const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: String,
  sources: [
    {
      title: String,
      authors: [String],
      year: Number,
      url: String,
      platform: String,
      snippet: String,
    },
  ],
  trials: [
    {
      title: String,
      status: String,
      eligibility: String,
      location: String,
      contact: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const ConversationSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  patientName: String,
  disease: String,
  location: String,
  messages: [MessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Conversation', ConversationSchema);
