const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.userData = { id: decodedToken.id, role: decodedToken.role };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Authentication failed' });
  }
};
