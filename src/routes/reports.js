const express = require('express');
const { query, validationResult } = require('express-validator');
const { isAuthenticated, requireStaff } = require('../middleware/auth');
const Movement = require('../models/Movement');

const router = express.Router();

// Relatório geral de movimentações (apenas staff)
router.get('/general', [
  isAuthenticated,
  requireStaff,
  query('data_inicio').optional().isISO8601().withMessage('Data de início inválida'),
  query('data_fim').optional().isISO8601().withMessage('Data de fim inválida')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { data_inicio, data_fim } = req.query;
    const movementModel = new Movement(req.db);
    
    // Aqui você pode adicionar uma lógica complexa de relatório
    // Por exemplo, buscar estatísticas gerais
    const stats = await movementModel.getMovementStats({ data_inicio, data_fim });

    res.json({
      success: true,
      report: {
        periodo: { data_inicio: data_inicio || 'N/A', data_fim: data_fim || 'N/A' },
        stats: stats
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório geral:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;