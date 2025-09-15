// Conteúdo corrigido para src/models/Status.js

const db = require('../config/database');

class Status {
  // Cria um novo status
  static async create(statusData) {
    const { nome, analise = false, autorizado = false } = statusData;
    const result = await db.run(
      'INSERT INTO status_movimentacao (nome, analise, autorizado) VALUES ($1, $2, $3) RETURNING id',
      [nome, analise, autorizado]
    );
    return this.findById(result.rows[0].id);
  }

  // Busca um status pelo ID
  static async findById(id) {
    return await db.get('SELECT * FROM status_movimentacao WHERE id = $1', [id]);
  }

  // Busca um status pelo nome
  static async findByName(nome) {
    return await db.get('SELECT * FROM status_movimentacao WHERE nome = $1', [nome]);
  }

  // Lista todos os status
  static async findAll() {
    return await db.all('SELECT * FROM status_movimentacao ORDER BY nome');
  }

  // Atualiza um status
  static async update(id, statusData) {
    const { nome, analise, autorizado } = statusData;
    await db.run(
      'UPDATE status_movimentacao SET nome = $1, analise = $2, autorizado = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
      [nome, analise, autorizado, id]
    );
    return this.findById(id);
  }

  // Deleta um status (só se não houver movimentações associadas)
  static async delete(id) {
    const movements = await db.get(
      'SELECT COUNT(*) as count FROM movimentacoes WHERE status_id = $1',
      [id]
    );
    if (movements.count > 0) {
      throw new Error('Não é possível excluir um status que está sendo usado em movimentações');
    }
    const result = await db.run('DELETE FROM status_movimentacao WHERE id = $1', [id]);
    return result.changes > 0;
  }

  // Status padrão
  static async getPendingStatus() {
    return await db.get('SELECT * FROM status_movimentacao WHERE analise = TRUE LIMIT 1');
  }

  static async getApprovedStatus() {
    return await db.get('SELECT * FROM status_movimentacao WHERE autorizado = TRUE AND analise = FALSE LIMIT 1');
  }

  static async getRejectedStatus() {
    return await db.get('SELECT * FROM status_movimentacao WHERE autorizado = FALSE AND analise = FALSE LIMIT 1');
  }

  // Estatísticas de status
  static async getStatusStats() {
    return await db.all(`
      SELECT 
        s.id,
        s.nome,
        s.analise,
        s.autorizado,
        COUNT(m.id) as total_movimentacoes
      FROM status_movimentacao s
      LEFT JOIN movimentacoes m ON s.id = m.status_id
      GROUP BY s.id, s.nome, s.analise, s.autorizado
      ORDER BY s.nome
    `);
  }
}

module.exports = Status;