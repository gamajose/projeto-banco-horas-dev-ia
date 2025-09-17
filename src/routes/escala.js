// Ficheiro: src/routes/escala.js

const express = require('express');
const { isAuthenticated, requireStaff } = require('../middleware/auth');
const Profile = require('../models/Profile');
const Escala = require('../models/Escala');

const router = express.Router();

// Rota para RENDERIZAR a página de gestão de escalas
router.get('/', isAuthenticated, requireStaff, async (req, res) => {
    try {
        const colaboradores = await Profile.findAll();
        res.render('admin/escala', {
            title: 'Gestão de Escalas',
            layout: 'layouts/main',
            activePage: 'escala',
            user: req.user,
            userProfile: req.userProfile,
            colaboradores: colaboradores,
        });
    } catch (error) {
        console.error("Erro ao carregar página de escalas:", error);
        // Tratar erro
    }
});

// --- ROTAS DE API PARA O CALENDÁRIO INTERATIVO ---

// Rota da API para BUSCAR os dados de uma escala de um mês específico
router.get('/api', isAuthenticated, requireStaff, async (req, res) => {
    try {
        const { ano, mes } = req.query;
        if (!ano || !mes) {
            return res.status(400).json({ success: false, message: 'Ano e mês são obrigatórios.' });
        }
        
        const escalas = await Escala.findByMonth(ano, mes);
        
        // Vamos também buscar os aniversariantes do mês para facilitar no frontend
        const colaboradores = await Profile.findAll();
        const aniversariantes = colaboradores
            .filter(c => c.data_nascimento && new Date(c.data_nascimento).getUTCMonth() + 1 === parseInt(mes))
            .map(c => ({
                perfil_id: c.id,
                dia: new Date(c.data_nascimento).getUTCDate()
            }));

        res.json({ success: true, escalas, aniversariantes });

    } catch (error) {
        console.error("Erro ao buscar dados da escala via API:", error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor.' });
    }
});

// Rota da API para SALVAR (criar ou atualizar) uma entrada na escala
router.post('/api', isAuthenticated, requireStaff, async (req, res) => {
    try {
        const escala = await Escala.upsert(req.body);
        res.status(201).json({ success: true, message: 'Escala salva com sucesso!', escala });
    } catch (error) {
        console.error("Erro ao salvar escala via API:", error);
        res.status(500).json({ success: false, message: 'Erro ao salvar a escala.' });
    }
});

// Rota da API para APAGAR uma entrada na escala
router.delete('/api', isAuthenticated, requireStaff, async (req, res) => {
    try {
        const { perfil_id, data } = req.body;
        const deleted = await Escala.delete(perfil_id, data);
        if (deleted) {
            res.json({ success: true, message: 'Escala removida com sucesso!' });
        } else {
            res.status(404).json({ success: false, message: 'Escala não encontrada para remover.' });
        }
    } catch (error) {
        console.error("Erro ao apagar escala via API:", error);
        res.status(500).json({ success: false, message: 'Erro ao remover a escala.' });
    }
});

// Rota da API para SALVAR um período de FÉRIAS em lote
router.post('/api/ferias', isAuthenticated, requireStaff, async (req, res) => {
    try {
        const { perfil_id, data_inicio, data_fim } = req.body;
        if (!perfil_id || !data_inicio || !data_fim) {
            return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios.' });
        }

        let diaAtual = new Date(data_inicio + 'T00:00:00');
        const dataFim = new Date(data_fim + 'T00:00:00');

        if (diaAtual > dataFim) {
             return res.status(400).json({ success: false, message: 'A data de início não pode ser posterior à data de fim.' });
        }

        // Itera sobre cada dia no intervalo
        while (diaAtual <= dataFim) {
            await Escala.upsert({
                perfil_id: perfil_id,
                data: diaAtual.toISOString().split('T')[0],
                tipo_escala: 'Férias',
                hora_inicio: null,
                hora_fim: null,
                observacoes: 'Período de Férias'
            });
            // Avança para o próximo dia
            diaAtual.setUTCDate(diaAtual.getUTCDate() + 1);
        }

        res.status(201).json({ success: true, message: 'Período de férias lançado com sucesso!' });

    } catch (error) {
        console.error("Erro ao lançar férias via API:", error);
        res.status(500).json({ success: false, message: 'Erro ao lançar o período de férias.' });
    }
});

module.exports = router;