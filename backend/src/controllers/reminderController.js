const { getCollection, createDocumentId, toApiDocument } = require('../DataBase/db');

async function reminderWithContact(reminder) {
  if (!reminder) return null;
  const contact = reminder.contactId
    ? await (await getCollection('contacts')).findOne(
      { _id: reminder.contactId },
      { projection: { name: 1, phone: 1 } }
    )
    : null;
  return { ...toApiDocument(reminder), contact: toApiDocument(contact) };
}

exports.getReminders = async (req, res) => {
  try {
    const reminders = await (await getCollection('reminders')).find().sort({ dueDate: 1 }).toArray();
    res.json(await Promise.all(reminders.map(reminderWithContact)));
  } catch (error) {
    console.error('Error fetching reminders:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createReminder = async (req, res) => {
  const { contactId, contactName, contactPhone, title, description, dueDate } = req.body;
  if (!contactName || !contactPhone || !title || !dueDate) {
    return res.status(400).json({ error: 'Missing required reminder parameters' });
  }
  try {
    const reminder = {
      _id: createDocumentId(),
      contactId: contactId || null,
      contactName,
      contactPhone,
      title,
      description: description || null,
      dueDate: new Date(dueDate),
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await (await getCollection('reminders')).insertOne(reminder);
    const responseReminder = await reminderWithContact(reminder);

    const io = req.app.get('io');
    if (io) {
      io.emit('reminder_created', responseReminder);
    }

    res.status(201).json(responseReminder);
  } catch (error) {
    console.error('Error creating reminder:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.completeReminder = async (req, res) => {
  const { id } = req.params;
  try {
    const reminders = await getCollection('reminders');
    const result = await reminders.updateOne(
      { _id: id },
      { $set: { status: 'COMPLETED', updatedAt: new Date() } }
    );
    if (!result.matchedCount) return res.status(404).json({ error: 'Reminder not found' });
    const reminder = await reminderWithContact(await reminders.findOne({ _id: id }));

    const io = req.app.get('io');
    if (io) {
      io.emit('reminder_updated', reminder);
    }

    res.json(reminder);
  } catch (error) {
    console.error('Error updating reminder status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteReminder = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await (await getCollection('reminders')).deleteOne({ _id: id });
    if (!result.deletedCount) return res.status(404).json({ error: 'Reminder not found' });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
