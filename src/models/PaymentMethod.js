const db = require('../config/database');

class PaymentMethod {
  // Cria uma nova forma de pagamento
  static async create(paymentMethodData) {
    const { nome } = paymentMethodData;
    const result = await db.run(
      'INSERT INTO formas_pagamento (nome) VALUES ($1) RETURNING id',
      [nome]
    );
    return this.findById(result.rows[0].id);
  }

  // Busca por ID
  static async findById(id) {
    return await db.get('SELECT * FROM formas_pagamento WHERE id = $1', [id]);
  }

  // Busca por nome
  static async findByName(nome) {
    return await db.get('SELECT * FROM formas_pagamento WHERE nome = $1', [nome]);
  }

  // Lista todas as formas de pagamento
  static async findAll() {
    return await db.all('SELECT * FROM formas_pagamento ORDER BY nome');
  }

  // Atualiza uma forma de pagamento
  static async update(id, paymentMethodData) {
    const { nome } = paymentMethodData;
    await db.run(
      'UPDATE formas_pagamento SET nome = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [nome, id]
    );
    return this.findById(id);
  }

  // Deleta uma forma de pagamento, somente se não houver movimentações associadas
  static async delete(id) {
    const movements = await db.get(
      'SELECT COUNT(*) as count FROM movimentacoes WHERE forma_pagamento_id = $1',
      [id]
    );
    if (movements.count > 0) {
      throw new Error('Não é possível excluir uma forma de pagamento que está sendo usada em movimentações');
    }
    const result = await db.run('DELETE FROM formas_pagamento WHERE id = $1', [id]);
    return result.rows.length > 0 || result.rowCount > 0;
  }

  // Estatísticas gerais
  static async getPaymentMethodStats() {
    return await db.all(`
      SELECT 
        fp.id,
        fp.nome,
        COUNT(m.id) as total_movimentacoes,
        COUNT(CASE WHEN st.autorizado = TRUE THEN 1 END) as total_aprovadas
      FROM formas_pagamento fp
      LEFT JOIN movimentacoes m ON fp.id = m.forma_pagamento_id
      LEFT JOIN status st ON m.status_id = st.id
      GROUP BY fp.id, fp.nome
      ORDER BY fp.nome
    `);
  }

  // Formas de pagamento mais usadas
  static async getMostUsedPaymentMethods(limit = 5) {
    return await db.all(`
      SELECT 
        fp.id,
        fp.nome,
        COUNT(m.id) as total_uso
      FROM formas_pagamento fp
      JOIN movimentacoes m ON fp.id = m.forma_pagamento_id
      GROUP BY fp.id, fp.nome
      ORDER BY total_uso DESC
      LIMIT $1
    `, [limit]);
  }
}

module.exports = PaymentMethod;
