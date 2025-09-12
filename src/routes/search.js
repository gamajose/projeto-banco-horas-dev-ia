// Substitua o conteúdo de src/routes/search.js por este

const express = require('express');
const { isApiAuthenticated, requireStaff } = require('../middleware/auth');
const Profile = require('../models/Profile');
const Movement = require('../models/Movement');

const router = express.Router();

// Rota da API para PESQUISAR colaboradores
// GET /api/v1/search/profiles?q=NOME
router.get('/profiles', isApiAuthenticated, requireStaff, async (req, res) => {
    try {
        const query = req.query.q || '';
        if (query.length < 2) {
            return res.json({ success: true, profiles: [] });
        }

        const profiles = await Profile.searchByName(query);
        res.json({ success: true, profiles });

    } catch (error)
 {
        console.error("Erro ao pesquisar perfis via API:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

// Rota da API para buscar DETALHES de um colaborador e suas movimentações
// GET /api/v1/search/profiles/1/details
router.get('/profiles/:id/details', isApiAuthenticated, requireStaff, async (req, res) => {
    try {
        const profile = await Profile.findById(req.params.id);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Perfil não encontrado.' });
        }

        const movements = await Movement.findAll({ colaborador_id: req.params.id });

        res.json({ success: true, profile, movements });
    } catch (error) {
        console.error("Erro ao buscar detalhes do perfil via API:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

module.exports = router;