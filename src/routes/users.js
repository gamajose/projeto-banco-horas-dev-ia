const express = require('express');
const { isAuthenticated, requireStaff } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Rota para listar todos os usuários (protegida)
router.get('/', isAuthenticated, requireStaff, async (req, res) => {
  try {
    const userModel = new User(req.db);
    const users = await userModel.findAll();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para buscar um usuário por ID (protegida)
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Um admin pode ver qualquer usuário. Um usuário normal só pode ver a si mesmo.
    if (!req.user.is_staff && req.user.id.toString() !== id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const userModel = new User(req.db);
    const user = await userModel.findById(id);

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    const { password_hash, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });

  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;