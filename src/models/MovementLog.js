const db = require('../config/database');

class MovementLog {

    /**
     * Cria um novo registo de log na base de dados.
     */
    static async create(logData) {
        const { movimentacao_id, perfil_id, acao, detalhes } = logData;
        const sql = `
            INSERT INTO movimentacoes_logs (movimentacao_id, perfil_id, acao, detalhes)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
        const result = await db.query(sql, [movimentacao_id, perfil_id, acao, detalhes]);
        return result.rows[0];
    }

    /**
     * Busca todos os logs associados a uma movimentação específica.
     */
    static async findByMovementId(movimentacao_id) {
        const sql =`
            SELECT ml.*, p.nome as perfil_nome
            FROM movimentacoes_logs ml
            JOIN perfis p ON ml.perfil_id = p.id
            WHERE ml.movimentacao_id = $1
            ORDER BY ml.created_at ASC
        `;
        return await db.all(sql, [movimentacao_id]);
    }
    
    // --- MÉTODOS AUXILIARES PARA LOGS ESPECÍFICOS ---

    static async logMovementCreation(movimentacao_id, perfil_id) {
        return this.create({
            movimentacao_id,
            perfil_id,
            acao: 'CRIAÇÃO',
            detalhes: 'Movimentação criada pelo colaborador.'
        });
    }

    static async logMovementUpdate(movimentacao_id, perfil_id, changes) {
        const changesList = Object.keys(changes).join(', ');
        return this.create({
            movimentacao_id,
            perfil_id,
            acao: 'ATUALIZAÇÃO',
            detalhes: `Campos alterados: ${changesList}.`
        });
    }
    // Adicione outros métodos de log conforme necessário (aprovação, rejeição, etc.)
}

module.exports = MovementLog;