const { getCollection, createDocumentId, toApiDocument } = require('../DataBase/db');
const path = require('path');
const fs = require('fs');

async function callWithContact(callLog, includeFullContact = false) {
  if (!callLog) return null;
  let contact = null;
  if (callLog.contactId) {
    contact = await (await getCollection('contacts')).findOne(
      { _id: callLog.contactId },
      includeFullContact ? {} : { projection: { name: 1, email: 1, company: 1 } }
    );
  }
  return { ...toApiDocument(callLog), contact: toApiDocument(contact) };
}

exports.getCallLogs = async (req, res) => {
  try {
    const callLogs = await (await getCollection('callLogs')).find().sort({ createdAt: -1 }).toArray();
    res.json(await Promise.all(callLogs.map((callLog) => callWithContact(callLog))));
  } catch (error) {
    console.error('Error fetching call logs:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getCallLogById = async (req, res) => {
  const { id } = req.params;
  try {
    const callLog = await (await getCollection('callLogs')).findOne({ _id: id });
    if (!callLog) {
      return res.status(404).json({ error: 'Call log not found' });
    }
    res.json(await callWithContact(callLog, true));
  } catch (error) {
    console.error('Error fetching call log:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createCallLog = async (req, res) => {
  const { contactId, contactName, contactPhone, direction, status, duration, notes, recordingUrl } = req.body;
  
  if (!contactName || !contactPhone || !direction || !status) {
    return res.status(400).json({ error: 'Missing required call parameters' });
  }

  try {
    const callLog = {
      _id: createDocumentId(),
      contactId: contactId || null,
      contactName,
      contactPhone,
      direction,
      status,
      duration: parseInt(duration, 10) || 0,
      notes: notes || '',
      recordingUrl: recordingUrl || null,
      userId: req.user.id,
      userName: req.user.username,
      createdAt: new Date()
    };
    await (await getCollection('callLogs')).insertOne(callLog);

    if (req.user.id) {
      await getCollection('users')
        .then((users) => users.updateOne({ _id: req.user.id }, { $set: { lastCallAt: new Date() } }))
        .catch(() => null);
    }

    const responseCallLog = await callWithContact(callLog);

    // Notify clients about the new log via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('new_call_log', responseCallLog);
      
      // Update reports dynamically
      const stats = await compileStats();
      io.emit('stats_update', stats);
    }

    res.status(201).json(responseCallLog);
  } catch (error) {
    console.error('Error creating call log:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.uploadRecording = async (req, res) => {
  const { id } = req.params;
  
  if (!req.file) {
    return res.status(400).json({ error: 'No recording file uploaded' });
  }

  try {
    const recordingUrl = `/uploads/${req.file.filename}`;
    
    const callLogs = await getCollection('callLogs');
    const result = await callLogs.updateOne({ _id: id }, { $set: { recordingUrl } });
    if (!result.matchedCount) return res.status(404).json({ error: 'Call log not found' });
    const callLog = await callWithContact(await callLogs.findOne({ _id: id }));

    const io = req.app.get('io');
    if (io) {
      io.emit('call_log_updated', callLog);
    }

    res.json({ message: 'Recording uploaded successfully', callLog });
  } catch (error) {
    console.error('Error updating call log recording:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updateCallNotes = async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  try {
    const callLogs = await getCollection('callLogs');
    const result = await callLogs.updateOne({ _id: id }, { $set: { notes } });
    if (!result.matchedCount) return res.status(404).json({ error: 'Call log not found' });
    const callLog = await callWithContact(await callLogs.findOne({ _id: id }));
    res.json(callLog);
  } catch (error) {
    console.error('Error updating call notes:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getCallReports = async (req, res) => {
  try {
    const stats = await compileStats();
    res.json(stats);
  } catch (error) {
    console.error('Error compiling call reports:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteCallLog = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await (await getCollection('callLogs')).deleteOne({ _id: id });
    if (!result.deletedCount) return res.status(404).json({ error: 'Call log not found' });
    
    // Broadcast stats update
    const io = req.app.get('io');
    if (io) {
      const stats = await compileStats();
      io.emit('stats_update', stats);
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting call log:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

async function compileStats() {
  const allCalls = await (await getCollection('callLogs')).find().toArray();
  
  const totalCalls = allCalls.length;
  const completedCalls = allCalls.filter(c => c.status === 'COMPLETED').length;
  const missedCalls = allCalls.filter(c => c.status === 'MISSED').length;
  const busyCalls = allCalls.filter(c => c.status === 'BUSY').length;
  const failedCalls = allCalls.filter(c => c.status === 'FAILED').length;
  
  const totalDuration = allCalls.reduce((acc, curr) => acc + curr.duration, 0);
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
  
  // Dynamic weekly call volumes (grouped by day)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0,0,0,0);
    return d;
  }).reverse();

  const volumeTrend = last7Days.map(date => {
    const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' });
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const callsCount = allCalls.filter(c => {
      const cDate = new Date(c.createdAt);
      return cDate >= date && cDate < nextDate;
    }).length;

    return {
      day: dayStr,
      calls: callsCount
    };
  });

  // Call status segments
  const statusSegments = [
    { name: 'Completed', value: completedCalls },
    { name: 'Missed', value: missedCalls },
    { name: 'Busy', value: busyCalls },
    { name: 'Failed', value: failedCalls }
  ].filter(s => s.value > 0);

  // Call direction segments
  const outboundCalls = allCalls.filter(c => c.direction === 'OUTBOUND').length;
  const inboundCalls = allCalls.filter(c => c.direction === 'INBOUND').length;

  const directionSegments = [
    { name: 'Outbound', value: outboundCalls },
    { name: 'Inbound', value: inboundCalls }
  ].filter(d => d.value > 0);

  return {
    summary: {
      totalCalls,
      completedCalls,
      missedCalls,
      avgDuration,
      totalDuration
    },
    volumeTrend,
    statusSegments,
    directionSegments
  };
}
