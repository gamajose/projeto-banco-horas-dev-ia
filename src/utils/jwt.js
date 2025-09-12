const jwt = require('jsonwebtoken');

// Gerar token JWT
const generateToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Verificar token JWT
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// Decodificar token sem verificar (útil para extrair dados expirados)
const decodeToken = (token) => {
  return jwt.decode(token);
};

// Gerar token de acesso (access token)
const generateAccessToken = (userId, username) => {
  return generateToken({
    userId,
    username,
    type: 'access'
  });
};

// Gerar token de refresh
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Token de refresh expira em 7 dias
  );
};

// Verificar se token está próximo da expiração (menos de 1 hora)
const isTokenNearExpiry = (token) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    
    // Retorna true se expira em menos de 1 hora (3600 segundos)
    return timeUntilExpiry < 3600;
  } catch (error) {
    return true;
  }
};

// Extrair informações do usuário do token
const getUserFromToken = (token) => {
  try {
    const decoded = verifyToken(token);
    return {
      userId: decoded.userId,
      username: decoded.username,
      type: decoded.type
    };
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateAccessToken,
  generateRefreshToken,
  isTokenNearExpiry,
  getUserFromToken
};