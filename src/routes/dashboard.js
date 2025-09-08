const express = require('express');
const { isAuthenticated } = require('../middleware/auth');
const Movement = require('../models/Movement');
const Department = require('../models/Department');
const User = require('../models/User');
const Profile = require('../models/Profile');

const router = express.Router();

router.get('/', (req, res) => {
    if (req.cookies.token) {
        res.redirect('/dashboard');
    } else {
        res.render('home', {
            title: 'Bem-vindo ao Banco de Horas',
            layout: false
        });
    }
});

// Dashboard principal
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    if (!req.user.is_staff) {
      return res.redirect('/meu-perfil');
    }

    // Lógica Exclusiva para o Administrador
    const stats = await Movement.getMovementStats();
    const pendingMovements = await Movement.getPendingMovements();
    const recentMovements = await Movement.findAll({ limit: 5 });
    const departmentStats = await Department.getDepartmentStats();
    const allUsers = await User.findAll();
    const totalUsers = allUsers.length;

    res.render('dashboard/index', {
      title: 'Dashboard do Administrador',
      user: req.user,
      userProfile: req.userProfile || {},
      stats,
      pendingMovements,
      recentMovements,
      departmentStats,
      totalUsers,
      activePage: 'dashboard'
    });
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error);
    res.status(500).render('error', {
      title: 'Erro no Servidor',
      message: 'Não foi possível carregar o dashboard.',
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Página do perfil do usuário
router.get('/meu-perfil', isAuthenticated, async (req, res) => {
  try {
    if (!req.userProfile) {
      return res.status(404).render('error', {
        layout: 'layouts/main',
        title: 'Perfil não encontrado',
        message: 'O seu usuário não possui um perfil de funcionário associado.',
        user: req.user,
        userProfile: null,
        error: {}
      });
    }

    const profileStats = await Profile.getProfileStats(req.userProfile.id);
    const hourBalance = await Profile.calculateHourBalance(req.userProfile.id);
    const recentMovements = await Movement.getMovementsByProfile(req.userProfile.id, { limit: 10 });

    res.render('collaborator/home', {
      title: 'Meu Perfil',
      user: req.user,
      userProfile: req.userProfile,
      profileStats,
      hourBalance,
      recentMovements,
      layout: 'layouts/collaborator',
      activePage: 'home'
    });
  } catch (error) {
    console.error('Erro ao carregar a página de perfil:', error);
    res.status(500).render('error', {
      layout: 'layouts/main',
      title: 'Erro no Servidor',
      message: 'Não foi possível carregar a sua página de perfil.',
      user: req.user,
      userProfile: req.userProfile || null,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

module.exports = router;
