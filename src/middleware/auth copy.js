const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Profile = require('../models/Profile');

async function isAuthenticated(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.redirect('/auth/login');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Chamada estática, sem 'new'
    const user = await User.findById(decoded.id);

     // Se o usuário precisa de alterar a senha e não está na página de alteração...
    if (user.force_password_change && req.originalUrl !== '/profile/change-password') {
      // ...nós forçamos o redirecionamento.
      return res.redirect('/profile/change-password');
    }

    if (!user || !user.is_active) {
      res.clearCookie('token');
      return res.redirect('/auth/login');
    }

    req.user = user;
    // Chamada estática, sem 'new'
    req.userProfile = await Profile.findByUserId(user.id);
    
    next();
  } catch (error) {
    console.error("Erro no middleware de autenticação:", error);
    res.clearCookie('token');
    return res.redirect('/auth/login');
  }
}

function requireStaff(req, res, next) {
  if (req.user && req.user.is_staff) {
    return next();
  }
  res.status(403).send('Acesso negado.');
}

function requireManager(req, res, next) {
  if (req.userProfile && req.userProfile.gerente) return next();
  res.status(403).send('Acesso permitido apenas a gerentes.');
}

module.exports = { isAuthenticated, requireStaff, requireManager };