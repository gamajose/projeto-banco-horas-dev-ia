const express = require('express');
const { isAuthenticated, requireStaff } = require('../middleware/auth');
const Profile = require('../models/Profile');
const Movement = require('../models/Movement');

const router = express.Router();

// Middleware para garantir que todas as rotas de API de perfis são para Admins
router.use(isAuthenticated, requireStaff);

// Rota da API para LISTAR perfis
router.get('/', async (req, res) => {
    try {
        const profiles = await Profile.findAll();
        res.json({ success: true, profiles });
    } catch (error) {
        console.error("Erro ao buscar perfis via API:", error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});

// Rota da API para ATUALIZAR o status de gerente de um perfil
router.patch('/:id/role', async (req, res) => {
    try {
        const { id } = req.params;
        const { gerente } = req.body;

        if (typeof gerente !== 'boolean') {
            return res.status(400).json({ error: 'O valor de "gerente" deve ser true ou false.' });
        }

        const updatedProfile = await Profile.updateRole(id, gerente);

        if (!updatedProfile) {
            return res.status(404).json({ error: 'Perfil não encontrado.' });
        }

        res.json({ success: true, message: 'Status de gerente atualizado com sucesso!', profile: updatedProfile });
    } catch (error) {
        console.error("Erro ao atualizar o status de gerente:", error);
            res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    });
    
router.get('/:id/movements', async (req, res) => {
    try {
        const { id } = req.params;
        const movements = await Movement.findAll({ colaborador_id: id }); 
        res.json({ success: true, movements });
    } catch (error) {
        console.error("Erro ao buscar movimentações do perfil:", error);
        res.status(500).json({ success: false, error: 'Erro ao buscar movimentações.' });
    }
});


module.exports = router;