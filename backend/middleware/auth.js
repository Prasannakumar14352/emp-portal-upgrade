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

    // Support both single role (legacy) and multiple roles (array)
    const userRoles = Array.isArray(req.user.roles) 
      ? req.user.roles 
      : (req.user.role ? [req.user.role] : ['employee']);
    
    // Check if user has any of the allowed roles
    const hasPermission = userRoles.some(role => allowedRoles.includes(role));
    
    if (!hasPermission) {
      console.log(`Authorization failed - User roles: ${userRoles.join(', ')}, Required roles: ${allowedRoles.join(', ')}`);
      return res.status(403).json({ 
        error: 'Forbidden: Insufficient permissions',
        details: {
          currentRoles: userRoles,
          requiredRoles: allowedRoles,
          message: userRoles.every(r => r === 'employee' || r === 'none')
            ? 'You need HR or Manager role to perform this action. Contact your administrator to grant you the appropriate role.'
            : 'Your roles do not have permission for this action.'
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
