// middleware/auth.js
const jwt = require('jsonwebtoken');

const auth = (roles = []) => {
  return (req, res, next) => {
    const token = req.header('token');
    if (!token) return res.status(401).json({ error: 'Access denied' });

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access forbidden: Insufficient permissions' });
      }

      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid token' });
    }
  };
};

module.exports = auth;
