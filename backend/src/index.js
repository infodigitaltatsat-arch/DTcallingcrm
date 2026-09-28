require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { initSocket } = require('./services/socketService');
const { connectToMongoDB, disconnectFromMongoDB } = require('./DataBase/db');

const contactRoutes = require('./routes/contactRoutes');
const callRoutes = require('./routes/callRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

// Set up static files route for recordings download/play
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes mapping
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/reminders', reminderRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Calling CRM API is active' });
});

// Configure Socket.io
const io = initSocket(server);
app.set('io', io);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectToMongoDB();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to connect to MongoDB:', error.message);
    process.exitCode = 1;
  }
}

async function shutdown() {
  server.close(async () => {
    await disconnectFromMongoDB();
    process.exit(0);
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

startServer();
