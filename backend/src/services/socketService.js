const { Server } = require('socket.io');
const { getCollection, toApiDocument } = require('../DataBase/db');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Call Simulator Triggers
    socket.on('simulate_inbound_call', (data) => {
      // Simulate an incoming call from a contact
      // data: { contactName, contactPhone, contactId }
      console.log('Simulating inbound call:', data);
      io.emit('inbound_call', {
        id: `sim-${Date.now()}`,
        contactId: data.contactId || null,
        contactName: data.contactName || 'Unknown Caller',
        contactPhone: data.contactPhone || '+1 (555) 000-0000',
        timestamp: new Date()
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  // Start background reminder checker
  startReminderChecker();

  return io;
}

function startReminderChecker() {
  setInterval(async () => {
    if (!io) return;
    try {
      const now = new Date();
      // Find all pending reminders that are past due
      const reminders = await getCollection('reminders');
      const dueReminders = await reminders.find({ status: 'PENDING', dueDate: { $lte: now } }).toArray();

      for (const reminder of dueReminders) {
        const result = await reminders.updateOne(
          { _id: reminder._id, status: 'PENDING' },
          { $set: { status: 'OVERDUE', updatedAt: now } }
        );
        if (!result.modifiedCount) continue;

        console.log('Sending reminder alert:', reminder.title);
        io.emit('reminder_alert', toApiDocument({ ...reminder, status: 'OVERDUE', updatedAt: now }));
      }
    } catch (error) {
      console.error('Error in reminder checker job:', error);
    }
  }, 10000).unref(); // Check every 10 seconds
}

module.exports = { initSocket };
