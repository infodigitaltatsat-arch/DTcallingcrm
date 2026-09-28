const { getCollection, createDocumentId, toApiDocument } = require('../DataBase/db');

async function contactWithRelations(contact) {
  if (!contact) return null;

  const [calls, reminders] = await Promise.all([
    getCollection('callLogs').then((collection) => collection.find({ contactId: contact._id }).sort({ createdAt: -1 }).toArray()),
    getCollection('reminders').then((collection) => collection.find({ contactId: contact._id }).sort({ dueDate: 1 }).toArray())
  ]);

  return {
    ...toApiDocument(contact),
    calls: calls.map(toApiDocument),
    reminders: reminders.map(toApiDocument)
  };
}

exports.getContacts = async (req, res) => {
  try {
    const contacts = await (await getCollection('contacts')).find().sort({ name: 1 }).toArray();
    res.json(contacts.map(toApiDocument));
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getContactById = async (req, res) => {
  const { id } = req.params;
  try {
    const contacts = await getCollection('contacts');
    const contact = await contacts.findOne({ _id: id });
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    res.json(await contactWithRelations(contact));
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.createContact = async (req, res) => {
  const { name, phone, email, company, status } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and Phone are required' });
  }
  try {
    // Check if phone number is already registered
    const contacts = await getCollection('contacts');
    const existing = await contacts.findOne({ phone });
    if (existing) {
      return res.status(400).json({ error: 'Phone number already exists' });
    }

    const contact = {
      _id: createDocumentId(),
      name,
      phone,
      email: email || null,
      company: company || null,
      status: status || 'Lead',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await contacts.insertOne(contact);
    res.status(201).json(toApiDocument(contact));
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Import a spreadsheet-derived contact list. The browser converts CSV/Excel rows
// to the common master-data shape before sending them here.
exports.bulkCreateContacts = async (req, res) => {
  const { contacts } = req.body;
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: 'Provide at least one contact to import' });
  }

  try {
    const usableContacts = contacts
      .map((contact) => ({
        name: String(contact.name || '').trim(),
        phone: String(contact.phone || '').trim(),
        email: contact.email ? String(contact.email).trim() : null,
        company: contact.company ? String(contact.company).trim() : null,
        status: contact.status ? String(contact.status).trim() : 'Lead'
      }))
      .filter((contact) => contact.name && contact.phone);

    const contactsCollection = await getCollection('contacts');
    const imported = [];
    const skipped = contacts.length - usableContacts.length;
    const phones = usableContacts.map((contact) => contact.phone);
    const existingContacts = await contactsCollection.find({ phone: { $in: phones } }, { projection: { phone: 1 } }).toArray();
    const existingPhones = new Set(existingContacts.map((contact) => contact.phone));
    const newContacts = usableContacts
      .filter((contact) => !existingPhones.has(contact.phone))
      .map((contact) => ({
        ...contact,
        _id: createDocumentId(),
        createdAt: new Date(),
        updatedAt: new Date()
      }));

    if (newContacts.length) {
      await contactsCollection.insertMany(newContacts);
      imported.push(...newContacts.map(toApiDocument));
    }

    res.status(201).json({ imported, skipped: skipped + usableContacts.length - imported.length });
  } catch (error) {
    console.error('Error importing contacts:', error);
    res.status(500).json({ error: 'Unable to import contacts' });
  }
};

exports.updateContact = async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, company, status } = req.body;
  try {
    const contacts = await getCollection('contacts');
    const result = await contacts.updateOne(
      { _id: id },
      { $set: { name, phone, email: email || null, company: company || null, status, updatedAt: new Date() } }
    );
    if (!result.matchedCount) return res.status(404).json({ error: 'Contact not found' });
    res.json(toApiDocument(await contacts.findOne({ _id: id })));
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.deleteContact = async (req, res) => {
  const { id } = req.params;
  try {
    const contacts = await getCollection('contacts');
    const result = await contacts.deleteOne({ _id: id });
    if (!result.deletedCount) return res.status(404).json({ error: 'Contact not found' });
    await Promise.all([
      getCollection('callLogs').then((collection) => collection.updateMany({ contactId: id }, { $set: { contactId: null } })),
      getCollection('reminders').then((collection) => collection.updateMany({ contactId: id }, { $set: { contactId: null } }))
    ]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
