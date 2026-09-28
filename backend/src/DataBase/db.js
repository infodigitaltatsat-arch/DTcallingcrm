const { MongoClient } = require('mongodb');
const { randomUUID } = require('crypto');

let client;
let connection;

async function connectToMongoDB() {
  if (connection) {
    return connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI must be configured in backend/.env');
  }

  client = new MongoClient(uri);
  connection = client.connect()
    .then(async () => {
      const database = client.db(process.env.MONGODB_DB_NAME || 'calling_crm');
      await Promise.all([
        database.collection('users').createIndex({ username: 1 }, { unique: true }),
        database.collection('contacts').createIndex({ phone: 1 }, { unique: true }),
        database.collection('callLogs').createIndex({ createdAt: -1 }),
        database.collection('reminders').createIndex({ status: 1, dueDate: 1 })
      ]);
      return database;
    })
    .catch(async (error) => {
      connection = null;
      await client.close().catch(() => {});
      client = null;
      throw error;
    });

  return connection;
}

async function getCollection(name) {
  const database = await connectToMongoDB();
  return database.collection(name);
}

function createDocumentId() {
  return randomUUID();
}

function toApiDocument(document) {
  if (!document) {
    return null;
  }

  const { _id, ...fields } = document;
  return { id: String(_id), ...fields };
}

async function disconnectFromMongoDB() {
  if (client) {
    await client.close();
    client = null;
    connection = null;
  }
}

module.exports = {
  connectToMongoDB,
  disconnectFromMongoDB,
  getCollection,
  createDocumentId,
  toApiDocument
};