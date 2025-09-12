const express = require('express');
const { body, validationResult } = require('express-validator');
const { isAuthenticated, requireStaff } = require('../middleware/auth');
const Department = require('../models/Department');

const router = express.Router();

// ==========================================================
// ROTAS DA API PARA SETORES
// ==========================================================

/**
 * @route   GET /api/v1/departments
 * @desc    Listar todos os setores
 * @access  Private (Authenticated)
 */
router.get('/', isAuthenticated, async (req, res) => {
    try {
        // PADRONIZADO: Usando método estático, consistente com outros models.
        // Renomeei o método para findAll() para seguir um padrão comum.
        // Você pode ajustar o nome se no seu model for diferente (ex: getDepartmentStats).
        const departments = await Department.findAll();
        res.json({ success: true, departments });
    } catch (error) {
        console.error('Erro ao listar setores:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * @route   GET /api/v1/departments/:id
 * @desc    Buscar um setor por ID
 * @access  Private (Authenticated)
 */
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        // PADRONIZADO: Usando método estático
        const department = await Department.findById(id);
        
        if (!department) {
            return res.status(404).json({ error: 'Setor não encontrado' });
        }
        res.json({ success: true, department });
    } catch (error) {
        console.error('Erro ao buscar setor:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * @route   POST /api/v1/departments
 * @desc    Criar um novo setor (usada pelo formulário e modal)
 * @access  Private (Staff)
 */
// CORREÇÃO: Apenas uma rota POST para criar, a mais completa.
router.post('/', isAuthenticated, requireStaff, [
    body('nome').trim().notEmpty().withMessage('O nome do setor é obrigatório.')
], async (req, res) => {
    const errors = validationResult(req);
    // PADRONIZADO: Retornando o array completo de erros.
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { nome } = req.body;

        // Lógica de verificação mantida, pois é muito importante.
        const existingDepartment = await Department.findByName(nome);
        if (existingDepartment) {
            return res.status(409).json({ success: false, error: 'Já existe um setor com este nome.' });
        }

        const newDepartment = await Department.create({ nome });
        res.status(201).json({
            success: true,
            message: 'Setor criado com sucesso!',
            department: newDepartment
        });
    } catch (error) {
        console.error("Erro ao criar novo setor:", error);
        res.status(500).json({ success: false, error: 'Erro interno do servidor.' });
    }
});

/**
 * @route   PUT /api/v1/departments/:id
 * @desc    Atualizar um setor
 * @access  Private (Staff)
 */
router.put('/:id', isAuthenticated, requireStaff, [
    body('nome').trim().notEmpty().withMessage('O nome do setor é obrigatório.')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    try {
        const { id } = req.params;
        const { nome } = req.body;
        // PADRONIZADO: Usando método estático
        const updatedDepartment = await Department.update(id, { nome });

        if (!updatedDepartment) {
             return res.status(404).json({ error: 'Setor não encontrado para atualizar.' });
        }
        res.json({ success: true, message: 'Setor atualizado com sucesso', department: updatedDepartment });
    } catch (error) {
        console.error('Erro ao atualizar setor:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

/**
 * @route   DELETE /api/v1/departments/:id
 * @desc    Deletar um setor
 * @access  Private (Staff)
 */
router.delete('/:id', isAuthenticated, requireStaff, async (req, res) => {
    try {
        const { id } = req.params;
        // PADRONIZADO: Usando método estático
        await Department.delete(id);
        res.json({ success: true, message: 'Setor deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar setor:', error);
        // Lógica de erro para colaboradores associados mantida.
        if (error.message.includes('colaboradores associados')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;