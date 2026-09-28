const { connectToMongoDB } = require('../DataBase/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID, timingSafeEqual } = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_AUDIT_PASSWORD = process.env.ADMIN_AUDIT_PASSWORD;

async function matchesAdminAuditPassword(password) {
  const database = await connectToMongoDB();
  const users = database.collection('users');
  const storedPassword = await users.findOne({ username: '__admin_audit_secret__' });

  if (storedPassword) {
    return bcrypt.compare(password, storedPassword.password);
  }

  const supplied = Buffer.from(password);
  const expected = Buffer.from(ADMIN_AUDIT_PASSWORD);

  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function serializeUser(user) {
  const { _id, ...fields } = user;
  return { id: _id, ...fields };
}

exports.verifyAdminAuditPassword = async (req, res) => {
  const { password } = req.body;

  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'Admin Audit password is required' });
  }

  try {
    const passwordMatches = await matchesAdminAuditPassword(password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Incorrect Admin Audit password' });
    }

    res.json({ verified: true });
  } catch (error) {
    console.error('Error verifying Admin Audit password:', error);
    res.status(500).json({ error: 'Unable to verify Admin Audit password' });
  }
};

exports.changeAdminAuditPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (
    typeof currentPassword !== 'string' ||
    typeof newPassword !== 'string' ||
    newPassword.length < 8
  ) {
    return res.status(400).json({
      error: 'Enter the current password and a new password with at least 8 characters'
    });
  }

  try {
    if (!(await matchesAdminAuditPassword(currentPassword))) {
      return res.status(401).json({ error: 'Current Admin Audit password is incorrect' });
    }

    const database = await connectToMongoDB();
    const users = database.collection('users');
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await users.updateOne(
      { username: '__admin_audit_secret__' },
      {
        $set: { password: hashedPassword },
        $setOnInsert: {
          _id: randomUUID(),
          username: '__admin_audit_secret__',
          role: 'audit-secret',
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    res.json({ changed: true });
  } catch (error) {
    console.error('Error changing Admin Audit password:', error);
    res.status(500).json({ error: 'Unable to change Admin Audit password' });
  }
};

exports.signup = async (req, res) => {
  const { username, password, requestedRole = 'user' } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    if (username === '__admin_audit_secret__') {
      return res.status(400).json({ error: 'This username is reserved' });
    }

    const database = await connectToMongoDB();
    const users = database.collection('users');
    const existingUser = await users.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const wantsAdmin = requestedRole === 'admin';
    const user = {
      _id: randomUUID(),
      username,
      password: hashedPassword,
      role: 'user',
      requestedRole: wantsAdmin ? 'admin' : 'user',
      approvalStatus: wantsAdmin ? 'PENDING' : 'APPROVED',
      accountStatus: 'ACTIVE',
      createdAt: new Date()
    };
    await users.insertOne(user);

    if (wantsAdmin) {
      return res.status(201).json({
        pendingApproval: true,
        message: 'Your Admin access request has been sent for approval.'
      });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const database = await connectToMongoDB();
    const users = database.collection('users');
    const user = await users.findOne({ username });

    if (!user || user.role === 'audit-secret') {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.approvalStatus === 'PENDING') {
      return res.status(403).json({ error: 'Your Admin access request is pending approval.' });
    }

    if (user.approvalStatus === 'REJECTED') {
      return res.status(403).json({ error: 'Your Admin access request was not approved.' });
    }

    if (user.approvalStatus === 'BLOCKED') {
      return res.status(403).json({ error: 'Your Admin permission request has been blocked by an administrator.' });
    }

    if (user.accountStatus === 'LOCKED') {
      return res.status(403).json({
        error: 'Your account is locked after inactivity. Ask an administrator to unlock it.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await users.updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date(), lastSeenAt: new Date() } }
    );

    res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.updatePresence = async (req, res) => {
  try {
    const database = await connectToMongoDB();
    const result = await database.collection('users').updateOne(
      { _id: req.user.id },
      { $set: { lastSeenAt: new Date() } }
    );
    if (!result.matchedCount) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Unable to update user presence' });
  }
};

exports.lockInactiveUser = async (req, res) => {
  try {
    const userId = req.user.role === 'admin' && req.body.userId
      ? req.body.userId
      : req.user.id;
    const database = await connectToMongoDB();
    const result = await database.collection('users').updateOne(
      { _id: userId },
      {
        $set: {
          accountStatus: 'LOCKED',
          lockedAt: new Date(),
          lastSeenAt: new Date()
        }
      }
    );
    if (!result.matchedCount) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: 'Unable to lock user account' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const database = await connectToMongoDB();
    const users = await database.collection('users')
      .find(
        { role: { $ne: 'audit-secret' } },
        {
          projection: {
            username: 1,
            role: 1,
            requestedRole: 1,
            approvalStatus: 1,
            accountStatus: 1,
            createdAt: 1,
            lastLoginAt: 1,
            lastSeenAt: 1,
            lastCallAt: 1
          }
        }
      )
      .sort({ createdAt: -1 })
      .toArray();

    res.json(users.map(serializeUser));
  } catch (error) {
    res.status(500).json({ error: 'Unable to load users' });
  }
};

exports.unlockUser = async (req, res) => {
  try {
    const database = await connectToMongoDB();
    const users = database.collection('users');
    const result = await users.updateOne(
      { _id: req.params.id },
      { $set: { accountStatus: 'ACTIVE', lockedAt: null } }
    );
    if (!result.matchedCount) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await users.findOne(
      { _id: req.params.id },
      { projection: { accountStatus: 1 } }
    );
    res.json(serializeUser(user));
  } catch (error) {
    res.status(400).json({ error: 'Unable to unlock user account' });
  }
};

exports.getAdminRequests = async (req, res) => {
  try {
    const database = await connectToMongoDB();
    const requests = await database.collection('users')
      .find(
        { requestedRole: 'admin', approvalStatus: 'PENDING' },
        { projection: { username: 1, createdAt: 1 } }
      )
      .toArray();

    res.json(requests.map(serializeUser));
  } catch (error) {
    res.status(500).json({ error: 'Unable to load Admin access requests' });
  }
};

exports.updateAdminRequest = async (req, res) => {
  const { action } = req.body;

  if (!['approve', 'reject', 'block'].includes(action)) {
    return res.status(400).json({ error: 'Invalid approval action' });
  }

  try {
    const database = await connectToMongoDB();
    const users = database.collection('users');
    const data = action === 'approve'
      ? { role: 'admin', approvalStatus: 'APPROVED' }
      : { approvalStatus: action === 'block' ? 'BLOCKED' : 'REJECTED' };
    const result = await users.updateOne(
      { _id: req.params.id },
      { $set: data }
    );
    if (!result.matchedCount) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = await users.findOne(
      { _id: req.params.id },
      { projection: { username: 1, role: 1, approvalStatus: 1 } }
    );

    res.json(serializeUser(user));
  } catch (error) {
    res.status(500).json({ error: 'Unable to update Admin access request' });
  }
};