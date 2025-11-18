const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = req.user.role || 'none';
    
    if (!allowedRoles.includes(userRole)) {
      console.log(`Authorization failed - User role: ${userRole}, Required roles: ${allowedRoles.join(', ')}`);
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient permissions',
        details: {
          currentRole: userRole,
          requiredRoles: allowedRoles,
          message: userRole === 'employee' || userRole === 'none' 
            ? 'You need HR or Manager role to perform this action. Contact your administrator to grant you the appropriate role.'
            : 'Your role does not have permission for this action.'
        }
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole
};
