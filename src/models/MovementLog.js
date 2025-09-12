const db = require("../config/database");

class MovementLog {
  /**
   * Cria um novo registo de log na base de dados.
   */
  static async create(logData) {
    const { movimentacao_id, usuario_id, acao, detalhes } = logData;
    const sql = `
            INSERT INTO movimentacoes_logs (movimentacao_id, usuario_id, acao, detalhes)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;
    const result = await db.query(sql, [
      movimentacao_id,
      usuario_id,
      acao,
      detalhes,
    ]);
    return result.rows[0];
  }

  /**
   * Busca todos os logs associados a uma movimentação específica.
   */
  static async findByMovementId(movimentacao_id) {
    const sql = `
            SELECT ml.*, p.nome as perfil_nome
            FROM movimentacoes_logs ml
            JOIN perfis p ON ml.usuario_id = p.usuario_id
            WHERE ml.movimentacao_id = $1
            ORDER BY ml.created_at ASC
        `;
    return await db.all(sql, [movimentacao_id]);
  }

  // --- MÉTODOS AUXILIARES PARA LOGS ESPECÍFICOS ---
  static async logMovementCreation(movimentacao_id, usuario_id) {
    return this.create({
      movimentacao_id,
      usuario_id,
      acao: "CRIAÇÃO",
      detalhes: "Movimentação criada pelo colaborador.",
    });
  }

   // NOVO MÉTODO para logar aprovação/rejeição
  static async logMovementApproval(movimentacao_id, usuario_id, status_nome) {
      return this.create({
          movimentacao_id,
          usuario_id,
          acao: status_nome.toUpperCase(),
          detalhes: `Movimentação ${status_nome} pelo administrador.`
      });
  }

    static async logMovementUpdate(movimentacao_id, usuario_id, changes) {
    const changesList = Object.keys(changes).join(", ");
    return this.create({
      movimentacao_id,
      usuario_id,
      acao: "ATUALIZAÇÃO",
      detalhes: `Campos alterados: ${changesList}.`,
    });
  }

  static async findRecent(limit = 10, offset = 0) {
    const sql = `
            SELECT *
            FROM movimentacoes_logs
            ORDER BY created_at DESC
            LIMIT $1
            OFFSET $2;
        `;
    const result = await db.query(sql, [limit, offset]);
    return result.rows;
  }

  static associate(models) {
    MovementLog.belongsTo(models.Movement, {
      foreignKey: "movement_id",
      as: "movement",
    });
  }
}

module.exports = MovementLog;
