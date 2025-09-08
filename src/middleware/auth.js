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

// ==========================================================
// NOVO MIDDLEWARE - APENAS PARA ROTAS DE API
// ==========================================================
async function isApiAuthenticated(req, res, next) {
  const token = req.cookies.token;
  // Se não houver token, retorna um erro 401 Unauthorized em JSON
  if (!token) {
    return res.status(401).json({ message: 'Acesso não autorizado. Por favor, faça login novamente.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.is_active) {
      res.clearCookie('token');
      // Retorna um erro 401 em JSON
      return res.status(401).json({ message: 'Sessão inválida. Por favor, faça login novamente.' });
    }

    // Se o usuário precisa trocar a senha, retorna um erro 403 Forbidden em JSON
    if (user.force_password_change) {
      return res.status(403).json({ message: 'Por favor, altere a sua senha antes de continuar.', code: 'FORCE_PASSWORD_CHANGE' });
    }

    req.user = user;
    req.userProfile = await Profile.findByUserId(user.id);
    next();
  } catch (error) {
    console.error("Erro no middleware de autenticação da API:", error);
    res.clearCookie('token');
    return res.status(401).json({ message: 'Token inválido ou expirado. Por favor, faça login novamente.' });
  }
}

module.exports = { isAuthenticated, requireStaff, requireManager, isApiAuthenticated};