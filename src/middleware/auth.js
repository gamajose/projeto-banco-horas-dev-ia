const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/Profile');

// Função de middleware para rotas web
async function isAuthenticated(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/auth/login');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user.force_password_change && req.originalUrl !== '/profile/change-password') {
      return res.redirect('/profile/change-password');
    }

    if (!user || !user.is_active) {
      res.clearCookie('token');
      return res.redirect('/auth/login');
    }

    req.user = user;
    req.userProfile = await Profile.findByUserId(user.id);

    next();
  } catch (error) {
    console.error("Erro no middleware de autenticação:", error);
    res.clearCookie('token');
    return res.redirect('/auth/login');
  }
}

// Middleware para API (JSON)
async function isApiAuthenticated(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: 'Não autorizado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    req.user = user;
    req.userProfile = await Profile.findByUserId(user.id);

    next();
  } catch (error) {
    console.error("Erro no middleware de API auth:", error);
    return res.status(401).json({ message: 'Não autorizado' });
  }
}

function requireStaff(req, res, next) {
  if (req.user && req.user.is_staff) return next();
  res.status(403).send('Acesso negado.');
}

function requireManager(req, res, next) {
  if (req.userProfile && req.userProfile.gerente) return next();
  res.status(403).send('Acesso permitido apenas a gerentes.');
}

// Exporta todas as funções corretamente
module.exports = { isAuthenticated, isApiAuthenticated, requireStaff, requireManager };
