const jwt = require('jsonwebtoken');

// JWT secret must be provided via environment variable
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_CONFIG = {
  secret: JWT_SECRET,
  algorithm: 'HS256',
  expiresIn: '24h'
};

function generateToken(payload) {
  return jwt.sign(payload, JWT_CONFIG.secret, {
    algorithm: JWT_CONFIG.algorithm,
    expiresIn: JWT_CONFIG.expiresIn
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_CONFIG.secret, {
      algorithms: [JWT_CONFIG.algorithm]
    });
  } catch (error) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken,
  JWT_CONFIG
}; 