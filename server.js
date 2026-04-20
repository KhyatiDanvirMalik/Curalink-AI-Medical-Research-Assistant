require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const chatRoutes = require('./routes/chat');

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/chat', chatRoutes);

// Serve React frontend if build folder exists
const buildPath = path.join(__dirname, 'build');
const fs = require('fs');

if (fs.existsSync(buildPath)) {
  console.log('Serving frontend from build folder');
  app.use(express.static(buildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  console.log('No build folder found - API only mode');
  app.get('/', (req, res) => {
    res.json({ status: 'Curalink API running', message: 'Frontend not built yet' });
  });
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
