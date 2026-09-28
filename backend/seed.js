require('dotenv').config();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { connectToMongoDB, disconnectFromMongoDB } = require('./src/DataBase/db');

const contacts = [
  { name: 'John Doe', phone: '+1 (555) 019-2834', email: 'john.doe@acme.com', company: 'Acme Corp', status: 'Lead' },
  { name: 'Jane Smith', phone: '+1 (555) 014-9821', email: 'jane.smith@designco.io', company: 'DesignCo', status: 'Contact' },
  { name: 'Michael Johnson', phone: '+1 (555) 017-4839', email: 'm.johnson@apexsolutions.com', company: 'Apex Solutions', status: 'Customer' },
  { name: 'Emily Davis', phone: '+1 (555) 012-3456', email: 'emily.davis@innovate.tech', company: 'Innovate Tech', status: 'Lead' },
  { name: 'David Brown', phone: '+1 (555) 015-6789', email: 'dbrown@builder.com', company: 'Builder Inc', status: 'Contact' },
  { name: 'Sarah Wilson', phone: '+1 (555) 018-9012', email: 'sarah.w@cloudcorp.net', company: 'Cloud Corp', status: 'Customer' },
  { name: 'James Taylor', phone: '+1 (555) 013-1122', email: 'james.t@quantum.org', company: 'Quantum Org', status: 'Lead' },
  { name: 'Amanda Thomas', phone: '+1 (555) 016-3344', email: 'amanda.thomas@vertex.com', company: 'Vertex Systems', status: 'Contact' }
];

async function main() {
  const database = await connectToMongoDB();
  const users = database.collection('users');
  const now = new Date();
  const accounts = [];
  const initialAdminUsername = process.env.INITIAL_ADMIN_USERNAME;
  const initialAdminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (initialAdminUsername || initialAdminPassword) {
    if (!initialAdminUsername || !initialAdminPassword) {
      throw new Error('Set both INITIAL_ADMIN_USERNAME and INITIAL_ADMIN_PASSWORD to seed an administrator');
    }
    accounts.push({ username: initialAdminUsername, password: initialAdminPassword, role: 'admin' });
  } else {
    console.warn('No initial admin credentials configured; administrator account seeding skipped.');
  }

  for (const account of accounts) {
    await users.updateOne(
      { username: account.username },
      {
        $set: {
          password: await bcrypt.hash(account.password, 10),
          role: account.role,
          requestedRole: account.role,
          approvalStatus: 'APPROVED'
        },
        $setOnInsert: {
          accountStatus: 'ACTIVE',
          createdAt: now
        }
      },
      { upsert: true }
    );
  }

  const contactsCollection = database.collection('contacts');
  if (await contactsCollection.countDocuments() === 0) {
    await contactsCollection.insertMany(contacts.map((contact) => ({
      ...contact,
      _id: randomUUID(),
      email: contact.email || null,
      company: contact.company || null,
      createdAt: now,
      updatedAt: now
    })));
    console.log('Sample contacts added.');
  } else {
    console.log('Contacts already exist; sample seed skipped.');
  }

  console.log('MongoDB seed completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(disconnectFromMongoDB);