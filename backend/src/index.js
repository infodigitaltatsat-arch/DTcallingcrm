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

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Configure Socket.io
const io = initSocket(server);
app.set('io', io);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (process.env.NODE_ENV === 'production') {
      for (const key of ['MONGODB_URI', 'JWT_SECRET', 'ADMIN_AUDIT_PASSWORD', 'FRONTEND_URL']) {
        if (!process.env[key]) {
          throw new Error(`${key} must be configured in production`);
        }
      }
      if (process.env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must contain at least 32 characters in production');
      }
      const databaseHost = new URL(process.env.MONGODB_URI).hostname;
      if (['localhost', '127.0.0.1', '::1'].includes(databaseHost)) {
        throw new Error('MONGODB_URI must use a remotely reachable database in production');
      }
    }

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
