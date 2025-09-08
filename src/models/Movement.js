const db = require('../config/database');
const { isAuthenticated, requireManager } = require('../middleware/auth');


class Movement {
  static async create(movementData) {
    const { data_movimentacao, hora_inicial, hora_final, hora_total, motivo, entrada, forma_pagamento_id, status_id, colaborador_id } = movementData;
    const result = await db.query(
      `INSERT INTO movimentacoes 
      (data_movimentacao, hora_inicial, hora_final, hora_total, motivo, entrada, forma_pagamento_id, status_id, colaborador_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [data_movimentacao, hora_inicial, hora_final, hora_total, motivo, entrada, forma_pagamento_id, status_id, colaborador_id]
    );
    return this.findById(result.rows[0].id);
  }

  static async findById(id) {
    return await db.get(`
      SELECT
        m.*,
        p.nome as colaborador_nome,
        s.nome as setor_nome,
        st.nome as status_nome,
        st.analise,
        st.autorizado,
        fp.nome as forma_pagamento_nome
      FROM movimentacoes m
      JOIN perfis p ON m.colaborador_id = p.id
      JOIN setores s ON p.setor_id = s.id
      JOIN status st ON m.status_id = st.id
      LEFT JOIN formas_pagamento fp ON m.forma_pagamento_id = fp.id
      WHERE m.id = $1
    `, [id]);
  }

  static async findAll(filters = {}) {
    let sql = `
      SELECT
        m.*, p.nome as colaborador_nome, s.nome as setor_nome,
        st.nome as status_nome, st.analise, st.autorizado,
        fp.nome as forma_pagamento_nome
      FROM movimentacoes m
      JOIN perfis p ON m.colaborador_id = p.id
      JOIN setores s ON p.setor_id = s.id
      JOIN status st ON m.status_id = st.id
      LEFT JOIN formas_pagamento fp ON m.forma_pagamento_id = fp.id
    `;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (filters.colaborador_id) {
      conditions.push(`m.colaborador_id = $${paramIndex++}`);
      params.push(filters.colaborador_id);
    }

        if (filters.status_id) {
        conditions.push(`m.status_id = $${paramIndex++}`);
        params.push(filters.status_id);
    }

    if (filters.data_inicio) {
        conditions.push(`m.data_movimentacao >= $${paramIndex++}`);
        params.push(filters.data_inicio);
    }

    if (filters.data_fim) {
        conditions.push(`m.data_movimentacao <= $${paramIndex++}`);
        params.push(filters.data_fim);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY m.data_movimentacao DESC, m.created_at DESC';

    if (filters.limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }

    return await db.all(sql, params);
  }

  static async getPendingMovements() {
    return await db.all(`
      SELECT
        m.*, p.nome as colaborador_nome, s.nome as setor_nome, st.nome as status_nome
      FROM movimentacoes m
      JOIN perfis p ON m.colaborador_id = p.id
      JOIN setores s ON p.setor_id = s.id
      JOIN status st ON m.status_id = st.id
      WHERE st.analise = TRUE
      ORDER BY m.data_movimentacao DESC
    `);
  }

  static async getMovementStats() {
    const stats = await db.get(`
      SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN m.entrada = TRUE THEN 1 END) AS entradas,
        COUNT(CASE WHEN m.entrada = FALSE THEN 1 END) AS saidas,
        COUNT(CASE WHEN s.autorizado = TRUE THEN 1 END) AS aprovadas,
        COUNT(CASE WHEN s.analise = TRUE THEN 1 END) AS pendentes,
        COUNT(CASE WHEN s.autorizado = FALSE AND s.analise = FALSE THEN 1 END) AS rejeitadas
      FROM movimentacoes m
      JOIN status s ON m.status_id = s.id
    `);
    return stats || { total: 0, entradas: 0, saidas: 0, aprovadas: 0, pendentes: 0, rejeitadas: 0 };
  }

  static async getMovementsByProfile(profileId, options = {}) {
    const limit = options.limit || 20;
    const sql = `
      SELECT
        m.*,
        st.nome as status_nome, st.analise, st.autorizado
      FROM movimentacoes m
      JOIN status st ON m.status_id = st.id
      WHERE m.colaborador_id = $1
      ORDER BY m.data_movimentacao DESC, m.created_at DESC
      LIMIT $2
    `;
    return await db.all(sql, [profileId, limit]);
  }

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Constrói a query dinamicamente para os campos que podem ser atualizados
    if (data.status_id !== undefined) {
        fields.push(`status_id = $${paramIndex++}`);
        values.push(data.status_id);
    }
    // Adicione outros campos que possam ser atualizados no futuro aqui
    // Ex: if (data.motivo !== undefined) { ... }

    if (fields.length === 0) {
        // Se nenhum campo válido foi passado, não faz nada
        return null;
    }

    values.push(id); // Adiciona o ID para a cláusula WHERE
    
    const sql = `
        UPDATE movimentacoes 
        SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *
    `;

    const result = await db.query(sql, values);
    return result.rows[0];
  }

}

module.exports = Movement;
