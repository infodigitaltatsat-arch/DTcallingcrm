const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (!user || typeof user !== 'object' || typeof user.id !== 'string') {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }

  return next();
}

module.exports = { authenticateToken, requireAdmin };
